import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { omieService } from '../services/omieService';
import { comissaoService } from '../services/comissaoService';
import { whatsappService } from '../services/whatsappService';

const prisma = new PrismaClient();

// Status do pipeline OMIE
const STATUS_PIPELINE = ['vendas', 'separacao', 'faturamento', 'entrega', 'recebimento'];

export function iniciarSincronizacaoOMIE() {
  // Executa a cada 30 minutos
  cron.schedule('*/30 * * * *', async () => {
    console.log('[JOB] Sincronização OMIE iniciada');
    try {
      await sincronizarVendas();
      await sincronizarClientes();
    } catch (error) {
      console.error('[JOB] Erro na sincronização OMIE:', error);
    }
  });
}

async function sincronizarVendas() {
  // Buscar vendas ativas (não finalizadas)
  const vendasAtivas = await prisma.venda.findMany({
    where: {
      status: {
        notIn: ['recebimento', 'cancelada']
      }
    }
  });

  let atualizadas = 0;
  let comissoesCalculadas = 0;

  for (const venda of vendasAtivas) {
    try {
      if (!venda.omie_pedido_id) continue;

      // Buscar status atualizado no OMIE
      const statusOmie = await omieService.buscarStatusVenda(venda.omie_pedido_id);

      if (!statusOmie) continue;

      const novoStatus = mapearStatusOmie(statusOmie);

      // Se status mudou, atualizar
      if (novoStatus && novoStatus !== venda.status) {
        const dadosAtualizacao: any = {
          status: novoStatus,
          data_atualizacao: new Date()
        };

        // Se chegou em "recebimento", registrar valor e data
        if (novoStatus === 'recebimento') {
          dadosAtualizacao.data_recebimento = new Date();
          dadosAtualizacao.valor_recebido = statusOmie.valor_recebido || venda.valor_total;

          // Calcular comissão ao receber
          try {
            await comissaoService.contabilizarComissao({
              ...venda,
              ...dadosAtualizacao
            });
            comissoesCalculadas++;
          } catch (err) {
            console.error(`[JOB] Erro ao calcular comissão venda ${venda.id}:`, err);
          }
        }

        await prisma.venda.update({
          where: { id: venda.id },
          data: dadosAtualizacao
        });

        atualizadas++;

        // Notificar mudança de status relevante
        if (novoStatus === 'entrega' || novoStatus === 'recebimento') {
          await notificarMudancaStatus(venda, novoStatus);
        }
      }
    } catch (error) {
      console.error(`[JOB] Erro ao sincronizar venda ${venda.id}:`, error);
    }
  }

  console.log(`[JOB] Sincronização OMIE: ${atualizadas} vendas atualizadas, ${comissoesCalculadas} comissões calculadas`);
}

async function sincronizarClientes() {
  try {
    const clientesOmie = await omieService.buscarClientes();

    for (const clienteOmie of clientesOmie) {
      // Verificar se cliente já existe no CRM
      const clienteExistente = await prisma.cliente.findFirst({
        where: {
          OR: [
            { omie_codigo: String(clienteOmie.codigo_cliente_omie) },
            { cnpj: clienteOmie.cnpj_cpf }
          ]
        }
      });

      if (clienteExistente) {
        // Atualizar dados básicos se necessário
        await prisma.cliente.update({
          where: { id: clienteExistente.id },
          data: {
            omie_codigo: String(clienteOmie.codigo_cliente_omie),
            telefone: clienteOmie.telefone1_numero || clienteExistente.telefone
          }
        });
      }
    }
  } catch (error) {
    console.error('[JOB] Erro ao sincronizar clientes OMIE:', error);
  }
}

function mapearStatusOmie(statusOmie: any): string | null {
  // Mapear status do OMIE para status interno
  const etapa = statusOmie?.etapa || statusOmie?.cStatusPedido || '';

  if (etapa.includes('faturado') || etapa.includes('faturamento')) return 'faturamento';
  if (etapa.includes('separacao') || etapa.includes('separação')) return 'separacao';
  if (etapa.includes('entrega') || etapa.includes('enviado')) return 'entrega';
  if (etapa.includes('recebido') || etapa.includes('concluido') || etapa.includes('concluído')) return 'recebimento';
  if (etapa.includes('cancelado')) return 'cancelada';

  return null;
}

async function notificarMudancaStatus(venda: any, novoStatus: string) {
  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (!whatsappGerente) return;

  const cliente = await prisma.cliente.findUnique({
    where: { id: venda.cliente_id }
  });

  const mensagens: Record<string, string> = {
    entrega: `📦 Pedido em entrega!\nCliente: ${cliente?.nome_fantasia}\nValor: R$ ${venda.valor_total}`,
    recebimento: `✅ Pagamento recebido!\nCliente: ${cliente?.nome_fantasia}\nValor: R$ ${venda.valor_recebido || venda.valor_total}`
  };

  if (mensagens[novoStatus]) {
    try {
      await whatsappService.enviarMensagem(whatsappGerente, mensagens[novoStatus]);
    } catch (err) {
      // Não bloqueia se falhar notificação
    }
  }
}
