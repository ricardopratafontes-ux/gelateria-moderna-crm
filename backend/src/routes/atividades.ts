import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/atividades - Iniciar atividade (vendedor)
router.post('/', auth, async (req, res) => {
  try {
    const {
      vendedor_id,
      cliente_id,
      rota_id,
      tipo,
      latitude,
      longitude
    } = req.body;

    if (!vendedor_id || !cliente_id || !tipo) {
      return res.status(400).json({ error: 'vendedor_id, cliente_id e tipo são obrigatórios' });
    }

    // Validar tipo
    const tiposValidos = ['visita', 'venda', 'prospeccao', 'entrega', 'cobranca', 'pos_venda'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: `Tipo inválido. Valores aceitos: ${tiposValidos.join(', ')}` });
    }

    // Verificar se já existe atividade ativa (não concluída) para este vendedor
    const atividadeAtiva = await prisma.atividade.findFirst({
      where: {
        vendedor_id,
        resultado: null
      }
    });

    if (atividadeAtiva) {
      return res.status(409).json({
        error: 'Já existe uma atividade em andamento',
        atividade_ativa: atividadeAtiva.id
      });
    }

    const atividade = await prisma.atividade.create({
      data: {
        vendedor_id,
        cliente_id,
        rota_id: rota_id || null,
        tipo,
        data_hora_inicio: new Date(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      }
    });

    res.status(201).json(atividade);
  } catch (error) {
    console.error('Erro ao iniciar atividade:', error);
    res.status(500).json({ error: 'Erro ao iniciar atividade' });
  }
});

// PUT /api/atividades/:id/concluir - Concluir atividade
router.put('/:id/concluir', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      resultado,
      observacoes,
      fotos,
      latitude_fim,
      longitude_fim,
      valor_pedido
    } = req.body;

    const atividade = await prisma.atividade.findUnique({
      where: { id }
    });

    if (!atividade) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    if (atividade.resultado) {
      return res.status(409).json({ error: 'Atividade já foi concluída' });
    }

    // Validar resultado
    const resultadosValidos = ['concluida', 'ausente', 'reagendar', 'sem_interesse'];
    if (!resultadosValidos.includes(resultado)) {
      return res.status(400).json({ error: `Resultado inválido. Valores aceitos: ${resultadosValidos.join(', ')}` });
    }

    const dataFim = new Date();
    const duracaoMinutos = Math.round(
      (dataFim.getTime() - atividade.data_hora_inicio.getTime()) / (1000 * 60)
    );

    const atualizada = await prisma.atividade.update({
      where: { id },
      data: {
        resultado,
        data_hora_fim: dataFim,
        duracao_minutos: duracaoMinutos,
        observacoes: observacoes || null,
        fotos: fotos || [],
        latitude_fim: latitude_fim ? parseFloat(latitude_fim) : null,
        longitude_fim: longitude_fim ? parseFloat(longitude_fim) : null,
        valor_pedido: valor_pedido ? parseFloat(valor_pedido) : null
      }
    });

    // Atualizar última visita do cliente
    if (resultado === 'concluida') {
      await prisma.cliente.update({
        where: { id: atividade.cliente_id },
        data: { ultima_visita: new Date() }
      });
    }

    res.json(atualizada);
  } catch (error) {
    console.error('Erro ao concluir atividade:', error);
    res.status(500).json({ error: 'Erro ao concluir atividade' });
  }
});

// GET /api/atividades/hoje/:vendedor_id - Atividades do dia do vendedor
router.get('/hoje/:vendedor_id', auth, async (req, res) => {
  try {
    const { vendedor_id } = req.params;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const atividades = await prisma.atividade.findMany({
      where: {
        vendedor_id,
        data_hora_inicio: { gte: hoje }
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome_fantasia: true,
            endereco: true,
            telefone: true,
            segmento: true
          }
        }
      },
      orderBy: { data_hora_inicio: 'desc' }
    });

    const concluidas = atividades.filter(a => a.resultado === 'concluida').length;
    const emAndamento = atividades.find(a => !a.resultado);

    res.json({
      atividades,
      resumo: {
        total: atividades.length,
        concluidas,
        em_andamento: emAndamento ? emAndamento.id : null,
        meta: 10
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar atividades do dia' });
  }
});

// GET /api/atividades/historico - Histórico com filtros
router.get('/historico', auth, async (req, res) => {
  try {
    const { vendedor_id, cliente_id, data_inicio, data_fim, pagina = '1' } = req.query;
    const limit = 20;
    const offset = (parseInt(pagina as string) - 1) * limit;

    const where: any = {};
    if (vendedor_id) where.vendedor_id = vendedor_id;
    if (cliente_id) where.cliente_id = cliente_id;
    if (data_inicio || data_fim) {
      where.data_hora_inicio = {};
      if (data_inicio) where.data_hora_inicio.gte = new Date(data_inicio as string);
      if (data_fim) where.data_hora_inicio.lte = new Date(data_fim as string);
    }

    const [atividades, total] = await Promise.all([
      prisma.atividade.findMany({
        where,
        include: {
          cliente: { select: { nome_fantasia: true, segmento: true } },
          vendedor: { select: { nome: true } }
        },
        orderBy: { data_hora_inicio: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.atividade.count({ where })
    ]);

    res.json({
      atividades,
      paginacao: {
        total,
        pagina: parseInt(pagina as string),
        total_paginas: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

export default router;
