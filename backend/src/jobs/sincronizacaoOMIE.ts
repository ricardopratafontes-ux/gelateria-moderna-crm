import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { omieService } from '../services/omieService';
import { comissaoService } from '../services/comissaoService';
import { whatsappService } from '../services/whatsappService';

const prisma = new PrismaClient();

// Status do pipeline OMIE (ordem de progressão)
const STATUS_PIPELINE = ['vendas', 'separacao', 'faturamento', 'entrega', 'recebimento'];

export function iniciarSincronizacaoOMIE() {
  // Executa a cada 2 horas (para não estourar rate limit OMIE)
  cron.schedule('0 */2 * * *', async () => {
    console.log('[OMIE SYNC] Sincronização seletiva iniciada');
    try {
      await sincronizarStatusVendas();
      await sincronizarDadosCadastrais();
      console.log('[OMIE SYNC] Concluído com sucesso');
    } catch (error) {
      console.error('[OMIE SYNC] Erro geral:', error);
    }
  });
}

// ============================================================
// SYNC 1: STATUS DE VENDAS/PEDIDOS
// Busca apenas vendas ativas dos nossos clientes que têm omie_pedido_id
// Atualiza: separação → faturamento → entrega → recebimento
// Quando recebe: dispara cálculo de comissão
// ============================================================
async function sincronizarStatusVendas() {
  const vendasAtivas = await prisma.venda.findMany({
    where: {
      status: { notIn: ['recebimento', 'cancelada'] },
      omie_pedido_id: { not: null }
    },
    include: {
      cliente: { select: { nome_fantasia: true, omie_codigo: true } }
    }
  });

  if (vendasAtivas.length === 0) {
    console.log('[OMIE SYNC] Nenhuma venda ativa para sincronizar');
    return;
  }

  let atualizadas = 0;
  let comissoesCalculadas = 0;
  let erros = 0;

  for (const venda of vendasAtivas) {
    try {
      if (!venda.omie_pedido_id) continue;

      // Buscar status atualizado no OMIE
      const statusOmie = await omieService.buscarEtapaPedido(parseInt(venda.omie_pedido_id));

      if (!statusOmie) continue;

      const novoStatus = mapearStatusOmie(statusOmie);

      // Se status mudou e progrediu (não regrediu)
      if (novoStatus && novoStatus !== venda.status && isProgressao(venda.status, novoStatus)) {
        const dadosAtualizacao: any = {
          status: novoStatus,
          data_atualizacao: new Date()
        };

        // Se chegou em "recebimento", registrar valor e data + comissão
        if (novoStatus === 'recebimento') {
          dadosAtualizacao.data_recebimento = new Date();
          dadosAtualizacao.valor_recebido = statusOmie.nValorPedido || Number(venda.valor_total);

          // Calcular comissão ao receber pagamento
          try {
            await comissaoService.contabilizarComissao({
              ...venda,
              ...dadosAtualizacao,
              valor_total: Number(venda.valor_total),
              valor_recebido: dadosAtualizacao.valor_recebido
            });
            comissoesCalculadas++;
          } catch (err) {
            console.error(`[OMIE SYNC] Erro comissão venda ${venda.id}:`, err);
          }
        }

        await prisma.venda.update({
          where: { id: venda.id },
          data: dadosAtualizacao
        });

        atualizadas++;

        // Notificar mudanças importantes
        if (novoStatus === 'entrega' || novoStatus === 'recebimento') {
          await notificarMudancaStatus(venda, novoStatus);
        }
      }

      // Rate limit OMIE: esperar 2s entre chamadas para evitar REDUNDANT
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      erros++;
      console.error(`[OMIE SYNC] Erro venda ${venda.id}:`, error);
    }
  }

  console.log(`[OMIE SYNC] Vendas: ${atualizadas} atualizadas, ${comissoesCalculadas} comissões, ${erros} erros`);
}

