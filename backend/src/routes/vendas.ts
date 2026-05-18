import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { omieService } from '../services/omieService';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/vendas - Listar vendas do banco local
router.get('/', auth, async (req, res) => {
  try {
    const { status, mes, cliente_id } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (cliente_id) where.cliente_id = cliente_id;

    // Filtro por mês (formato YYYY-MM)
    if (mes && typeof mes === 'string') {
      const [ano, mesNum] = mes.split('-').map(Number);
      const inicio = new Date(ano, mesNum - 1, 1);
      const fim = new Date(ano, mesNum, 0, 23, 59, 59);
      where.data_venda = { gte: inicio, lte: fim };
    }

    const vendas = await prisma.venda.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome_fantasia: true } },
        vendedor: { select: { id: true, nome: true } }
      },
      orderBy: { data_venda: 'desc' }
    });

    // Mapear para o formato que o frontend espera
    const formatadas = vendas.map(v => ({
      ...v,
      cliente: v.cliente ? { nome: v.cliente.nome_fantasia } : null,
      vendedor: v.vendedor ? { nome: v.vendedor.nome } : null
    }));

    res.json(formatadas);
  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    res.status(500).json({ error: 'Erro ao listar vendas' });
  }
});

// GET /api/vendas/:id - Buscar venda por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: req.params.id },
      include: {
        cliente: { select: { id: true, nome_fantasia: true } },
        vendedor: { select: { id: true, nome: true } },
        comissoes: true
      }
    });

    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    res.json(venda);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar venda' });
  }
});

// POST /api/vendas - Registrar venda manualmente
router.post('/', auth, async (req, res) => {
  try {
    const { cliente_id, vendedor_id, valor_total, status, observacoes, data_venda } = req.body;

    if (!cliente_id || !valor_total) {
      return res.status(400).json({ error: 'cliente_id e valor_total são obrigatórios' });
    }

    // Se não veio vendedor_id, pegar o primeiro vendedor ativo
    let vendId = vendedor_id;
    if (!vendId) {
      const vendedor = await prisma.vendedor.findFirst({ where: { status: 'ativo' } });
      vendId = vendedor?.id;
    }

    if (!vendId) {
      return res.status(400).json({ error: 'Nenhum vendedor ativo encontrado. Cadastre um vendedor primeiro.' });
    }

    const venda = await prisma.venda.create({
      data: {
        cliente_id,
        vendedor_id: vendId,
        valor_total: parseFloat(valor_total),
        status: status || 'vendas',
        data_venda: data_venda ? new Date(data_venda) : new Date()
      },
      include: {
        cliente: { select: { nome_fantasia: true } },
        vendedor: { select: { nome: true } }
      }
    });

    res.status(201).json(venda);
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro ao registrar venda' });
  }
});

// PUT /api/vendas/:id - Atualizar venda (status, valor_recebido etc.)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Se mudou para recebimento, registrar data
    if (updates.status === 'recebimento' && !updates.data_recebimento) {
      updates.data_recebimento = new Date();
    }

    updates.data_atualizacao = new Date();

    const venda = await prisma.venda.update({
      where: { id },
      data: updates
    });

    res.json(venda);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
});

// ============================================================
// POST /api/vendas/sync-omie - Sincronizar pedidos do OMIE
// Busca pedidos dos nossos clientes e salva/atualiza no banco
// ============================================================
router.post('/sync-omie', auth, async (req, res) => {
  try {
    // Buscar todos os clientes que têm omie_codigo
    const clientesComOmie = await prisma.cliente.findMany({
      where: {
        omie_codigo: { not: null },
        status: 'ativo'
      },
      select: { id: true, omie_codigo: true, nome_fantasia: true }
    });

    if (clientesComOmie.length === 0) {
      return res.json({ message: 'Nenhum cliente com código OMIE', importados: 0 });
    }

    // Precisamos de pelo menos um vendedor para associar
    let vendedorPadrao = await prisma.vendedor.findFirst({ where: { status: 'ativo' } });
    if (!vendedorPadrao) {
      return res.status(400).json({ error: 'Cadastre pelo menos um vendedor antes de sincronizar vendas' });
    }

    // Indexar clientes por omie_codigo para match rápido
    const clienteMap = new Map<string, { id: string; nome: string }>();
    for (const c of clientesComOmie) {
      if (c.omie_codigo) {
        clienteMap.set(c.omie_codigo, { id: c.id, nome: c.nome_fantasia });
      }
    }

    let importados = 0;
    let atualizados = 0;
    const erros: string[] = [];

    // Buscar pedidos de cada cliente (com delay para rate limit)
    for (const cliente of clientesComOmie) {
      if (!cliente.omie_codigo) continue;

      try {
        const resultado = await omieService.buscarPedidosCliente(cliente.omie_codigo);

        for (const pedido of resultado.pedidos) {
          const codigoPedido = String(pedido.cabecalho?.codigo_pedido || '');
          if (!codigoPedido) continue;

          // Verificar se já existe no banco
          const existente = await prisma.venda.findFirst({
            where: { omie_pedido_id: codigoPedido }
          });

          const valorTotal = pedido.total_pedido?.valor_total_pedido || 0;
          const etapa = pedido.cabecalho?.etapa || '10';

          // Mapear etapa OMIE para nosso status
          const statusMap: Record<string, string> = {
            '10': 'vendas',      // Pedido
            '20': 'separacao',   // Separar
            '30': 'faturamento', // Faturar
            '50': 'faturamento', // Faturado
            '60': 'entrega',     // Entregue
            '70': 'recebimento'  // Recebido
          };
          const statusVenda = statusMap[etapa] || 'vendas';

          // Data do pedido
          const dataPedido = pedido.cabecalho?.data_previsao
            ? new Date(pedido.cabecalho.data_previsao.split('/').reverse().join('-'))
            : new Date();

          // Faturado?
          const faturado = pedido.infoCadastro?.faturado === 'S';
          const cancelado = pedido.infoCadastro?.cancelado === 'S';

          if (cancelado) continue; // Pular cancelados

          if (existente) {
            // Atualizar status se mudou
            if (existente.status !== statusVenda) {
              await prisma.venda.update({
                where: { id: existente.id },
                data: {
                  status: statusVenda,
                  data_atualizacao: new Date(),
                  ...(faturado && statusVenda === 'recebimento' ? { data_recebimento: new Date() } : {})
                }
              });
              atualizados++;
            }
          } else {
            // Criar nova venda
            await prisma.venda.create({
              data: {
                cliente_id: cliente.id,
                vendedor_id: vendedorPadrao.id,
                omie_pedido_id: codigoPedido,
                valor_total: valorTotal,
                status: statusVenda,
                data_venda: dataPedido
              }
            });
            importados++;
          }
        }

        // Rate limit: 2s entre clientes
        await new Promise(r => setTimeout(r, 2000));

      } catch (err: any) {
        erros.push(`${cliente.nome_fantasia}: ${err.message}`);
      }
    }

    res.json({
      importados,
      atualizados,
      total_clientes: clientesComOmie.length,
      erros
    });
  } catch (error) {
    console.error('Erro ao sincronizar vendas OMIE:', error);
    res.status(500).json({ error: 'Erro ao sincronizar vendas com OMIE' });
  }
});

export default router;
