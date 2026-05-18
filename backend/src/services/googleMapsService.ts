import axios from 'axios';

const GOOGLE_MAPS_API = axios.create({
  baseURL: 'https://maps.googleapis.com/maps/api'
});

export const googleMapsService = {
  // CALCULAR DISTANCIA ENTRE PONTOS
  async calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
    try {
      const response = await GOOGLE_MAPS_API.get('/distancematrix/json', {
        params: {
          origins: `${lat1},${lon1}`,
          destinations: `${lat2},${lon2}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
          units: 'metric'
        }
      });

      const distancia_metros = response.data.rows[0].elements[0].distance.value;
      const duracao_segundos = response.data.rows[0].elements[0].duration.value;

      return {
        distancia_km: distancia_metros / 1000,
        duracao_minutos: Math.ceil(duracao_segundos / 60)
      };
    } catch (error) {
      console.error('Erro ao calcular distancia:', error);
      throw error;
    }
  },

  // OTIMIZAR ROTA (Traveling Salesman Problem - Greedy)
  async otimizarRota(clientes: any[]) {
    try {
      const origins = clientes.map((c) => `${c.latitude},${c.longitude}`).join('|');
      const destinations = origins;

      const response = await GOOGLE_MAPS_API.get('/distancematrix/json', {
        params: {
          origins,
          destinations,
          key: process.env.GOOGLE_MAPS_API_KEY,
          units: 'metric'
        }
      });

      // Algoritmo greedy: comecar do primeiro e sempre ir para o mais proximo
      const matriz = response.data.rows;
      const visitados = new Set<number>();
      const rota_otimizada: any[] = [];
      let cliente_atual = 0;

      visitados.add(cliente_atual);
      rota_otimizada.push(clientes[cliente_atual]);

      while (visitados.size < clientes.length) {
        let proximo_cliente = -1;
        let menor_distancia = Infinity;

        for (let i = 0; i < clientes.length; i++) {
          if (!visitados.has(i)) {
            const distancia = matriz[cliente_atual].elements[i].distance.value;
            if (distancia < menor_distancia) {
              menor_distancia = distancia;
              proximo_cliente = i;
            }
          }
        }

        if (proximo_cliente !== -1) {
          visitados.add(proximo_cliente);
          rota_otimizada.push(clientes[proximo_cliente]);
          cliente_atual = proximo_cliente;
        }
      }

      return rota_otimizada;
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      throw error;
    }
  },

  // GEOCODIFICAR ENDERECO
  async geocodificar(endereco: string) {
    try {
      const response = await GOOGLE_MAPS_API.get('/geocode/json', {
        params: {
          address: endereco,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry.location;
        return { latitude: lat, longitude: lng };
      }

      throw new Error('Endereco nao encontrado');
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      throw error;
    }
  }
};