// ============================================================
// SYNC 2: DADOS CADASTRAIS (apenas dos nossos 52 clientes com omie_codigo)
// Atualiza: telefone, email, endereço se mudou no OMIE
// Roda com menor frequência (1x ao dia seria suficiente, mas está no cron de 30min)
// ============================================================
async function sincronizarDadosCadastrais() {
  // Buscar apenas clientes que TÊM código OMIE cadastrado
  const clientesComOmie = await prisma.cliente.findMany({
    where: {
      omie_codigo: { not: null },
      status: 'ativo'
    }
  });

  if (clientesComOmie.length === 0) {
    console.log('[OMIE SYNC] Nenhum cliente com código OMIE para sincronizar');
    return;
  }

  let atualizados = 0;

  // Sincronizar no máximo 5 por ciclo (respeitar rate limit OMIE)
  // Em ~20h sincroniza todos os 52 clientes (10 ciclos a cada 2h)
  const lote = clientesComOmie.slice(0, 5);

  for (const cliente of lote) {
    try {
      if (!cliente.omie_codigo) continue;

      const dadosOmie = await omieService.buscarClientePorCodigo(cliente.omie_codigo);

      if (!dadosOmie) continue;

      // Atualizar apenas se dados mudaram
      const updates: any = {};

      if (dadosOmie.telefone1_numero && dadosOmie.telefone1_numero !== cliente.telefone) {
        updates.telefone = dadosOmie.telefone1_numero;
      }
      if (dadosOmie.email && dadosOmie.email !== cliente.email) {
        updates.email = dadosOmie.email;
      }
      if (dadosOmie.endereco && dadosOmie.endereco !== cliente.endereco) {
        updates.endereco = `${dadosOmie.endereco}, ${dadosOmie.endereco_numero || ''} - ${dadosOmie.bairro || ''}, ${dadosOmie.cidade || ''}`;
      }
      if (dadosOmie.cnpj_cpf && !cliente.cnpj) {
        updates.cnpj = dadosOmie.cnpj_cpf;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: updates
        });
        atualizados++;
      }

      // Rate limit OMIE: 2s entre chamadas
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      console.error(`[OMIE SYNC] Erro cliente ${cliente.nome_fantasia}:`, error);
    }
  }

  if (atualizados > 0) {
    console.log(`[OMIE SYNC] Clientes: ${atualizados} atualizados`);
  }
}

// ============================================================
// HELPERS
// ============================================================

function mapearStatusOmie(statusOmie: any): string | null {
  // O OMIE retorna diferentes campos dependendo da chamada
  const etapa = statusOmie?.cEtapa || statusOmie?.etapa || statusOmie?.cStatusPedido || '';
  const descricao = (statusOmie?.cDescrEtapa || statusOmie?.cDescricaoStatus || '').toLowerCase();

  // Tentar mapear pela etapa numérica do OMIE
  if (statusOmie?.cCodEtapa) {
    const codEtapa = statusOmie.cCodEtapa;
    if (codEtapa === '10') return 'vendas';
    if (codEtapa === '20') return 'separacao';
    if (codEtapa === '30') return 'faturamento';
    if (codEtapa === '40') return 'entrega';
    if (codEtapa === '50') return 'recebimento';
    if (codEtapa === '99') return 'cancelada';
  }

  // Fallback: mapear por texto
  const texto = `${etapa} ${descricao}`.toLowerCase();

  if (texto.includes('cancelad')) return 'cancelada';
  if (texto.includes('recebid') || texto.includes('conclu') || texto.includes('pago') || texto.includes('liquidado')) return 'recebimento';
  if (texto.includes('entreg') || texto.includes('enviad') || texto.includes('expedido')) return 'entrega';
  if (texto.includes('fatur')) return 'faturamento';
  if (texto.includes('separ')) return 'separacao';

  return null;
}

// Verifica se o novo status é uma progressão válida (não permite regredir)
function isProgressao(statusAtual: string, novoStatus: string): boolean {
  const idxAtual = STATUS_PIPELINE.indexOf(statusAtual);
  const idxNovo = STATUS_PIPELINE.indexOf(novoStatus);

  // Se não encontrar no pipeline, permite (pode ser 'cancelada')
  if (idxAtual === -1 || idxNovo === -1) return true;

  return idxNovo > idxAtual;
}

async function notificarMudancaStatus(venda: any, novoStatus: string) {
  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (!whatsappGerente) return;

  const nomeCliente = venda.cliente?.nome_fantasia || 'Cliente';

  const mensagens: Record<string, string> = {
    entrega: `Pedido em entrega!\nCliente: ${nomeCliente}\nValor: R$ ${Number(venda.valor_total).toFixed(2)}`,
    recebimento: `Pagamento recebido!\nCliente: ${nomeCliente}\nValor: R$ ${Number(venda.valor_recebido || venda.valor_total).toFixed(2)}`
  };

  if (mensagens[novoStatus]) {
    try {
      await whatsappService.enviarMensagem(whatsappGerente, mensagens[novoStatus]);
    } catch (err) {
      // Não bloqueia se falhar notificação
    }
  }
}
