import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { comissaoService } from '../services/comissaoService';
import { omieService } from '../services/omieService';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/comissoes - Listar comissões com filtros
router.get('/', auth, async (req, res) => {
  try {
    const { vendedor_id, mes, ano, tipo, status } = req.query;

    const where: any = {};
    if (vendedor_id) where.vendedor_id = vendedor_id;
    if (tipo) where.tipo_comissao = tipo;
    if (status) where.status = status;

    // Filtro por mês/ano
    if (mes && ano) {
      const inicioMes = new Date(Number(ano), Number(mes) - 1, 1);
      const fimMes = new Date(Number(ano), Number(mes), 0, 23, 59, 59);
      where.data_calculo = { gte: inicioMes, lte: fimMes };
    } else if (ano) {
      const inicioAno = new Date(Number(ano), 0, 1);
      const fimAno = new Date(Number(ano), 11, 31, 23, 59, 59);
      where.data_calculo = { gte: inicioAno, lte: fimAno };
    }

    const comissoes = await prisma.comissao.findMany({
      where,
      include: {
        vendedor: { select: { nome: true } },
        cliente: { select: { nome_fantasia: true } },
        venda: { select: { valor_recebido: true, valor_total: true } }
      },
      orderBy: { data_calculo: 'desc' }
    });

    // Totalizar
    const total = comissoes.reduce((acc, c) => acc + Number(c.valor), 0);
    const totalPendente = comissoes
      .filter(c => c.status === 'pendente')
      .reduce((acc, c) => acc + Number(c.valor), 0);
    const totalPago = comissoes
      .filter(c => c.status === 'paga')
      .reduce((acc, c) => acc + Number(c.valor), 0);

    res.json({
      comissoes,
      resumo: {
        total,
        pendente: totalPendente,
        pago: totalPago,
        quantidade: comissoes.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar comissões' });
  }
});

// GET /api/comissoes/vendedor/:id/mes - Comissões do vendedor no mês atual
router.get('/vendedor/:id/mes', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { mes, ano } = req.query;

    let dataReferencia: Date;
    if (mes && ano) {
      dataReferencia = new Date(Number(ano), Number(mes) - 1, 1);
    } else {
      dataReferencia = new Date();
    }

    const resultado = await comissaoService.consultarComissoesMes(id, dataReferencia);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar comissões do mês' });
  }
});

// PUT /api/comissoes/:id/pagar - Marcar comissão como paga
router.put('/:id/pagar', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioLogado = (req as any).user;

    // Apenas gerentes podem marcar como paga
    if (usuarioLogado.role !== 'gerente') {
      return res.status(403).json({ error: 'Apenas gerentes podem confirmar pagamento' });
    }

    const comissao = await prisma.comissao.findUnique({
      where: { id }
    });

    if (!comissao) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    if (comissao.status !== 'pendente') {
      return res.status(409).json({ error: `Comissão já está com status: ${comissao.status}` });
    }

    const atualizada = await prisma.comissao.update({
      where: { id },
      data: {
        status: 'paga',
        data_pagamento: new Date()
      }
    });

    res.json(atualizada);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar comissão como paga' });
  }
});

// PUT /api/comissoes/pagar-lote - Pagar várias comissões de uma vez
router.put('/pagar-lote', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    const usuarioLogado = (req as any).user;

    if (usuarioLogado.role !== 'gerente') {
      return res.status(403).json({ error: 'Apenas gerentes podem confirmar pagamento' });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs das comissões são obrigatórios' });
    }

    const resultado = await prisma.comissao.updateMany({
      where: {
        id: { in: ids },
        status: 'pendente'
      },
      data: {
        status: 'paga',
        data_pagamento: new Date()
      }
    });

    res.json({
      message: `${resultado.count} comissões marcadas como pagas`,
      atualizadas: resultado.count
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao pagar comissões em lote' });
  }
});

