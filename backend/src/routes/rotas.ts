import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { googleMapsService } from '../services/googleMapsService';
import { whatsappService } from '../services/whatsappService';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/rotas/planejar - Planejar rota do dia
router.post('/planejar', auth, async (req, res) => {
  try {
    const { vendedor_id, data_rota } = req.body;

    // 1. Buscar vendedor
    const vendedor = await prisma.vendedor.findUnique({
      where: { id: vendedor_id }
    });

    if (!vendedor) {
      return res.status(404).json({ error: 'Vendedor nao encontrado' });
    }

    // 2. Buscar clientes ativos
    const clientes = await prisma.cliente.findMany({
      where: {
        status: 'ativo'
      },
      orderBy: {
        ultima_visita: 'asc'
      }
    });

    // 3. Calcular prioridade de cada cliente
    const clientes_com_prioridade = clientes.map((cliente) => {
      const dias_sem_visita = cliente.ultima_visita
        ? Math.floor((Date.now() - cliente.ultima_visita.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const prioridade =
        dias_sem_visita * 0.5 +
        Number(cliente.media_mensal_historica || 0) * 0.3 +
        (cliente.segmento === 'RESTAURANTE' ? 20 : 0);

      return { ...cliente, dias_sem_visita, prioridade };
    });

    // 4. Ordenar por prioridade e limitar a 15
    clientes_com_prioridade.sort((a, b) => b.prioridade - a.prioridade);
    const clientes_rota = clientes_com_prioridade.slice(0, 15);

    // 5. Otimizar rota com Google Maps (se tiver coordenadas)
    let rota_otimizada = clientes_rota;
    const clientes_com_coords = clientes_rota.filter(c => c.latitude && c.longitude);

    if (clientes_com_coords.length > 1) {
      try {
        rota_otimizada = await googleMapsService.otimizarRota(clientes_com_coords);
      } catch (err) {
        console.error('Erro ao otimizar rota, usando ordem de prioridade:', err);
      }
    }

    // 6. Calcular distancia total e tempo estimado
    let distancia_total = 0;
    let tempo_total = 0;

    for (let i = 0; i < rota_otimizada.length - 1; i++) {
      if (rota_otimizada[i].latitude && rota_otimizada[i + 1].latitude) {
        try {
          const { distancia_km, duracao_minutos } = await googleMapsService.calcularDistancia(
            Number(rota_otimizada[i].latitude),
            Number(rota_otimizada[i].longitude),
            Number(rota_otimizada[i + 1].latitude),
            Number(rota_otimizada[i + 1].longitude)
          );
          distancia_total += distancia_km;
          tempo_total += duracao_minutos;
        } catch (err) {
          // Se falhar calculo individual, continua
        }
      }
    }

    // 7. Criar rota no banco
    const rota = await prisma.rota.create({
      data: {
        vendedor_id,
        data_rota: new Date(data_rota),
        clientes_sequencia: rota_otimizada.map((cliente, idx) => ({
          cliente_id: cliente.id,
          nome: cliente.nome_fantasia,
          endereco: cliente.endereco,
          telefone: cliente.telefone,
          segmento: cliente.segmento,
          ordem: idx + 1,
          prioridade: cliente.prioridade
        })),
        status: 'planejada',
        distancia_total_km: distancia_total,
        tempo_estimado_minutos: tempo_total + rota_otimizada.length * 40,
        hora_planejamento: new Date()
      }
    });

    // 8. Enviar rota via WhatsApp
    if (vendedor.whatsapp) {
      try {
        await whatsappService.enviarRota(vendedor.whatsapp, rota);
      } catch (err) {
        console.error('Erro ao enviar rota via WhatsApp:', err);
      }
    }

    res.status(201).json(rota);
  } catch (error) {
    console.error('Erro ao planejar rota:', error);
    res.status(500).json({ error: 'Erro ao planejar rota' });
  }
});

// GET /api/rotas/dia/:data - Obter rota do dia
router.get('/dia/:data', auth, async (req, res) => {
  try {
    const { data } = req.params;
    const dataInicio = new Date(data);
    const dataFim = new Date(dataInicio.getTime() + 86400000);

    const rota = await prisma.rota.findFirst({
      where: {
        data_rota: {
          gte: dataInicio,
          lt: dataFim
        }
      },
      include: {
        atividades: true
      }
    });

    if (!rota) {
      return res.status(404).json({ error: 'Rota nao encontrada para esta data' });
    }

    // Contar visitas realizadas
    const visitas_realizadas = rota.atividades.filter(a => a.resultado === 'concluida').length;

    res.json({ ...rota, visitas_realizadas });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter rota' });
  }
});

export default router;
