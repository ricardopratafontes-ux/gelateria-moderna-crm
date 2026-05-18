import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { omieService } from '../services/omieService';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/vendedores - Listar todos os vendedores
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const vendedores = await prisma.vendedor.findMany({
      where,
      orderBy: { nome: 'asc' }
    });

    res.json(vendedores);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar vendedores' });
  }
});

// GET /api/vendedores/:id - Buscar vendedor por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const vendedor = await prisma.vendedor.findUnique({
      where: { id: req.params.id },
      include: {
        rotas: {
          orderBy: { data_rota: 'desc' },
          take: 5
        },
        comissoes: {
          orderBy: { data_calculo: 'desc' },
          take: 10
        }
      }
    });

    if (!vendedor) {
      return res.status(404).json({ error: 'Vendedor não encontrado' });
    }

    res.json(vendedor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar vendedor' });
  }
});

// POST /api/vendedores - Criar vendedor
router.post('/', auth, async (req, res) => {
  try {
    const { nome, email, whatsapp, regiao } = req.body;

    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Verificar email duplicado
    const existente = await prisma.vendedor.findFirst({
      where: { email }
    });

    if (existente) {
      return res.status(409).json({ error: 'Email já cadastrado para outro vendedor' });
    }

    const vendedor = await prisma.vendedor.create({
      data: {
        nome,
        email,
        whatsapp: whatsapp || '',
        regiao: regiao || 'Aracaju',
        status: 'ativo',
        meta_visitas_dia: 10,
        data_admissao: new Date()
      }
    });

    res.status(201).json(vendedor);
  } catch (error) {
    console.error('Erro ao criar vendedor:', error);
    res.status(500).json({ error: 'Erro ao criar vendedor' });
  }
});

// PUT /api/vendedores/:id - Atualizar vendedor
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    const vendedor = await prisma.vendedor.findUnique({
      where: { id }
    });

    if (!vendedor) {
      return res.status(404).json({ error: 'Vendedor não encontrado' });
    }

    const atualizado = await prisma.vendedor.update({
      where: { id },
      data: {
        nome: dados.nome || vendedor.nome,
        email: dados.email || vendedor.email,
        whatsapp: dados.whatsapp ?? vendedor.whatsapp,
        regiao: dados.regiao || vendedor.regiao,
        status: dados.status || vendedor.status,
        meta_visitas_dia: dados.meta_visitas_dia ?? vendedor.meta_visitas_dia
      }
    });

    res.json(atualizado);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar vendedor' });
  }
});

// GET /api/vendedores/:id/performance - Performance do vendedor
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { periodo } = req.query; // 'semana' | 'mes'

    const agora = new Date();
    let dataInicio: Date;

    if (periodo === 'mes') {
      dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    } else {
      // Default: semana
      dataInicio = new Date(agora);
      dataInicio.setDate(agora.getDate() - 7);
    }

    const visitas = await prisma.atividade.count({
      where: {
        vendedor_id: id,
        data_hora_inicio: { gte: dataInicio },
        resultado: 'concluida'
      }
    });

    const propostas = await prisma.proposta.count({
      where: {
        vendedor_id: id,
        data_criacao: { gte: dataInicio }
      }
    });

    const propostasAceitas = await prisma.proposta.count({
      where: {
        vendedor_id: id,
        data_criacao: { gte: dataInicio },
        status: 'aceita'
      }
    });

    const comissoes = await prisma.comissao.findMany({
      where: {
        vendedor_id: id,
        data_calculo: { gte: dataInicio },
        status: { not: 'estornada' }
      }
    });

    const totalComissoes = comissoes.reduce((acc, c) => acc + Number(c.valor), 0);

    const diasUteis = periodo === 'mes'
      ? Math.ceil((agora.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    res.json({
      periodo: periodo || 'semana',
      data_inicio: dataInicio,
      visitas,
      media_visitas_dia: (visitas / Math.max(diasUteis, 1)).toFixed(1),
      propostas,
      propostas_aceitas: propostasAceitas,
      taxa_conversao: propostas > 0 ? ((propostasAceitas / propostas) * 100).toFixed(1) : '0.0',
      total_comissoes: totalComissoes
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar performance' });
  }
});

// GET /api/vendedores/:id/localizacao - Última localização GPS
router.get('/:id/localizacao', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const ultimaAtividade = await prisma.atividade.findFirst({
      where: {
        vendedor_id: id,
        latitude: { not: null }
      },
      orderBy: { data_hora_inicio: 'desc' },
      select: {
        latitude: true,
        longitude: true,
        data_hora_inicio: true
      }
    });

    if (!ultimaAtividade) {
      return res.status(404).json({ error: 'Sem localização disponível' });
    }

    res.json({
      latitude: ultimaAtividade.latitude,
      longitude: ultimaAtividade.longitude,
      timestamp: ultimaAtividade.data_hora_inicio
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar localização' });
  }
});

// ============================================================
// POST /api/vendedores/sync-omie - Importar vendedores do OMIE
// Busca vendedores cadastrados no OMIE e cria/atualiza no CRM
// ============================================================
router.post('/sync-omie', auth, async (req, res) => {
  try {
    let todosVendedores: any[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    // Paginar todos os vendedores do OMIE
    do {
      const resultado = await omieService.listarVendedores(pagina);
      todosVendedores.push(...resultado.vendedores);
      totalPaginas = resultado.total_paginas;
      pagina++;

      // Rate limit
      if (pagina <= totalPaginas) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } while (pagina <= totalPaginas);

    if (todosVendedores.length === 0) {
      return res.json({ message: 'Nenhum vendedor encontrado no OMIE', importados: 0, atualizados: 0 });
    }

    let importados = 0;
    let atualizados = 0;
    const erros: string[] = [];

    for (const v of todosVendedores) {
      try {
        // Campos OMIE vendedores: codigo, codInt, nome, inativo, email, comissao
        const nome = v.nome || '';
        const email = v.email || '';
        const inativo = v.inativo === 'S';

        if (!nome) continue;

        // Tentar encontrar por email ou nome
        let existente = null;
        if (email) {
          existente = await prisma.vendedor.findFirst({ where: { email } });
        }
        if (!existente) {
          existente = await prisma.vendedor.findFirst({ where: { nome } });
        }

        if (existente) {
          // Atualizar dados
          await prisma.vendedor.update({
            where: { id: existente.id },
            data: {
              nome,
              ...(email && { email }),
              status: inativo ? 'inativo' : 'ativo'
            }
          });
          atualizados++;
        } else {
          // Criar novo vendedor
          await prisma.vendedor.create({
            data: {
              nome,
              email: email || `vendedor_${Date.now()}@gelateria.com`,
              whatsapp: '',
              regiao: 'Aracaju',
              status: inativo ? 'inativo' : 'ativo',
              meta_visitas_dia: 10,
              data_admissao: new Date()
            }
          });
          importados++;
        }
      } catch (err: any) {
        erros.push(`${v.nome || 'sem nome'}: ${err.message}`);
      }
    }

    res.json({
      importados,
      atualizados,
      total_omie: todosVendedores.length,
      erros
    });
  } catch (error) {
    console.error('Erro ao sincronizar vendedores OMIE:', error);
    res.status(500).json({ error: 'Erro ao sincronizar vendedores com OMIE' });
  }
});

export default router;
