import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/clientes - Listar todos os clientes
router.get('/', auth, async (req, res) => {
  try {
    const { segmento, status, page = 1, limit = 20 } = req.query;

    const where: any = {};
    if (segmento) where.segmento = segmento;
    if (status) where.status = status;

    const clientes = await prisma.cliente.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { created_at: 'desc' }
    });

    const total = await prisma.cliente.count({ where });

    res.json({
      data: clientes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

// GET /api/clientes/:id - Obter cliente por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.id },
      include: {
        atividades: { orderBy: { created_at: 'desc' }, take: 10 },
        propostas: { orderBy: { created_at: 'desc' }, take: 5 },
        vendas: { orderBy: { created_at: 'desc' }, take: 10 },
        freezers: true
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter cliente' });
  }
});

// POST /api/clientes - Criar novo cliente
router.post('/', auth, async (req, res) => {
  try {
    const {
      nome_fantasia,
      cnpj,
      segmento,
      endereco,
      latitude,
      longitude,
      telefone,
      email,
      whatsapp,
      omie_codigo,
      origem
    } = req.body;

    // Validacoes obrigatorias
    if (!nome_fantasia) {
      return res.status(400).json({
        error: 'Campo obrigatorio: nome_fantasia'
      });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome_fantasia,
        cnpj,
        segmento,
        endereco,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        telefone,
        email,
        whatsapp,
        omie_codigo,
        origem,
        data_cadastro: new Date(),
        status: 'ativo'
      }
    });

    res.status(201).json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Nao permitir editar campos sincronizados com OMIE
    delete updates.total_vendas_historico;
    delete updates.media_mensal_historica;

    const cliente = await prisma.cliente.update({
      where: { id },
      data: updates
    });

    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// DELETE /api/clientes/:id - Deletar cliente (apenas se nao faturado)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se tem vendas faturadas
    const vendas_faturadas = await prisma.venda.count({
      where: {
        cliente_id: id,
        status: { in: ['faturamento', 'entrega', 'recebimento'] }
      }
    });

    if (vendas_faturadas > 0) {
      return res.status(400).json({
        error: 'Nao e possivel deletar cliente com vendas faturadas. Marque como inativo.'
      });
    }

    await prisma.cliente.delete({ where: { id } });
    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
});

export default router;
