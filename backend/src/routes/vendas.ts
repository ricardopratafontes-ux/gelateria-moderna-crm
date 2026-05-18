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
// POST /api/vendas/sync-omie - Sincronizar pedidos do OMIE via bulk fetch
// Busca TODOS os pedidos dos últimos 6 meses de uma vez (paginado)
// e faz matching local por codigo_cliente_omie — evita rate limit
// ============================================================
router.post('/sync-omie', auth, async (req, res) => {
  try {
    // 1) Buscar todos os clientes que têm omie_codigo
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
    const vendedorPadrao = await prisma.vendedor.findFirst({ where: { status: 'ativo' } });
    if (!vendedorPadrao) {
      return res.status(400).json({ error: 'Cadastre pelo menos um vendedor antes de sincronizar vendas' });
    }

    // 2) Indexar clientes CRM por omie_codigo para match rápido
    const clienteMap = new Map<string, { id: string; nome: string }>();
    for (const c of clientesComOmie) {
      if (c.omie_codigo) {
        clienteMap.set(c.omie_codigo, { id: c.id, nome: c.nome_fantasia });
      }
    }

    // 3) Buscar TODOS os pedidos dos últimos 6 meses via bulk (paginado)
    const agora = new Date();
    const seisAtras = new Date(agora);
    seisAtras.setMonth(seisAtras.getMonth() - 6);
    const dataInicio = `${String(seisAtras.getDate()).padStart(2, '0')}/${String(seisAtras.getMonth() + 1).padStart(2, '0')}/${seisAtras.getFullYear()}`;
    const dataFim = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()}`;

    let todosPedidos: any[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const resultado = await omieService.buscarPedidosPeriodo(dataInicio, dataFim, pagina);
      todosPedidos.push(...resultado.pedidos);
      totalPaginas = resultado.total_paginas;
      pagina++;
      if (pagina <= totalPaginas) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } while (pagina <= totalPaginas);

    // 4) Processar cada pedido e fazer matching local
    let importados = 0;
    let atualizados = 0;
    let ignorados = 0;
    const erros: string[] = [];

    // Mapear etapa OMIE para nosso status
    const statusMap: Record<string, string> = {
      '10': 'vendas',      // Pedido
      '20': 'separacao',   // Separar
      '30': 'faturamento', // Faturar
      '50': 'faturamento', // Faturado
      '60': 'entrega',     // Entregue
      '70': 'recebimento'  // Recebido
    };

    for (const pedido of todosPedidos) {
      try {
        const codigoPedido = String(pedido.cabecalho?.codigo_pedido || '');
        if (!codigoPedido) continue;

        // Identificar cliente do pedido
        const codigoClienteOmie = String(pedido.cabecalho?.codigo_cliente || '');
        const clienteCRM = clienteMap.get(codigoClienteOmie);

        if (!clienteCRM) {
          ignorados++; // Pedido de cliente que não está no CRM
          continue;
        }

        // Cancelado?
        const cancelado = pedido.infoCadastro?.cancelado === 'S';
        if (cancelado) continue;

        const valorTotal = pedido.total_pedido?.valor_total_pedido || 0;
        const etapa = pedido.cabecalho?.etapa || '10';
        const statusVenda = statusMap[etapa] || 'vendas';

        // Data do pedido
        const dataPedido = pedido.cabecalho?.data_previsao
          ? new Date(pedido.cabecalho.data_previsao.split('/').reverse().join('-'))
          : new Date();

        const faturado = pedido.infoCadastro?.faturado === 'S';

        // Verificar se já existe no banco
        const existente = await prisma.venda.findFirst({
          where: { omie_pedido_id: codigoPedido }
        });

        if (existente) {
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
          await prisma.venda.create({
            data: {
              cliente_id: clienteCRM.id,
              vendedor_id: vendedorPadrao.id,
              omie_pedido_id: codigoPedido,
              valor_total: valorTotal,
              status: statusVenda,
              data_venda: dataPedido
            }
          });
          importados++;
        }
      } catch (err: any) {
        erros.push(`Pedido ${pedido.cabecalho?.codigo_pedido}: ${err.message}`);
      }
    }

    res.json({
      importados,
      atualizados,
      ignorados,
      total_pedidos_omie: todosPedidos.length,
      total_clientes: clientesComOmie.length,
      periodo: `${dataInicio} a ${dataFim}`,
      erros
    });
  } catch (error) {
    console.error('Erro ao sincronizar vendas OMIE:', error);
    res.status(500).json({ error: 'Erro ao sincronizar vendas com OMIE' });
  }
});

export default router;
