import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { googleMapsService } from '../services/googleMapsService';
import { whatsappService } from '../services/whatsappService';

const prisma = new PrismaClient();

// FREQUÊNCIA IDEAL DE VISITA POR SEGMENTO (dias)
const FREQUENCIA_IDEAL: Record<string, number> = {
  RESTAURANTE: 3,
  SUPERMERCADO: 7,
  PADARIA: 5,
  HOTEL: 5,
  EVENTO: 14,
  COLEGIO: 30
};

export function iniciarPlanejamentoRotaDiaria() {
  // Executa todos os dias às 7h
  cron.schedule('0 7 * * *', async () => {
    console.log('[JOB] Planejamento de rota diária iniciado');
    try {
      await planejarRotaDoDia();
    } catch (error) {
      console.error('[JOB] Erro no planejamento de rota:', error);
    }
  });
}

async function planejarRotaDoDia() {
  // 1. Buscar todos os vendedores ativos
  const vendedores = await prisma.vendedor.findMany({
    where: { status: 'ativo' }
  });

  for (const vendedor of vendedores) {
    try {
      await planejarRotaVendedor(vendedor);
    } catch (error) {
      console.error(`[JOB] Erro ao planejar rota para vendedor ${vendedor.nome}:`, error);
    }
  }
}

async function planejarRotaVendedor(vendedor: any) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Verificar se já existe rota para hoje
  const rotaExistente = await prisma.rota.findFirst({
    where: {
      vendedor_id: vendedor.id,
      data_rota: {
        gte: hoje,
        lt: new Date(hoje.getTime() + 86400000)
      }
    }
  });

  if (rotaExistente) {
    console.log(`[JOB] Rota já existe para ${vendedor.nome} hoje`);
    return;
  }

  // 2. Buscar clientes ativos
  const clientes = await prisma.cliente.findMany({
    where: { status: 'ativo' }
  });

  // 3. Calcular prioridade de cada cliente
  const clientesComPrioridade = clientes.map((cliente) => {
    const diasSemVisita = cliente.ultima_visita
      ? Math.floor((Date.now() - cliente.ultima_visita.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const frequenciaIdeal = FREQUENCIA_IDEAL[cliente.segmento || 'RESTAURANTE'] || 7;
    const atraso = Math.max(0, diasSemVisita - frequenciaIdeal);

    // Fórmula de prioridade: atraso + valor médio + bonus segmento
    const prioridade =
      atraso * 2 +
      Number(cliente.media_mensal_customizada || cliente.media_mensal_historica || 0) * 0.3 +
      (cliente.segmento === 'RESTAURANTE' ? 20 : 0) +
      (cliente.segmento === 'HOTEL' ? 15 : 0);

    return { ...cliente, diasSemVisita, prioridade };
  });

  // 4. Ordenar por prioridade e selecionar top 12-15
  clientesComPrioridade.sort((a, b) => b.prioridade - a.prioridade);
  const clientesSelecionados = clientesComPrioridade.slice(0, 12);

  if (clientesSelecionados.length === 0) {
    console.log(`[JOB] Nenhum cliente para rota de ${vendedor.nome}`);
    return;
  }

  // 5. Otimizar rota com Google Maps
  let rotaOtimizada = clientesSelecionados;
  const clientesComCoords = clientesSelecionados.filter(c => c.latitude && c.longitude);

  if (clientesComCoords.length > 1) {
    try {
      rotaOtimizada = await googleMapsService.otimizarRota(clientesComCoords);
    } catch (err) {
      console.error('[JOB] Erro ao otimizar rota, usando ordem de prioridade:', err);
    }
  }

  // 6. Calcular distância total
  let distanciaTotal = 0;
  let tempoTotal = 0;

  for (let i = 0; i < rotaOtimizada.length - 1; i++) {
    if (rotaOtimizada[i].latitude && rotaOtimizada[i + 1].latitude) {
      try {
        const { distancia_km, duracao_minutos } = await googleMapsService.calcularDistancia(
          Number(rotaOtimizada[i].latitude),
          Number(rotaOtimizada[i].longitude),
          Number(rotaOtimizada[i + 1].latitude),
          Number(rotaOtimizada[i + 1].longitude)
        );
        distanciaTotal += distancia_km;
        tempoTotal += duracao_minutos;
      } catch (err) {
        // Continua sem distância individual
      }
    }
  }

  // 7. Criar rota no banco
  const rota = await prisma.rota.create({
    data: {
      vendedor_id: vendedor.id,
      data_rota: hoje,
      clientes_sequencia: rotaOtimizada.map((cliente, idx) => ({
        cliente_id: cliente.id,
        nome: cliente.nome_fantasia,
        endereco: cliente.endereco,
        telefone: cliente.telefone,
        segmento: cliente.segmento,
        ordem: idx + 1,
        prioridade: cliente.prioridade,
        dias_sem_visita: cliente.diasSemVisita
      })),
      status: 'planejada',
      distancia_total_km: distanciaTotal,
      tempo_estimado_minutos: tempoTotal + rotaOtimizada.length * 40,
      hora_planejamento: new Date()
    }
  });

  // 8. Enviar rota via WhatsApp
  if (vendedor.whatsapp) {
    try {
      await whatsappService.enviarRota(vendedor.whatsapp, rota);
      console.log(`[JOB] Rota enviada para ${vendedor.nome} via WhatsApp`);
    } catch (err) {
      console.error(`[JOB] Erro ao enviar rota WhatsApp para ${vendedor.nome}:`, err);
    }
  }

  console.log(`[JOB] Rota planejada para ${vendedor.nome}: ${rotaOtimizada.length} clientes, ${distanciaTotal.toFixed(1)}km`);
}
