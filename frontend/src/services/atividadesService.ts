import api from './api';

export const atividadesService = {
  async iniciar(dados: {
    vendedor_id: string;
    cliente_id: string;
    rota_id?: string;
    tipo: string;
    latitude?: number;
    longitude?: number;
  }) {
    const response = await api.post('/atividades', dados);
    return response.data;
  },

  async concluir(id: string, dados: {
    resultado: string;
    observacoes?: string;
    fotos?: string[];
    latitude_fim?: number;
    longitude_fim?: number;
    valor_pedido?: number;
  }) {
    const response = await api.put(`/atividades/${id}/concluir`, dados);
    return response.data;
  },

  async buscarHoje(vendedor_id: string) {
    const response = await api.get(`/atividades/hoje/${vendedor_id}`);
    return response.data;
  },

  async historico(params?: {
    vendedor_id?: string;
    cliente_id?: string;
    data_inicio?: string;
    data_fim?: string;
    pagina?: number;
  }) {
    const response = await api.get('/atividades/historico', { params });
    return response.data;
  }
};