// POST /api/comissoes/estornar/:cliente_id - Estornar comissões de cliente inadimplente
router.post('/estornar/:cliente_id', auth, async (req, res) => {
  try {
    const { cliente_id } = req.params;
    const usuarioLogado = (req as any).user;

    if (usuarioLogado.role !== 'gerente') {
      return res.status(403).json({ error: 'Apenas gerentes podem estornar comissões' });
    }

    const estornadas = await comissaoService.estornarComissao(cliente_id);

    res.json({
      message: `${estornadas} comissões estornadas`,
      estornadas
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao estornar comissões' });
  }
});

// ============================================================
// POST /api/comissoes/sync-recebimentos - Sincronizar comissões via Contas a Receber OMIE
// Busca títulos RECEBIDOS em bulk, cruza com vendas locais, calcula comissões
// ============================================================
router.post('/sync-recebimentos', auth, async (req, res) => {
  try {
    // 1) Buscar clientes com omie_codigo
    const clientesComOmie = await prisma.cliente.findMany({
      where: { omie_codigo: { not: null }, status: 'ativo' },
      select: { id: true, omie_codigo: true, nome_fantasia: true }
    });

    if (clientesComOmie.length === 0) {
      return res.json({ message: 'Nenhum cliente com código OMIE', processados: 0 });
    }

    // Indexar por omie_codigo
    const clienteMap = new Map<string, string>();
    for (const c of clientesComOmie) {
      if (c.omie_codigo) clienteMap.set(c.omie_codigo, c.id);
    }

    // 2) Buscar contas a receber RECEBIDAS dos últimos 3 meses (bulk)
    const agora = new Date();
    const tresAtras = new Date(agora);
    tresAtras.setMonth(tresAtras.getMonth() - 3);
    const dataInicio = `${String(tresAtras.getDate()).padStart(2, '0')}/${String(tresAtras.getMonth() + 1).padStart(2, '0')}/${tresAtras.getFullYear()}`;
    const dataFim = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()}`;

    let todasContas: any[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const resultado = await omieService.buscarContasReceberPeriodo(dataInicio, dataFim, 'RECEBIDO', pagina);
      todasContas.push(...resultado.contas);
      totalPaginas = resultado.total_paginas;
      pagina++;
      if (pagina <= totalPaginas) {
        await new Promise(r => setTimeout(r, 2000)); // Respeitar rate limit
      }
    } while (pagina <= totalPaginas);

    // 3) Processar cada conta recebida
    let comissoesGeradas = 0;
    let vendasAtualizadas = 0;
    const erros: string[] = [];

    for (const conta of todasContas) {
      try {
        const codigoClienteOmie = String(conta.codigo_cliente_fornecedor || '');
        const clienteIdLocal = clienteMap.get(codigoClienteOmie);
        if (!clienteIdLocal) continue; // Cliente não está no CRM

        const codigoPedido = String(conta.nCodPedido || conta.numero_pedido || '');
        if (!codigoPedido) continue; // Sem vínculo com pedido

        // Buscar venda local
        const vendaLocal = await prisma.venda.findFirst({
          where: { omie_pedido_id: codigoPedido }
        });

        if (!vendaLocal) continue;

        // Atualizar venda para recebimento se ainda não estiver
        if (vendaLocal.status !== 'recebimento') {
          const valorRecebido = Number(conta.valor_documento || 0);
          await prisma.venda.update({
            where: { id: vendaLocal.id },
            data: {
              status: 'recebimento',
              data_recebimento: new Date(),
              data_atualizacao: new Date(),
              ...(valorRecebido > 0 ? { valor_recebido: valorRecebido } : {})
            }
          });
          vendasAtualizadas++;
        }

        // Verificar se já existe comissão para essa venda
        const comissaoExistente = await prisma.comissao.findFirst({
          where: { venda_id: vendaLocal.id }
        });

        if (!comissaoExistente) {
          // Calcular comissão
          const vendaCompleta = await prisma.venda.findUnique({
            where: { id: vendaLocal.id },
            include: { cliente: true }
          });

          if (vendaCompleta) {
            await comissaoService.contabilizarComissao(vendaCompleta);
            comissoesGeradas++;
          }
        }
      } catch (err: any) {
        erros.push(`Conta ${conta.codigo_lancamento_omie}: ${err.message}`);
      }
    }

    res.json({
      total_contas_recebidas: todasContas.length,
      vendas_atualizadas: vendasAtualizadas,
      comissoes_geradas: comissoesGeradas,
      periodo: `${dataInicio} a ${dataFim}`,
      erros
    });
  } catch (error: any) {
    console.error('Erro ao sync recebimentos:', error);
    res.status(500).json({ error: 'Erro ao sincronizar recebimentos com OMIE' });
  }
});

export default router;
