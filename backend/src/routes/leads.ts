import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { whatsappService } from '../services/whatsappService';

const router = express.Router();
const prisma = new PrismaClient();

const STATUS_VALIDOS = ['novo', 'contatado', 'interessado', 'proposta_enviada', 'negociando', 'convertido', 'perdido'];

// GET /api/leads - Listar leads com filtros
router.get('/', auth, async (req, res) => {
  try {
    const { vendedor_id, status, origem, pagina = '1' } = req.query;
    const limit = 20;
    const offset = (parseInt(pagina as string) - 1) * limit;

    const where: any = {};
    if (vendedor_id) where.vendedor_id = vendedor_id;
    if (status) where.status = status;
    if (origem) where.origem = origem;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          vendedor: { select: { nome: true } }
        },
        orderBy: { data_criacao: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.lead.count({ where })
    ]);

    res.json({
      leads,
      paginacao: {
        total,
        pagina: parseInt(pagina as string),
        total_paginas: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar leads' });
  }
});

// GET /api/leads/em-risco - Leads que passaram do prazo de 48h
router.get('/em-risco', auth, async (req, res) => {
  try {
    const prazoLimite = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const leadsEmRisco = await prisma.lead.findMany({
      where: {
        status: { in: ['novo', 'contatado', 'interessado'] },
        OR: [
          { data_ultimo_contato: { lt: prazoLimite } },
          { data_ultimo_contato: null, data_criacao: { lt: prazoLimite } }
        ]
      },
      include: {
        vendedor: { select: { nome: true } }
      },
      orderBy: { data_criacao: 'asc' }
    });

    res.json({
      leads: leadsEmRisco,
      total: leadsEmRisco.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar leads em risco' });
  }
});

// POST /api/leads - Criar lead
router.post('/', auth, async (req, res) => {
  try {
    const {
      nome,
      telefone,
      email,
      empresa,
      segmento,
      origem,
      vendedor_id,
      observacoes
    } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    // Verificar duplicidade por telefone
    const existente = await prisma.lead.findFirst({
      where: {
        telefone,
        status: { notIn: ['convertido', 'perdido'] }
      }
    });

    if (existente) {
      return res.status(409).json({
        error: 'Já existe um lead ativo com este telefone',
        lead_existente: existente.id
      });
    }

    const lead = await prisma.lead.create({
      data: {
        nome,
        telefone,
        email: email || null,
        empresa: empresa || null,
        segmento: segmento || null,
        origem: origem || 'indicacao',
        vendedor_id: vendedor_id || null,
        observacoes: observacoes || null,
        status: 'novo',
        data_criacao: new Date(),
        data_ultimo_contato: null
      }
    });

    // Notificar gerente sobre novo lead
    const whatsappGerente = process.env.WHATSAPP_GERENTE;
    if (whatsappGerente) {
      try {
        await whatsappService.enviarMensagem(
          whatsappGerente,
          `🆕 Novo lead!\nNome: ${nome}\nEmpresa: ${empresa || 'N/A'}\nOrigem: ${origem || 'indicação'}\nTelefone: ${telefone}`
        );
      } catch (err) {
        // Não bloqueia criação
      }
    }

    res.status(201).json(lead);
  } catch (error) {
    console.error('Erro ao criar lead:', error);
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
});

// PUT /api/leads/:id - Atualizar lead
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    // Validar status se fornecido
    if (dados.status && !STATUS_VALIDOS.includes(dados.status)) {
      return res.status(400).json({ error: `Status inválido. Valores aceitos: ${STATUS_VALIDOS.join(', ')}` });
    }

    const atualizado = await prisma.lead.update({
      where: { id },
      data: {
        nome: dados.nome || lead.nome,
        telefone: dados.telefone || lead.telefone,
        email: dados.email ?? lead.email,
        empresa: dados.empresa ?? lead.empresa,
        segmento: dados.segmento ?? lead.segmento,
        status: dados.status || lead.status,
        vendedor_id: dados.vendedor_id ?? lead.vendedor_id,
        observacoes: dados.observacoes ?? lead.observacoes,
        data_ultimo_contato: dados.registrar_contato ? new Date() : lead.data_ultimo_contato
      }
    });

    res.json(atualizado);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

// PUT /api/leads/:id/converter - Converter lead em cliente
router.put('/:id/converter', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    if (lead.status === 'convertido') {
      return res.status(409).json({ error: 'Lead já foi convertido' });
    }

    // Criar cliente a partir do lead
    const cliente = await prisma.cliente.create({
      data: {
        nome_fantasia: lead.empresa || lead.nome,
        telefone: lead.telefone,
        email: lead.email || '',
        segmento: lead.segmento || 'RESTAURANTE',
        endereco: '',
        status: 'ativo',
        data_cadastro: new Date(),
        origem: 'lead'
      }
    });

    // Atualizar lead
    await prisma.lead.update({
      where: { id },
      data: {
        status: 'convertido',
        data_conversao: new Date(),
        cliente_id_convertido: cliente.id
      }
    });

    // Verificar prêmio de 10 clientes para o vendedor
    if (lead.vendedor_id) {
      try {
        const { comissaoService } = await import('../services/comissaoService');
        await comissaoService.calcularPremio10Clientes(lead.vendedor_id);
      } catch (err) {
        console.error('Erro ao calcular prêmio 10 clientes:', err);
      }
    }

    res.json({
      message: 'Lead convertido com sucesso',
      cliente,
      lead_id: id
    });
  } catch (error) {
    console.error('Erro ao converter lead:', error);
    res.status(500).json({ error: 'Erro ao converter lead' });
  }
});

// PUT /api/leads/:id/registrar-contato - Registrar contato com lead
router.put('/:id/registrar-contato', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { observacao, novo_status } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const dadosAtualizacao: any = {
      data_ultimo_contato: new Date()
    };

    if (novo_status && STATUS_VALIDOS.includes(novo_status)) {
      dadosAtualizacao.status = novo_status;
    }

    if (observacao) {
      dadosAtualizacao.observacoes = lead.observacoes
        ? `${lead.observacoes}\n[${new Date().toLocaleDateString('pt-BR')}] ${observacao}`
        : `[${new Date().toLocaleDateString('pt-BR')}] ${observacao}`;
    }

    const atualizado = await prisma.lead.update({
      where: { id },
      data: dadosAtualizacao
    });

    res.json(atualizado);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar contato' });
  }
});

export default router;
