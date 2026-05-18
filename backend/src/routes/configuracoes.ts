import express from 'express';
import { PrismaClient } from '@prisma/client';
import { configService } from '../services/configService';

const router = express.Router();
const prisma = new PrismaClient();

// Valores padrão das configurações
const DEFAULTS: Record<string, { valor: string; descricao: string }> = {
  // Alertas - ativar/desativar
  'alerta_lead_risco_ativo': { valor: 'true', descricao: 'Alerta quando lead passa 48h sem contato' },
  'alerta_vendedor_parado_ativo': { valor: 'true', descricao: 'Alerta quando vendedor fica sem atividade' },
  'alerta_meta_diaria_ativo': { valor: 'true', descricao: 'Alerta quando meta diária está em risco (após 15h)' },
  'alerta_progresso_meiodia_ativo': { valor: 'true', descricao: 'Resumo de progresso ao meio-dia' },
  'alerta_resumo_fim_dia_ativo': { valor: 'true', descricao: 'Resumo completo no fim do dia' },
  'relatorio_semanal_ativo': { valor: 'true', descricao: 'Relatório semanal automático (sábado)' },
  'relatorio_mensal_ativo': { valor: 'true', descricao: 'Relatório mensal automático (dia 5)' },
  'rota_diaria_ativo': { valor: 'true', descricao: 'Planejamento automático de rota diária' },

  // Horários dos jobs
  'horario_rota_diaria': { valor: '07:00', descricao: 'Horário do planejamento de rota (HH:MM)' },
  'horario_alerta_meiodia': { valor: '11:59', descricao: 'Horário do alerta meio-dia (HH:MM)' },
  'horario_alerta_fimdia': { valor: '17:00', descricao: 'Horário do alerta fim do dia (HH:MM)' },
  'horario_relatorio_semanal': { valor: '09:00', descricao: 'Horário do relatório semanal - sábado (HH:MM)' },
  'horario_relatorio_mensal': { valor: '08:00', descricao: 'Horário do relatório mensal - dia 5 (HH:MM)' },
  'intervalo_alertas_min': { valor: '15', descricao: 'Intervalo entre verificações de alertas (minutos)' },

  // Destinatários
  'whatsapp_gerente': { valor: '', descricao: 'WhatsApp do gerente (recebe alertas e relatórios)' },
  'whatsapp_grupo': { valor: '', descricao: 'WhatsApp do grupo (opcional, recebe relatórios)' },

  // Limites e metas
  'meta_visitas_dia': { valor: '10', descricao: 'Meta de visitas por vendedor por dia' },
  'prazo_retorno_lead_horas': { valor: '48', descricao: 'Prazo máximo para contatar lead (horas)' },
  'dias_sem_visita_alerta': { valor: '7', descricao: 'Dias sem visita para disparar alerta' },
  'tempo_vendedor_parado_min': { valor: '60', descricao: 'Minutos sem atividade para alertar vendedor parado' },
  'raio_desvio_rota_metros': { valor: '500', descricao: 'Raio de desvio da rota (metros)' },

  // Rate limit WhatsApp
  'whatsapp_delay_segundos': { valor: '6', descricao: 'Delay entre mensagens WhatsApp (segundos)' },
};

// GET /api/configuracoes - Listar todas as configurações
router.get('/', async (_req, res) => {
  try {
    // Buscar do banco
    const parametros = await prisma.parametro.findMany({
      orderBy: { chave: 'asc' }
    });

    // Mesclar com defaults (parâmetros que não existem no banco recebem valor padrão)
    const configMap: Record<string, any> = {};

    // Primeiro, preencher com defaults
    for (const [chave, def] of Object.entries(DEFAULTS)) {
      configMap[chave] = {
        chave,
        valor: def.valor,
        descricao: def.descricao,
        salvo: false // Indica que está usando valor padrão
      };
    }

    // Sobrescrever com valores do banco
    for (const p of parametros) {
      configMap[p.chave] = {
        chave: p.chave,
        valor: p.valor || '',
        descricao: p.descricao || DEFAULTS[p.chave]?.descricao || '',
        salvo: true,
        updated_at: p.updated_at
      };
    }

    res.json(Object.values(configMap));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/configuracoes - Salvar múltiplas configurações
router.put('/', async (req, res) => {
  try {
    const configs: { chave: string; valor: string }[] = req.body.configuracoes || [];

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ error: 'Envie { configuracoes: [{ chave, valor }] }' });
    }

    const resultados = [];

    for (const { chave, valor } of configs) {
      const descricao = DEFAULTS[chave]?.descricao || '';

      const resultado = await prisma.parametro.upsert({
        where: { chave },
        update: { valor, descricao },
        create: { chave, valor, descricao }
      });

      resultados.push(resultado);
    }

    // Invalidar cache para que jobs usem valores novos
    configService.invalidarCache();

    res.json({ success: true, atualizados: resultados.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/configuracoes/:chave - Buscar uma configuração específica
router.get('/:chave', async (req, res) => {
  try {
    const parametro = await prisma.parametro.findUnique({
      where: { chave: req.params.chave }
    });

    if (parametro) {
      res.json(parametro);
    } else if (DEFAULTS[req.params.chave]) {
      res.json({
        chave: req.params.chave,
        valor: DEFAULTS[req.params.chave].valor,
        descricao: DEFAULTS[req.params.chave].descricao,
        salvo: false
      });
    } else {
      res.status(404).json({ error: 'Configuração não encontrada' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
