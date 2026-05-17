import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { whatsappService } from '../services/whatsappService';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/propostas - Criar proposta
router.post('/', auth, async (req, res) => {
  try {
    const {
      vendedor_id,
      cliente_id,
      itens,
      observacoes,
      validade_dias
    } = req.body;

    if (!vendedor_id || !cliente_id || !itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'vendedor_id, cliente_id e itens são obrigatórios' });
    }

    // Calcular valor total
    const valor_total = itens.reduce((acc: number, item: any) => {
      return acc + (Number(item.quantidade || 0) * Number(item.preco_unitario || 0));
    }, 0);

    if (valor_total <= 0) {
      return res.status(400).json({ error: 'Valor total deve ser maior que zero' });
    }

    // Gerar código único da proposta
    const codigo = `PROP-${Date.now().toString(36).toUpperCase()}`;

    const proposta = await prisma.proposta.create({
      data: {
        codigo,
        vendedor_id,
        cliente_id,
        itens,
        valor_total,
        status: 'enviada',
        observacoes: observacoes || null,
        validade: new Date(Date.now() + (validade_dias || 7) * 86400000),
        data_criacao: new Date()
      }
    });

    // Gerar link da proposta (Vercel)
    const link_proposta = `${process.env.FRONTEND_URL || 'https://gelateria-moderna.vercel.app'}/proposta/${proposta.id}`;

    // Enviar via WhatsApp para o cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: cliente_id }
    });

    if (cliente?.telefone) {
      try {
        await whatsappService.enviarProposta(cliente.telefone, cliente, link_proposta);
      } catch (err) {
        console.error('Erro ao enviar proposta via WhatsApp:', err);
        // Não bloqueia criação da proposta se WhatsApp falhar
      }
    }

    res.status(201).json({
      ...proposta,
      link: link_proposta
    });
  } catch (error) {
    console.error('Erro ao criar proposta:', error);
    res.status(500).json({ error: 'Erro ao criar proposta' });
  }
});

// GET /api/propostas - Listar propostas
router.get('/', auth, async (req, res) => {
  try {
    const { vendedor_id, cliente_id, status, pagina = '1' } = req.query;
    const limit = 20;
    const offset = (parseInt(pagina as string) - 1) * limit;

    const where: any = {};
    if (vendedor_id) where.vendedor_id = vendedor_id;
    if (cliente_id) where.cliente_id = cliente_id;
    if (status) where.status = status;

    const [propostas, total] = await Promise.all([
      prisma.proposta.findMany({
        where,
        include: {
          cliente: { select: { nome_fantasia: true, telefone: true } },
          vendedor: { select: { nome: true } }
        },
        orderBy: { data_criacao: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.proposta.count({ where })
    ]);

    res.json({
      propostas,
      paginacao: {
        total,
        pagina: parseInt(pagina as string),
        total_paginas: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar propostas' });
  }
});

// GET /api/propostas/:id - Buscar proposta (público - para cliente visualizar)
router.get('/:id', async (req, res) => {
  try {
    const proposta = await prisma.proposta.findUnique({
      where: { id: req.params.id },
      include: {
        cliente: { select: { nome_fantasia: true } },
        vendedor: { select: { nome: true, whatsapp: true } }
      }
    });

    if (!proposta) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    res.json(proposta);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar proposta' });
  }
});

// PUT /api/propostas/:id/aceitar - Cliente aceita proposta
router.put('/:id/aceitar', async (req, res) => {
  try {
    const { id } = req.params;

    const proposta = await prisma.proposta.findUnique({
      where: { id },
      include: { cliente: true, vendedor: true }
    });

    if (!proposta) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    if (proposta.status !== 'enviada') {
      return res.status(409).json({ error: `Proposta já está com status: ${proposta.status}` });
    }

    // Verificar validade
    if (proposta.validade && new Date() > proposta.validade) {
      return res.status(410).json({ error: 'Proposta expirada' });
    }

    const atualizada = await prisma.proposta.update({
      where: { id },
      data: {
        status: 'aceita',
        data_aceite: new Date()
      }
    });

    // Notificar vendedor via WhatsApp
    if (proposta.vendedor?.whatsapp) {
      try {
        await whatsappService.enviarMensagem(
          proposta.vendedor.whatsapp,
          `✅ Proposta aceita!\nCliente: ${proposta.cliente?.nome_fantasia}\nValor: R$ ${proposta.valor_total}\nCódigo: ${proposta.codigo}`
        );
      } catch (err) {
        // Não bloqueia
      }
    }

    // Notificar gerente
    const whatsappGerente = process.env.WHATSAPP_GERENTE;
    if (whatsappGerente) {
      try {
        await whatsappService.enviarMensagem(
          whatsappGerente,
          `✅ Proposta aceita!\nCliente: ${proposta.cliente?.nome_fantasia}\nValor: R$ ${proposta.valor_total}\nVendedor: ${proposta.vendedor?.nome}`
        );
      } catch (err) {
        // Não bloqueia
      }
    }

    res.json(atualizada);
  } catch (error) {
    console.error('Erro ao aceitar proposta:', error);
    res.status(500).json({ error: 'Erro ao aceitar proposta' });
  }
});

// PUT /api/propostas/:id/rejeitar - Cliente rejeita proposta
router.put('/:id/rejeitar', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const proposta = await prisma.proposta.findUnique({
      where: { id }
    });

    if (!proposta) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    const atualizada = await prisma.proposta.update({
      where: { id },
      data: {
        status: 'rejeitada',
        observacoes: motivo ? `${proposta.observacoes || ''}\n[REJEIÇÃO]: ${motivo}` : proposta.observacoes
      }
    });

    res.json(atualizada);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao rejeitar proposta' });
  }
});

export default router;
