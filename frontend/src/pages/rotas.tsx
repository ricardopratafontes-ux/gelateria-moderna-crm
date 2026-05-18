import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, LIMITS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

interface Rota {
  id: string;
  vendedor_id: string;
  vendedor?: { nome: string };
  data: string;
  status: string;
  clientes_sequencia: any[];
  visitas_realizadas: number;
  tempo_estimado_minutos?: number;
  distancia_total_km?: number;
  created_at?: string;
}

export const RotasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);

  // Buscar rotas
  const { data: rotas = [], isLoading } = useQuery({
    queryKey: ['rotas', dataSelecionada],
    queryFn: async () => {
      const response = await api.get(`/rotas?data=${dataSelecionada}`);
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // Gerar rota manualmente
  const gerarRota = useMutation({
    mutationFn: async (data: string) => {
      const response = await api.post('/rotas/gerar', { data });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotas'] });
    }
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rotas</h1>
            <p className="text-sm text-gray-600 mt-1">Planejamento e acompanhamento de rotas diárias</p>
          </div>
          <button
            onClick={() => gerarRota.mutate(dataSelecionada)}
            disabled={gerarRota.isPending}
            className="px-4 py-2 text-white rounded-lg font-semibold text-sm"
            style={{ backgroundColor: COLORS.PRIMARY }}
          >
            {gerarRota.isPending ? 'Gerando...' : 'Gerar Rota do Dia'}
          </button>
        </div>

        {/* Seletor de data */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Data:</label>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm text-gray-500">
              Meta: {LIMITS.META_VISITAS_DIA} visitas/dia | Tempo médio: {LIMITS.TEMPO_MEDIO_VISITA_MIN}min/visita
            </span>
          </div>
        </div>

        {/* Rotas do dia */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando rotas...</div>
        ) : (rotas as Rota[]).length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-gray-500 text-lg">Nenhuma rota para esta data</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Gerar Rota do Dia" para criar automaticamente</p>
          </div>
        ) : (
          (rotas as Rota[]).map((rota) => (
            <div key={rota.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Header da rota */}
              <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: `${COLORS.PRIMARY}10` }}>
                <div>
                  <h3 className="font-bold text-gray-900">{rota.vendedor?.nome || 'Vendedor'}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(rota.data).toLocaleDateString('pt-BR')} |
                    {rota.clientes_sequencia?.length || 0} paradas |
                    {rota.tempo_estimado_minutos || 0}min estimados |
                    {rota.distancia_total_km?.toFixed(1) || 0}km
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: COLORS.PRIMARY }}>
                    {rota.visitas_realizadas}/{rota.clientes_sequencia?.length || 0}
                  </p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${rota.status === 'concluida' ? 'bg-green-100 text-green-800' : rota.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {rota.status?.replace('_', ' ') || 'pendente'}
                  </span>
                </div>
              </div>

              {/* Lista de clientes na rota */}
              <div className="divide-y">
                {rota.clientes_sequencia?.map((cliente: any, idx: number) => (
                  <div key={idx} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: cliente.visitado ? '#22c55e' : COLORS.PRIMARY }}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cliente.nome}</p>
                      <p className="text-sm text-gray-600">{cliente.endereco}</p>
                    </div>
                    <div className="text-right">
                      {cliente.segmento && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{cliente.segmento}</span>
                      )}
                      {cliente.visitado && (
                        <p className="text-xs text-green-600 font-semibold mt-1">Visitado</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
};

export default RotasPage;
