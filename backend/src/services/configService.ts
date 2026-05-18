import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cache de configurações (recarrega a cada 5 minutos)
let cache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Defaults idênticos ao configuracoes.ts (fonte única de verdade)
const DEFAULTS: Record<string, string> = {
  'alerta_lead_risco_ativo': 'true',
  'alerta_vendedor_parado_ativo': 'true',
  'alerta_meta_diaria_ativo': 'true',
  'alerta_progresso_meiodia_ativo': 'true',
  'alerta_resumo_fim_dia_ativo': 'true',
  'relatorio_semanal_ativo': 'true',
  'relatorio_mensal_ativo': 'true',
  'rota_diaria_ativo': 'true',
  'horario_rota_diaria': '07:00',
  'horario_alerta_meiodia': '11:59',
  'horario_alerta_fimdia': '17:00',
  'horario_relatorio_semanal': '09:00',
  'horario_relatorio_mensal': '08:00',
  'intervalo_alertas_min': '15',
  'whatsapp_gerente': '',
  'whatsapp_grupo': '',
  'meta_visitas_dia': '10',
  'prazo_retorno_lead_horas': '48',
  'dias_sem_visita_alerta': '7',
  'tempo_vendedor_parado_min': '60',
  'raio_desvio_rota_metros': '500',
  'whatsapp_delay_segundos': '6',
};

async function carregarCache(): Promise<void> {
  const agora = Date.now();
  if (agora - cacheTimestamp < CACHE_TTL_MS && Object.keys(cache).length > 0) {
    return; // Cache ainda válido
  }

  try {
    const parametros = await prisma.parametro.findMany();
    const novoCache: Record<string, string> = { ...DEFAULTS };
    for (const p of parametros) {
      if (p.valor) novoCache[p.chave] = p.valor;
    }
    cache = novoCache;
    cacheTimestamp = agora;
  } catch (error) {
    console.error('[CONFIG] Erro ao carregar configurações, usando defaults:', error);
    if (Object.keys(cache).length === 0) {
      cache = { ...DEFAULTS };
    }
  }
}

export const configService = {
  async getString(chave: string): Promise<string> {
    await carregarCache();
    return cache[chave] ?? DEFAULTS[chave] ?? '';
  },

  async getNumber(chave: string): Promise<number> {
    const valor = await this.getString(chave);
    return Number(valor) || 0;
  },

  async getBool(chave: string): Promise<boolean> {
    const valor = await this.getString(chave);
    return valor === 'true';
  },

  // Força recarregar cache (útil após salvar configurações)
  invalidarCache(): void {
    cacheTimestamp = 0;
  }
};
