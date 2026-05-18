import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { omieService } from '../services/omieService';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/clientes - Listar todos os clientes
// Retorna array direto (frontend espera isso)
// Use ?page=X&limit=Y para paginação (retorna { data, pagination })
router.get('/', auth, async (req, res) => {
  try {
    const { segmento, status, page, limit = 100 } = req.query;

    const where: any = {};
    if (segmento) where.segmento = segmento;
    if (status) where.status = status;

    const clientes = await prisma.cliente.findMany({
      where,
      skip: page ? (Number(page) - 1) * Number(limit) : 0,
      take: Number(limit),
      orderBy: { nome_fantasia: 'asc' }
    });

    // Se paginação explícita, retorna objeto com metadata
    if (page) {
      const total = await prisma.cliente.count({ where });
      return res.json({
        data: clientes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    }

    // Sem paginação, retorna array direto (compatibilidade frontend)
    res.json(clientes);
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

// ============================================================
// POST /api/clientes/importar - Importar clientes em lote (da planilha)
// ============================================================
router.post('/importar', auth, async (req, res) => {
  try {
    const { clientes } = req.body;

    if (!Array.isArray(clientes) || clientes.length === 0) {
      return res.status(400).json({ error: 'Envie um array de clientes' });
    }

    const resultados = { criados: 0, atualizados: 0, erros: [] as string[] };

    for (const c of clientes) {
      try {
        // Verificar se já existe pelo nome
        const existente = await prisma.cliente.findFirst({
          where: {
            nome_fantasia: { equals: c.nome_fantasia, mode: 'insensitive' }
          }
        });

        if (existente) {
          // Atualizar dados
          await prisma.cliente.update({
            where: { id: existente.id },
            data: {
              segmento: c.segmento || existente.segmento,
              media_mensal_historica: c.media_mensal || existente.media_mensal_historica,
              total_vendas_historico: c.total_vendas || existente.total_vendas_historico,
              omie_codigo: c.omie_codigo || existente.omie_codigo,
              observacoes: c.observacoes || existente.observacoes
            }
          });
          resultados.atualizados++;
        } else {
          // Criar novo
          await prisma.cliente.create({
            data: {
              nome_fantasia: c.nome_fantasia,
              segmento: c.segmento,
              media_mensal_historica: c.media_mensal || null,
              total_vendas_historico: c.total_vendas || null,
              omie_codigo: c.omie_codigo || null,
              origem: 'planilha',
              status: 'ativo',
              observacoes: c.observacoes || null
            }
          });
          resultados.criados++;
        }
      } catch (err: any) {
        resultados.erros.push(`${c.nome_fantasia}: ${err.message}`);
      }
    }

    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao importar clientes' });
  }
});

// ============================================================
// POST /api/clientes/mapear-omie - Buscar códigos OMIE por nome para todos os clientes
// Busca cada cliente no OMIE pela API e salva o código encontrado
// ============================================================
router.post('/mapear-omie', auth, async (req, res) => {
  try {
    // Buscar clientes que NÃO têm código OMIE ainda
    const clientesSemOmie = await prisma.cliente.findMany({
      where: {
        OR: [
          { omie_codigo: null },
          { omie_codigo: '' }
        ],
        status: 'ativo'
      }
    });

    if (clientesSemOmie.length === 0) {
      return res.json({ message: 'Todos os clientes já têm código OMIE', mapeados: 0 });
    }

    const resultados = {
      mapeados: 0,
      nao_encontrados: [] as string[],
      multiplos: [] as { nome: string, opcoes: any[] }[],
      erros: [] as string[]
    };

    for (const cliente of clientesSemOmie) {
      try {
        // Buscar no OMIE pelo nome fantasia
        const resultadosOmie = await omieService.buscarClientePorNome(cliente.nome_fantasia);

        if (resultadosOmie.length === 0) {
          resultados.nao_encontrados.push(cliente.nome_fantasia);
        } else if (resultadosOmie.length === 1) {
          // Match único - salvar código
          await prisma.cliente.update({
            where: { id: cliente.id },
            data: {
              omie_codigo: String(resultadosOmie[0].codigo_cliente_omie),
              cnpj: resultadosOmie[0].cnpj_cpf || cliente.cnpj,
              telefone: resultadosOmie[0].telefone1_numero || cliente.telefone,
              email: resultadosOmie[0].email || cliente.email
            }
          });
          resultados.mapeados++;
        } else {
          // Múltiplos resultados - precisa resolver manualmente
          resultados.multiplos.push({
            nome: cliente.nome_fantasia,
            opcoes: resultadosOmie.map(r => ({
              codigo_omie: r.codigo_cliente_omie,
              nome_fantasia: r.nome_fantasia,
              razao_social: r.razao_social,
              cnpj: r.cnpj_cpf
            }))
          });
        }

        // Rate limit OMIE
        await new Promise(r => setTimeout(r, 1000));

      } catch (err: any) {
        resultados.erros.push(`${cliente.nome_fantasia}: ${err.message}`);
      }
    }

    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao mapear clientes OMIE' });
  }
});

// ============================================================
// PUT /api/clientes/:id/omie-codigo - Definir código OMIE manualmente
// ============================================================
router.put('/:id/omie-codigo', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { omie_codigo } = req.body;

    if (!omie_codigo) {
      return res.status(400).json({ error: 'omie_codigo é obrigatório' });
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: { omie_codigo: String(omie_codigo) }
    });

    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao definir código OMIE' });
  }
});

export default router;
