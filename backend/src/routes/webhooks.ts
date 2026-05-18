import express from 'express';
import { PrismaClient } from '@prisma/client';
import { comissaoService } from '../services/comissaoService';

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================
// WEBHOOKS OMIE - Recebe notificações push do OMIE
// IMPORTANTE: NÃO usar middleware auth - OMIE envia POST direto
// Especificações: timeout 7s, retornar 200 rápido, processar async
// Configurar em developer.omie.com.br → Aplicativos → Webhooks
// ============================================================

// Mapear etapa OMIE para nosso status
const statusMap: Record<string, string> = {
  '10': 'vendas',
  '20': 'separacao',
  '30': 'faturamento',
  '50': 'faturamento',
  '60': 'entrega',
  '70': 'recebimento'
};

// POST /api/webhooks/omie - Endpoint principal para todos os webhooks OMIE
router.post('/omie', async (req, res) => {
  // RETORNAR 200 IMEDIATAMENTE (requisito OMIE: responder em <7s)
  res.status(200).json({ ok: true });

  // Processar webhook de forma assíncrona
  try {
    const payload = req.body;
    const evento = payload?.topic || payload?.event || '';
    const appKey = payload?.appKey || '';

    // Validar que veio do nosso app OMIE
    if (appKey && appKey !== process.env.OMIE_API_KEY) {
      console.log(`[WEBHOOK] Ignorando - appKey diferente: ${appKey}`);
      return;
    }

    console.log(`[WEBHOOK OMIE] Evento: ${evento} | Payload keys: ${Object.keys(payload).join(', ')}`);

    // Roteamento por tipo de evento (nomes reais dos tópicos OMIE)
    // VendaProduto = pedidos de venda
    if (evento.startsWith('vendaproduto.') || evento.startsWith('pedidovenda.')) {
      await processarPedidoVenda(evento, payload);
    // Financas.ContaReceber = contas a receber
    } else if (evento.startsWith('financas.contareceber.') || evento.startsWith('contareceber.')) {
      await processarContaReceber(evento, payload);
    // ClienteFornecedor = clientes
    } else if (evento.startsWith('clientefornecedor.') || evento.startsWith('cliente.')) {
      await processarCliente(evento, payload);
    } else {
      console.log(`[WEBHOOK OMIE] Evento não tratado: ${evento}`);
    }
  } catch (error: any) {
    // Log do erro mas NÃO reenviar resposta (já retornamos 200)
    console.error('[WEBHOOK OMIE] Erro no processamento async:', error.message);
  }
});

// ============================================================
// PROCESSADORES POR TIPO DE EVENTO
// ============================================================

// PEDIDO DE VENDA alterado/incluído
async function processarPedidoVenda(evento: string, payload: any) {
  try {
    const codigoPedido = String(
      payload?.event?.codigo_pedido ||
      payload?.codigo_pedido ||
      payload?.ping?.codigo_pedido ||
      ''
    );

    if (!codigoPedido) {
      console.log('[WEBHOOK] pedidovenda sem codigo_pedido no payload');
      return;
    }

    // Buscar venda local por omie_pedido_id
    const vendaLocal = await prisma.venda.findFirst({
      where: { omie_pedido_id: codigoPedido }
    });

    if (!vendaLocal) {
      console.log(`[WEBHOOK] Pedido ${codigoPedido} não encontrado no CRM local`);
      return;
    }

    // Extrair nova etapa do payload
    const novaEtapa = String(
      payload?.event?.etapa ||
      payload?.etapa ||
      ''
    );

    const cancelado = payload?.event?.cancelado === 'S' || payload?.cancelado === 'S';

    if (cancelado) {
      await prisma.venda.update({
        where: { id: vendaLocal.id },
        data: { status: 'cancelada', data_atualizacao: new Date() }
      });
      console.log(`[WEBHOOK] Pedido ${codigoPedido} CANCELADO`);
      return;
    }

    if (novaEtapa && statusMap[novaEtapa]) {
      const novoStatus = statusMap[novaEtapa];

      if (vendaLocal.status !== novoStatus) {
        const updateData: any = {
          status: novoStatus,
          data_atualizacao: new Date()
        };

        // Se mudou para recebimento, registrar data
        if (novoStatus === 'recebimento') {
          updateData.data_recebimento = new Date();
        }

        await prisma.venda.update({
          where: { id: vendaLocal.id },
          data: updateData
        });

        console.log(`[WEBHOOK] Pedido ${codigoPedido}: ${vendaLocal.status} → ${novoStatus}`);

        // Se recebido, disparar cálculo de comissão
        if (novoStatus === 'recebimento') {
          const vendaCompleta = await prisma.venda.findUnique({
            where: { id: vendaLocal.id },
            include: { cliente: true }
          });
          if (vendaCompleta) {
            await comissaoService.contabilizarComissao(vendaCompleta);
            console.log(`[WEBHOOK] Comissão calculada para pedido ${codigoPedido}`);
          }
        }
      }
    }
  } catch (error: any) {
    console.error(`[WEBHOOK] Erro processarPedidoVenda:`, error.message);
  }
}

