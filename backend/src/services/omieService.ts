import axios from 'axios';

const OMIE_API = axios.create({
  baseURL: 'https://app.omie.com.br/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Helper para chamadas OMIE com retry inteligente (respeita rate limit)
async function chamarOmie(endpoint: string, call: string, param: any[], tentativas = 3): Promise<any> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const response = await OMIE_API.post(endpoint, {
        call,
        app_key: process.env.OMIE_API_KEY,
        app_secret: process.env.OMIE_APP_SECRET,
        param
      });
      return response.data;
    } catch (error: any) {
      const faultstring = error?.response?.data?.faultstring || '';
      const isRateLimit = faultstring.includes('REDUNDANT') || faultstring.includes('redundante');

      if (isRateLimit && i < tentativas - 1) {
        // Extrair tempo de espera da mensagem OMIE (ex: "Aguarde 37 segundos")
        const match = faultstring.match(/Aguarde (\d+) segundo/);
        const waitTime = match ? (parseInt(match[1]) + 2) * 1000 : 40000;
        console.log(`[OMIE] Rate limit - aguardando ${waitTime/1000}s antes de retry ${i+1}/${tentativas-1}`);
        await new Promise(r => setTimeout(r, waitTime));
      } else if (i < tentativas - 1) {
        // Outros erros - retry com delay menor
        await new Promise(r => setTimeout(r, 3000));
      } else {
        throw error;
      }
    }
  }
}

