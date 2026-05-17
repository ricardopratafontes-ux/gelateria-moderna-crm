import axios from 'axios';

const OMIE_API = axios.create({
  baseURL: 'https://app.omie.com.br/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const omieService = {
  // BUSCAR CLIENTES DO OMIE
  async buscarClientes() {
    try {
      const response = await OMIE_API.post('/clientes/', {
        call: 'ListarClientes',
        app_key: process.env.OMIE_API_KEY,
        app_secret: process.env.OMIE_APP_SECRET,
        param: [
          {
            pagina: 1,
            registros_por_pagina: 100
          }
        ]
      });

      return response.data.clientes || [];
    } catch (error) {
      console.error('Erro ao buscar clientes OMIE:', error);
      throw error;
    }
  },

  // BUSCAR VENDAS DO OMIE
  async buscarVendas(data_inicio: string, data_fim: string) {
    try {
      const response = await OMIE_API.post('/pedidos/', {
        call: 'ListarPedidos',
        app_key: process.env.OMIE_API_KEY,
        app_secret: process.env.OMIE_APP_SECRET,
        param: [
          {
            pagina: 1,
            registros_por_pagina: 100,
            data_inicio,
            data_fim
          }
        ]
      });

      return response.data.pedidos || [];
    } catch (error) {
      console.error('Erro ao buscar vendas OMIE:', error);
      throw error;
    }
  },

  // BUSCAR STATUS DE VENDA
  async buscarStatusVenda(pedido_id: string) {
    try {
      const response = await OMIE_API.post('/pedidos/', {
        call: 'ConsultarPedido',
        app_key: process.env.OMIE_API_KEY,
        app_secret: process.env.OMIE_APP_SECRET,
        param: [
          {
            id_pedido: pedido_id
          }
        ]
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar status venda:', error);
      throw error;
    }
  },

  // CRIAR CLIENTE NO OMIE
  async criarCliente(cliente: any) {
    try {
      const response = await OMIE_API.post('/clientes/', {
        call: 'UpsertCliente',
        app_key: process.env.OMIE_API_KEY,
        app_secret: process.env.OMIE_APP_SECRET,
        param: [
          {
            nome_fantasia: cliente.nome_fantasia,
            razao_social: cliente.nome_fantasia,
            endereco: cliente.endereco,
            telefone_1: cliente.telefone,
            email: cliente.email,
            cidade: 'Aracaju',
            estado: 'SE'
          }
        ]
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente OMIE:', error);
      throw error;
    }
  }
};
