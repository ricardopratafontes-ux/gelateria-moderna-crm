import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, LIMITS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';
import { MapaRota } from '../components/MapaRota';
import { useGPS } from '../hooks/useGPS';
import { useAuth } from '../hooks/useAuth';
import { useFotos } from '../hooks/useFotos';

export const AppVendedor: React.FC = () => {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const { posicao, erro: erroGPS, rastreando, obterPosicao, iniciarRastreamento, pararRastreamento, calcularDesvio } = useGPS();
  const { fotos, uploading, capturarFoto, removerFoto, limparFotos } = useFotos(5);
  const [atividade_ativa, setAtividadeAtiva] = useState<any>(null);
  const [tipoAtividade, setTipoAtividade] = useState('venda');
  const [observacoes, setObservacoes] = useState('');
  const [desvioMetros, setDesvioMetros] = useState<number | null>(null);

  // BUSCAR ROTA DO DIA
  const { data: rota, isLoading: rotaLoading } = useQuery({
    queryKey: ['rota', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      try {
        const response = await api.get('/rotas/dia/' + new Date().toISOString().split('T')[0]);
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    }
  });

  // BUSCAR ATIVIDADES DO DIA (para retomar atividade ativa e contar concluídas)
  const { data: atividadesHoje } = useQuery({
    queryKey: ['atividades-hoje'],
    queryFn: async () => {
      if (!usuario?.vendedor_id) return null;
      const response = await api.get(`/atividades/hoje/${usuario.vendedor_id}`);
      return response.data;
    },
    enabled: !!usuario?.vendedor_id
  });

  // Retomar atividade ativa ao carregar
  useEffect(() => {
    if (atividadesHoje?.resumo?.em_andamento) {
      const ativa = atividadesHoje.atividades.find((a: any) => a.id === atividadesHoje.resumo.em_andamento);
      if (ativa) {
        setAtividadeAtiva(ativa);
        iniciarRastreamento();
      }
    }
  }, [atividadesHoje]);

  // Calcular desvio da rota quando posição muda
  useEffect(() => {
    if (posicao && atividade_ativa) {
      // Buscar coordenadas do cliente da atividade na rota
      const clienteRota = rota?.clientes_sequencia?.find(
        (c: any) => c.cliente_id === atividade_ativa.cliente_id
      );
      if (clienteRota?.latitude && clienteRota?.longitude) {
        const dist = calcularDesvio(Number(clienteRota.latitude), Number(clienteRota.longitude));
        setDesvioMetros(dist);
      }
    }
  }, [posicao, atividade_ativa]);

  // INICIAR ATIVIDADE
  const iniciarAtividade = useMutation({
    mutationFn: async (cliente_id: string) => {
      // Capturar GPS antes de iniciar
      let lat = 0, lon = 0;
      try {
        const coords = await obterPosicao();
        lat = coords.latitude;
        lon = coords.longitude;
      } catch (e) {
        console.warn('GPS indisponível, registrando sem coordenadas');
      }

      const response = await api.post('/atividades', {
        vendedor_id: usuario?.vendedor_id,
        rota_id: rota?.id,
        cliente_id,
        tipo: 'visita',
        latitude: lat,
        longitude: lon
      });

      // Iniciar rastreamento contínuo
      iniciarRastreamento();

      setAtividadeAtiva(response.data);
      return response.data;
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || 'Erro ao iniciar atividade';
      alert(msg);
    }
  });

  // CONCLUIR ATIVIDADE
  const concluirAtividade = useMutation({
    mutationFn: async () => {
      if (!atividade_ativa) return;

      const response = await api.put(`/atividades/${atividade_ativa.id}/concluir`, {
        resultado: 'concluida',
        tipo: tipoAtividade,
        observacoes: observacoes || null,
        fotos: fotos,
        latitude_fim: posicao?.latitude || null,
        longitude_fim: posicao?.longitude || null
      });

      // Parar GPS
      pararRastreamento();
      setAtividadeAtiva(null);
      limparFotos();
      setObservacoes('');
      setTipoAtividade('venda');
      setDesvioMetros(null);

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades-hoje'] });
      queryClient.invalidateQueries({ queryKey: ['rota'] });
    },
    onError: (error: any) => {
      alert(error?.response?.data?.error || 'Erro ao concluir atividade');
    }
  });

  // Cancelar atividade (marcar como ausente)
  const cancelarAtividade = useMutation({
    mutationFn: async (resultado: string) => {
      if (!atividade_ativa) return;

      const response = await api.put(`/atividades/${atividade_ativa.id}/concluir`, {
        resultado,
        observacoes: observacoes || null,
        latitude_fim: posicao?.latitude || null,
        longitude_fim: posicao?.longitude || null
      });

      pararRastreamento();
      setAtividadeAtiva(null);
      limparFotos();
      setObservacoes('');
      setDesvioMetros(null);

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades-hoje'] });
    }
  });

  const visitasConcluidas = atividadesHoje?.resumo?.concluidas || 0;

  if (rotaLoading) {
    return <Layout><div className="p-8 text-center">Carregando rota do dia...</div></Layout>;
  }

  return (
    <Layout>
    <div>
      {/* HEADER */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rota do Dia</h1>
            <p className="text-sm text-gray-600 mt-1">
              {rota ? `${rota?.clientes_sequencia?.length || 0} clientes | Meta: ${LIMITS.META_VISITAS_DIA} visitas` : 'Nenhuma rota planejada para hoje'}
            </p>
          </div>
          {/* Indicador GPS */}
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: rastreando ? '#22c55e' : posicao ? '#f59e0b' : '#ef4444' }}
            />
            <span className="text-xs text-gray-500">
              {rastreando ? 'GPS ativo' : posicao ? 'GPS ok' : erroGPS || 'GPS off'}
            </span>
          </div>
        </div>
      </div>

      {/* SEM ROTA PLANEJADA */}
      {!rota && (
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Nenhuma rota para hoje</h2>
          <p className="text-gray-500">A rota diária será gerada automaticamente às 7h.</p>
        </div>
      )}

      {rota && (<>
      {/* CONTADOR DE VISITAS */}
      <div className="bg-white border-b p-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">Visitas realizadas</p>
          <p className="text-3xl font-bold" style={{ color: visitasConcluidas >= LIMITS.META_VISITAS_DIA ? '#22c55e' : COLORS.PRIMARY }}>
            {visitasConcluidas}/{LIMITS.META_VISITAS_DIA}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Tempo estimado</p>
          <p className="text-2xl font-bold text-gray-900">{rota?.tempo_estimado_minutos || 0}min</p>
        </div>
      </div>

      {/* ATIVIDADE ATIVA */}
      {atividade_ativa && (
        <div className="bg-blue-50 border-b p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-semibold text-blue-900">Atividade em andamento</p>
              <p className="text-lg font-bold text-blue-900 mt-1">{atividade_ativa.cliente?.nome_fantasia || atividade_ativa.cliente?.nome || 'Cliente'}</p>
            </div>
            {/* Badge de desvio */}
            {desvioMetros !== null && (
              <span className={`px-2 py-1 rounded text-xs font-bold ${desvioMetros > 500 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {desvioMetros > 1000 ? `${(desvioMetros / 1000).toFixed(1)}km` : `${Math.round(desvioMetros)}m`}
                {desvioMetros > 500 ? ' (fora da rota)' : ''}
              </span>
            )}
          </div>

          {/* GPS info */}
          {posicao && (
            <div className="text-xs text-blue-700 mb-3 flex items-center gap-2">
              <span>📍 {posicao.latitude.toFixed(5)}, {posicao.longitude.toFixed(5)}</span>
              <span className="text-blue-400">| Precisão: {Math.round(posicao.accuracy)}m</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Foto */}
            <button onClick={capturarFoto} disabled={uploading} className="w-full bg-blue-600 text-white py-2 rounded font-semibold text-sm disabled:opacity-50">
              {uploading ? 'Processando...' : `📷 Tirar Foto (${fotos.length}/5)`}
            </button>

            {fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {fotos.map((foto, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img src={foto} alt={`Foto ${idx + 1}`} className="h-16 w-16 rounded object-cover" />
                    <button
                      onClick={() => removerFoto(idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-xs flex items-center justify-center"
                    >&times;</button>
                  </div>
                ))}
              </div>
            )}

            {/* Tipo */}
            <select value={tipoAtividade} onChange={(e) => setTipoAtividade(e.target.value)} className="w-full border rounded p-2 text-sm">
              <option value="venda">Venda</option>
              <option value="reposicao">Reposição</option>
              <option value="reparo">Reparo de Freezer</option>
              <option value="degustacao">Degustação</option>
              <option value="prospeccao">Prospecção</option>
              <option value="cobranca">Cobrança</option>
            </select>

            {/* Observações */}
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações da visita..."
              className="w-full border rounded p-2 text-sm h-20"
            />

            {/* Botões de ação */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cancelarAtividade.mutate('ausente')}
                className="py-2 border border-gray-300 rounded font-semibold text-sm text-gray-700"
              >
                Cliente Ausente
              </button>
              <button
                onClick={() => concluirAtividade.mutate()}
                disabled={concluirAtividade.isPending}
                className="py-2 bg-green-600 text-white rounded font-semibold text-sm"
              >
                {concluirAtividade.isPending ? 'Salvando...' : 'Concluir Visita'}
              </button>
            </div>
            <button
              onClick={() => cancelarAtividade.mutate('reagendar')}
              className="w-full py-2 text-sm text-orange-600 font-medium"
            >
              Reagendar visita
            </button>
          </div>
        </div>
      )}

      {/* MAPA DA ROTA */}
      {rota?.clientes_sequencia?.some((c: any) => c.latitude && c.longitude) && (
        <div className="p-4">
          <MapaRota
            clientes={rota.clientes_sequencia || []}
            vendedorPos={posicao ? { latitude: posicao.latitude, longitude: posicao.longitude } : null}
            altura="250px"
          />
        </div>
      )}

      {/* LISTA DE CLIENTES */}
      <div className="p-4 space-y-3">
        {rota?.clientes_sequencia?.map((cliente: any, idx: number) => (
          <div key={cliente.cliente_id || idx} className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderColor: COLORS.PRIMARY }}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-semibold">#{idx + 1}</p>
                <p className="text-lg font-bold text-gray-900">{cliente.nome}</p>
                <p className="text-sm text-gray-600 mt-1">{cliente.endereco}</p>
                <p className="text-sm text-gray-600">{cliente.telefone}</p>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                    {cliente.segmento}
                  </span>
                  {cliente.dias_sem_visita > 0 && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${cliente.dias_sem_visita > 7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {cliente.dias_sem_visita}d sem visita
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* AÇÕES */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => iniciarAtividade.mutate(cliente.cliente_id)}
                disabled={!!atividade_ativa || iniciarAtividade.isPending}
                className="py-2 rounded font-semibold text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: '#3b82f6' }}
              >
                {iniciarAtividade.isPending ? '...' : 'Iniciar Visita'}
              </button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cliente.endereco || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 rounded font-semibold text-sm text-center text-white"
                style={{ backgroundColor: '#22c55e' }}
              >
                Navegar
              </a>
            </div>
          </div>
        ))}
      </div>
      </>)}
    </div>
    </Layout>
  );
};

export default AppVendedor;
