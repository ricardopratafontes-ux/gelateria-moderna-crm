// Cores da marca
export const COLORS = {
  PRIMARY: '#f31c40',
  SECONDARY: '#c9e7bd',
  TERTIARY: '#98472d',
  BACKGROUND: '#fffaf2',
  WHITE: '#ffffff',
  BLACK: '#000000'
};

// Metas e limites
export const LIMITS = {
  META_VISITAS_DIA: 10,
  TEMPO_MEDIO_VISITA_MIN: 40,
  RAIO_DESVIO_ROTA_M: 500,
  PRAZO_RETORNO_LEAD_H: 48,
  DIAS_SEM_VISITA_ALERTA: 7
};

// Frequência de visitas por segmento (dias)
export const FREQUENCIA_IDEAL: Record<string, number> = {
  RESTAURANTE: 3,
  SUPERMERCADO: 7,
  PADARIA: 5,
  HOTEL: 5,
  EVENTO: 14,
  COLEGIO: 30
};

// Comissões (%)
export const COMISSOES = {
  NOVO_CLIENTE: 5,
  PERFORMANCE: 3,
  EVENTO: 10,
  EXPANSAO_CANAL: 5,
  PREMIO_10_CLIENTES: 300
};

// API URL
export const API_URL = import.meta.env.VITE_API_URL || '/api';
