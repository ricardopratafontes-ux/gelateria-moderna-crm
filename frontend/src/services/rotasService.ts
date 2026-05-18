import api from './api';

export const rotasService = {
  async buscarRotaDoDia(data: string) {
    const response = await api.get(`/rotas/dia/${data}`);
    return response.data;
  },

  async planejarRota(vendedor_id: string, data_rota: string) {
    const response = await api.post('/rotas/planejar', { vendedor_id, data_rota });
    return response.data;
  }
};