export const omieService = {

  // ============================================================
  // BUSCAR CLIENTE ESPECÍFICO POR CÓDIGO OMIE
  // Usado no sync seletivo - busca apenas clientes que já estão no CRM
  // ============================================================
  async buscarClientePorCodigo(codigo_cliente_omie: string) {
    try {
      const data = await chamarOmie('/geral/clientes/', 'ConsultarCliente', [
        { codigo_cliente_omie: parseInt(codigo_cliente_omie) }
      ]);
      return data;
    } catch (error: any) {
      if (error?.response?.data?.faultstring?.includes('não localizado')) {
        return null;
      }
      console.error(`Erro ao buscar cliente OMIE ${codigo_cliente_omie}:`, error?.response?.data || error.message);
      return null;
    }
  },

  // ============================================================
  // BUSCAR CLIENTE POR NOME FANTASIA
  // Usado para mapear os 52 clientes da planilha aos códigos OMIE
  // ============================================================
  async buscarClientePorNome(nome_fantasia: string) {
    try {
      const data = await chamarOmie('/geral/clientes/', 'ListarClientes', [
        {
          pagina: 1,
          registros_por_pagina: 10,
          clientesFiltro: {
            nome_fantasia_like: nome_fantasia
          }
        }
      ]);
      return data?.clientes_cadastro || [];
    } catch (error: any) {
      const faultstring = error?.response?.data?.faultstring || '';
      const faultcode = error?.response?.data?.faultcode || '';
      // Se for rate limit ou bloqueio por uso indevido, propagar o erro
      if (faultstring.includes('REDUNDANT') || faultstring.includes('redundante') || faultcode === 'MISUSE_API_PROCESS' || faultstring.includes('bloqueada')) {
        console.error(`[OMIE] Rate limit/bloqueio ao buscar "${nome_fantasia}": ${faultstring}`);
        throw error;
      }
      // Se nao encontrou registros (erro normal da OMIE), retorna vazio
      if (faultstring.includes('não localizado') || faultstring.includes('Nenhum registro')) {
        return [];
      }
      console.error(`Erro ao buscar cliente por nome "${nome_fantasia}":`, error?.response?.data || error.message);
      return [];
    }
  },

  // ============================================================
  // BUSCAR PEDIDOS DE UM CLIENTE ESPECÍFICO
  // Sincroniza apenas pedidos dos nossos 52 clientes
  // ============================================================
  async buscarPedidosCliente(codigo_cliente_omie: string, pagina = 1) {
    try {
      const data = await chamarOmie('/produtos/pedido/', 'ListarPedidos', [
        {
          pagina,
          registros_por_pagina: 50,
          filtrar_por_cliente: parseInt(codigo_cliente_omie)
        }
      ]);
      return {
        pedidos: data?.pedido_venda_produto || [],
        total_paginas: data?.total_de_paginas || 1,
        total_registros: data?.total_de_registros || 0
      };
    } catch (error: any) {
      console.error(`Erro ao buscar pedidos cliente ${codigo_cliente_omie}:`, error?.response?.data || error.message);
      return { pedidos: [], total_paginas: 1, total_registros: 0 };
    }
  },

  // ============================================================
  // CONSULTAR STATUS DE UM PEDIDO ESPECÍFICO
  // ============================================================
  async consultarPedido(numero_pedido: string) {
    try {
      const data = await chamarOmie('/produtos/pedido/', 'ConsultarPedido', [
        { numero_pedido }
      ]);
      return data;
    } catch (error: any) {
      console.error(`Erro ao consultar pedido ${numero_pedido}:`, error?.response?.data || error.message);
      return null;
    }
  },

  // ============================================================
  // BUSCAR ETAPA DO PEDIDO (separação, faturamento, entrega, recebimento)
  // ============================================================
  async buscarEtapaPedido(codigo_pedido: number) {
    try {
      const data = await chamarOmie('/produtos/pedido/', 'StatusPedido', [
        { codigo_pedido }
      ]);
      return data;
    } catch (error: any) {
      // Se não encontrou, retorna null
      if (error?.response?.data?.faultstring?.includes('não localizado')) {
        return null;
      }
      console.error(`Erro ao buscar etapa pedido ${codigo_pedido}:`, error?.response?.data || error.message);
      return null;
    }
  },

  // ============================================================
  // BUSCAR CONTAS A RECEBER DE UM CLIENTE
  // Para rastrear recebimentos e disparar comissões
  // ============================================================
  async buscarContasReceberCliente(codigo_cliente_omie: string) {
    try {
      const data = await chamarOmie('/financas/contareceber/', 'ListarContasReceber', [
        {
          pagina: 1,
          registros_por_pagina: 50,
          filtrar_cliente: parseInt(codigo_cliente_omie)
        }
      ]);
      return data?.conta_receber_cadastro || [];
    } catch (error: any) {
      console.error(`Erro ao buscar contas a receber cliente ${codigo_cliente_omie}:`, error?.response?.data || error.message);
      return [];
    }
  },

  // ============================================================
  // BUSCAR MÚLTIPLOS CLIENTES POR CÓDIGOS OMIE (1 chamada!)
  // Usado no sync seletivo - busca apenas os clientes do CRM
  // Usa filtro clientesPorCodigo para evitar 52 chamadas individuais
  // ============================================================
  async buscarClientesPorCodigos(codigos: string[]): Promise<any[]> {
    if (codigos.length === 0) return [];

    const todosClientes: any[] = [];

    // OMIE pagina resultados - precisamos iterar páginas
    // Enviamos todos os códigos de uma vez, OMIE filtra internamente
    const codigosFormatados = codigos.map(c => ({ codigo_cliente_omie: parseInt(c) }));

    let pagina = 1;
    let totalPaginas = 1;

    do {
      try {
        const data = await chamarOmie('/geral/clientes/', 'ListarClientes', [
          {
            pagina,
            registros_por_pagina: 50,
            clientesPorCodigo: codigosFormatados
          }
        ]);

        const clientes = data?.clientes_cadastro || [];
        todosClientes.push(...clientes);
        totalPaginas = data?.total_de_paginas || 1;
        pagina++;
      } catch (error: any) {
        const faultstring = error?.response?.data?.faultstring || '';
        // Se não encontrou nenhum registro, retorna o que já tem
        if (faultstring.includes('não localizado') || faultstring.includes('Nenhum registro')) {
          break;
        }
        throw error;
      }
    } while (pagina <= totalPaginas);

    return todosClientes;
  },

  // ============================================================
  // LISTAR TODOS OS CLIENTES (paginado) - usado apenas para mapeamento inicial
  // NÃO usar no sync diário!
  // ============================================================
  async listarTodosClientes(pagina = 1) {
    try {
      const data = await chamarOmie('/geral/clientes/', 'ListarClientes', [
        {
          pagina,
          registros_por_pagina: 50
        }
      ]);
      return {
        clientes: data?.clientes_cadastro || [],
        total_paginas: data?.total_de_paginas || 1,
        total_registros: data?.total_de_registros || 0
      };
    } catch (error: any) {
      console.error('Erro ao listar todos clientes OMIE:', error?.response?.data || error.message);
      return { clientes: [], total_paginas: 1, total_registros: 0 };
    }
  }
};