// CONTA A RECEBER alterada/incluída
async function processarContaReceber(evento: string, payload: any) {
  try {
    const codigoLancamento = String(
      payload?.event?.codigo_lancamento_omie ||
      payload?.codigo_lancamento_omie ||
      ''
    );

    const statusTitulo = String(
      payload?.event?.status_titulo ||
      payload?.status_titulo ||
      ''
    ).toUpperCase();

    const codigoPedido = String(
      payload?.event?.nCodPedido ||
      payload?.nCodPedido ||
      payload?.event?.numero_pedido ||
      payload?.numero_pedido ||
      ''
    );

    console.log(`[WEBHOOK] ContaReceber: lancamento=${codigoLancamento}, status=${statusTitulo}, pedido=${codigoPedido}`);

    // Se o título foi RECEBIDO, atualizar a venda correspondente
    if (statusTitulo === 'RECEBIDO' && codigoPedido) {
      const vendaLocal = await prisma.venda.findFirst({
        where: { omie_pedido_id: codigoPedido }
      });

      if (vendaLocal && vendaLocal.status !== 'recebimento') {
        // Extrair valor recebido do payload
        const valorRecebido = Number(
          payload?.event?.valor_documento ||
          payload?.valor_documento ||
          0
        );

        await prisma.venda.update({
          where: { id: vendaLocal.id },
          data: {
            status: 'recebimento',
            data_recebimento: new Date(),
            data_atualizacao: new Date(),
            ...(valorRecebido > 0 ? { valor_recebido: valorRecebido } : {})
          }
        });

        console.log(`[WEBHOOK] Venda ${vendaLocal.id} marcada como recebida via conta a receber`);

        // Disparar cálculo de comissão
        const vendaCompleta = await prisma.venda.findUnique({
          where: { id: vendaLocal.id },
          include: { cliente: true }
        });

        if (vendaCompleta) {
          await comissaoService.contabilizarComissao(vendaCompleta);
          console.log(`[WEBHOOK] Comissão calculada via conta a receber para pedido ${codigoPedido}`);
        }
      }
    }
  } catch (error: any) {
    console.error(`[WEBHOOK] Erro processarContaReceber:`, error.message);
  }
}

// CLIENTE alterado/incluído
async function processarCliente(evento: string, payload: any) {
  try {
    const codigoClienteOmie = String(
      payload?.event?.codigo_cliente_omie ||
      payload?.codigo_cliente_omie ||
      ''
    );

    if (!codigoClienteOmie) {
      console.log('[WEBHOOK] cliente sem codigo_cliente_omie no payload');
      return;
    }

    // Buscar cliente local
    const clienteLocal = await prisma.cliente.findFirst({
      where: { omie_codigo: codigoClienteOmie }
    });

    if (!clienteLocal) {
      console.log(`[WEBHOOK] Cliente OMIE ${codigoClienteOmie} não encontrado no CRM`);
      return;
    }

    // Atualizar dados básicos se vieram no payload
    const updates: any = {};

    const nomeFantasia = payload?.event?.nome_fantasia || payload?.nome_fantasia;
    const email = payload?.event?.email || payload?.email;
    const telefone = payload?.event?.telefone1_numero || payload?.telefone1_numero;
    const inativo = payload?.event?.inativo || payload?.inativo;

    if (nomeFantasia) updates.nome_fantasia = nomeFantasia;
    if (email) updates.email = email;
    if (telefone) updates.telefone = telefone;
    if (inativo === 'S') updates.status = 'inativo';

    await prisma.cliente.update({
      where: { id: clienteLocal.id },
      data: updates
    });

    console.log(`[WEBHOOK] Cliente ${clienteLocal.nome_fantasia} atualizado via webhook`);
  } catch (error: any) {
    console.error(`[WEBHOOK] Erro processarCliente:`, error.message);
  }
}

// GET /api/webhooks/omie/test - Endpoint de teste (verificar se está acessível)
router.get('/omie/test', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Webhook OMIE endpoint ativo',
    timestamp: new Date().toISOString(),
    eventos_suportados: [
      'vendaproduto.incluida',
      'vendaproduto.alterada',
      'vendaproduto.cancelada',
      'vendaproduto.excluida',
      'vendaproduto.faturada',
      'vendaproduto.etapaalterada',
      'financas.contareceber.alterado',
      'financas.contareceber.baixarealizada',
      'financas.contareceber.incluido',
      'clientefornecedor.alterado',
      'clientefornecedor.excluido',
      'clientefornecedor.incluido'
    ]
  });
});

export default router;
