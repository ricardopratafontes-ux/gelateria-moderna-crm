import api from './api';

export const comissoesService = {
  async listar(params?: {
    vendedor_id?: string;
    mes?: number;
    ano?: number;
    tipo?: string;
    status?: string;
  }) {
    const response = await api.get('/comissoes', { params });
    return response.data;
  },

  async buscarMesVendedor(vendedor_id: string, mes?: number, ano?: number) {
    const response = await api.get(`/comissoes/vendedor/${vendedor_id}/mes`, {
      params: { mes, ano }
    });
    return response.data;
  },

  async marcarPaga(id: string) {
    const response = await api.put(`/comissoes/${id}/pagar`);
    return response.data;
  },

  async pagarLote(ids: string[]) {
    const response = await api.put('/comissoes/pagar-lote', { ids });
    return response.data;
  }
};
