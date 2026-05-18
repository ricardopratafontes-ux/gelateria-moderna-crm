import api from './api';

export const clientesService = {
  async listar(params?: { pagina?: number; segmento?: string; status?: string }) {
    const response = await api.get('/clientes', { params });
    return response.data;
  },

  async buscarPorId(id: string) {
    const response = await api.get(`/clientes/${id}`);
    return response.data;
  },

  async criar(dados: any) {
    const response = await api.post('/clientes', dados);
    return response.data;
  },

  async atualizar(id: string, dados: any) {
    const response = await api.put(`/clientes/${id}`, dados);
    return response.data;
  },

  async deletar(id: string) {
    const response = await api.delete(`/clientes/${id}`);
    return response.data;
  }
};
