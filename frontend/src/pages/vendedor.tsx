import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { COLORS, LIMITS } from '../utils/constants';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const AppVendedor: React.FC = () => {
  const [atividade_ativa, setAtividadeAtiva] = useState<any>(null);
  const [gps_ativo, setGpsAtivo] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // BUSCAR ROTA DO DIA
  const { data: rota } = useQuery({
    queryKey: ['rota', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const response = await api.get('/rotas/dia/' + new Date().toISOString().split('T')[0]);
      return response.data;
    }
  });

  // INICIAR ATIVIDADE
  const iniciarAtividade = useMutation({
    mutationFn: async (cliente_id: string) => {
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition((position) => {
          console.log('GPS:', position.coords.latitude, position.coords.longitude);
        });
      }

      const response = await api.post('/atividades', {
        rota_id: rota?.id,
        cliente_id,
        tipo: 'venda',
        data_hora_inicio: new Date(),
        latitude: 0,
        longitude: 0
      });

      setAtividadeAtiva(response.data);
      setGpsAtivo(true);
      return response.data;
    }
  });

  // CONCLUIR ATIVIDADE
  const concluirAtividade = useMutation({
    mutationFn: async (resultado: any) => {
      const response = await api.put(`/api/atividades/${atividade_ativa.id}`, {
        data_hora_fim: new Date(),
        resultado: resultado.resultado,
        tipo: resultado.tipo,
        fotos: fotos,
        observacoes: resultado.observacoes
      });

      setAtividadeAtiva(null);
      setGpsAtivo(false);
      setFotos([]);
      return response.data;
    }
  });

  // GERAR PROPOSTA
  const gerarProposta = useMutation({
    mutationFn: async (cliente_id: string) => {
      const response = await api.post('/propostas', {
        cliente_id,
        vendedor_id: 'seu-vendedor-id',
        itens: [],
        valor_total: 0
      });

      await api.post('/whatsapp/enviar', {
        telefone: response.data.cliente.whatsapp,
        mensagem: `Ola! Segue sua proposta de gelato: ${response.data.codigo}`
      });

      return response.data;
    }
  });

  if (!rota) {
    return <div className="p-8 text-center">Carregando rota do dia...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b p-4 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rota do Dia</h1>
          <p className="text-sm text-gray-600 mt-1">
            {rota?.clientes_sequencia?.length || 0} clientes | Meta: {LIMITS.META_VISITAS_DIA} visitas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{usuario?.nome}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Sair
          </button>
        </div>
      </div>

      {/* CONTADOR DE VISITAS */}
      <div className="bg-white border-b p-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">Visitas realizadas</p>
          <p className="text-3xl font-bold" style={{ color: COLORS.PRIMARY }}>
            {rota?.visitas_realizadas || 0}/{LIMITS.META_VISITAS_DIA}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Tempo estimado</p>
          <p className="text-2xl font-bold text-gray-900">{rota?.tempo_estimado_minutos || 0}min</p>
        </div>
      </div>

      {/* ATIVIDADE ATIVA */}
      {atividade_ativa ? (
        <div className="bg-blue-50 border-b p-4">
          <p className="text-sm font-semibold text-blue-900">Atividade em andamento</p>
          <p className="text-lg font-bold text-blue-900 mt-1">{atividade_ativa.cliente?.nome}</p>
          <div className="mt-4 space-y-3">
            {/* Tirar foto */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (event: any) => {
                    setFotos([...fotos, event.target.result]);
                  };
                  reader.readAsDataURL(file);
                };
                input.click();
              }}
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
            >
              Tirar Foto
            </button>

            {/* Fotos tiradas */}
            {fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {fotos.map((foto, idx) => (
                  <img key={idx} src={foto} alt={`Foto ${idx}`} className="h-16 w-16 rounded object-cover" />
                ))}
              </div>
            )}

            {/* Tipo de atividade */}
            <select
              defaultValue="venda"
              className="w-full border rounded p-2 text-sm"
              onChange={(e) => {
                setAtividadeAtiva({ ...atividade_ativa, tipo: e.target.value });
              }}
            >
              <option value="venda">Venda</option>
              <option value="reparo">Reparo de Freezer</option>
              <option value="reposicao">Reposicao</option>
              <option value="degustacao">Degustacao</option>
              <option value="prospecacao">Prospeccao</option>
            </select>

            {/* Observacoes */}
            <textarea
              placeholder="Observacoes da visita..."
              className="w-full border rounded p-2 text-sm h-20"
            />

            {/* Concluir atividade */}
            <button
              onClick={() => {
                concluirAtividade.mutate({
                  resultado: 'concluida',
                  tipo: atividade_ativa.tipo,
                  observacoes: ''
                });
              }}
              className="w-full bg-green-600 text-white py-2 rounded font-semibold"
            >
              Concluir Visita
            </button>
          </div>
        </div>
      ) : null}

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
                <div className="mt-2 flex gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                    {cliente.segmento}
                  </span>
                  {cliente.ultima_compra && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                      Ultima compra: {cliente.ultima_compra}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ACOES */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => iniciarAtividade.mutate(cliente.cliente_id)}
                className="bg-blue-600 text-white py-2 rounded font-semibold text-sm"
              >
                Iniciar
              </button>
              <button
                onClick={() => gerarProposta.mutate(cliente.cliente_id)}
                className="bg-green-600 text-white py-2 rounded font-semibold text-sm"
              >
                Proposta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppVendedor;
