import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/dashboard/hoje - Dados do dashboard do dia
// Query params opcionais: vendedor_id (filtra dados por vendedor específico)
router.get('/hoje', auth, async (req, res) => {
  try {
    const { vendedor_id } = req.query;
    const filtroVendedor = vendedor_id ? { vendedor_id: vendedor_id as string } : {};

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

    // Dados paralelos para performance
    const [
      totalClientes,
      clientesAtivos,
      visitasHoje,
      vendasMes,
      leadsAbertos,
      comissoesMes,
      rotaHoje
    ] = await Promise.all([
      // Total de clientes
      prisma.cliente.count(),

      // Clientes ativos
      prisma.cliente.count({ where: { status: 'ativo' } }),

      // Visitas do dia (filtradas por vendedor se fornecido)
      prisma.atividade.count({
        where: {
          data_hora_inicio: { gte: hoje, lt: amanha },
          ...filtroVendedor
        }
      }),

      // Vendas do mês (filtradas por vendedor se fornecido)
      prisma.venda.aggregate({
        where: {
          data_venda: { gte: inicioMes, lte: fimMes },
          ...filtroVendedor
        },
        _sum: { valor_total: true },
        _count: true
      }),

      // Leads abertos (filtrados por vendedor se fornecido)
      prisma.lead.count({
        where: {
          status: { in: ['novo', 'contatado', 'interessado', 'proposta_enviada', 'negociando'] },
          ...filtroVendedor
        }
      }),

      // Comissões do mês (filtradas por vendedor se fornecido)
      prisma.comissao.aggregate({
        where: {
          data_calculo: { gte: inicioMes, lte: fimMes },
          ...filtroVendedor
        },
        _sum: { valor: true },
        _count: true
      }),

      // Rota do dia (filtrada por vendedor se fornecido)
      prisma.rota.findFirst({
        where: {
          data_rota: hoje,
          ...filtroVendedor
        },
        include: {
          vendedor: { select: { nome: true } }
        }
      })
    ]);

    // Clientes sem visita há mais de 7 dias
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const clientesSemVisita = await prisma.cliente.count({
      where: {
        status: 'ativo',
        OR: [
          { ultima_visita: { lt: seteDiasAtras } },
          { ultima_visita: null }
        ]
      }
    });

    // Últimas 5 atividades (filtradas por vendedor se fornecido)
    const ultimasAtividades = await prisma.atividade.findMany({
      where: filtroVendedor,
      take: 5,
      orderBy: { data_hora_inicio: 'desc' },
      include: {
        cliente: { select: { nome_fantasia: true } },
        vendedor: { select: { nome: true } }
      }
    });

    res.json({
      resumo: {
        total_clientes: totalClientes,
        clientes_ativos: clientesAtivos,
        visitas_hoje: visitasHoje,
        meta_visitas: 10,
        vendas_mes_valor: vendasMes._sum.valor_total || 0,
        vendas_mes_quantidade: vendasMes._count,
        leads_abertos: leadsAbertos,
        comissoes_mes: comissoesMes._sum.valor || 0,
        clientes_sem_visita_7d: clientesSemVisita
      },
      rota_hoje: rotaHoje,
      ultimas_atividades: ultimasAtividades
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

export default router;
