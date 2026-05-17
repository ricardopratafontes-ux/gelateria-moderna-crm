import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { COLORS, COMISSOES } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

export const VendedorComissoesPage: React.FC = () => {
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));

  const { data: comissoes = [], isLoading } = useQuery({
    queryKey: ['minhas-comissoes', filtroMes],
    queryFn: async () => {
      const response = await api.get(`/comissoes?mes=${filtroMes}`);
      return response.data;
    }
  });

  const total = (comissoes as any[]).reduce((acc, c) => acc + (c.valor || 0), 0);

  const porTipo = {
    novo_cliente: (comissoes as any[]).filter(c => c.tipo === 'novo_cliente').reduce((acc, c) => acc + c.valor, 0),
    performance: (comissoes as any[]).filter(c => c.tipo === 'performance').reduce((acc, c) => acc + c.valor, 0),
    premio_10: (comissoes as any[]).filter(c => c.tipo === 'premio_10').reduce((acc, c) => acc + c.valor, 0),
    evento: (comissoes as any[]).filter(c => c.tipo === 'evento').reduce((acc, c) => acc + c.valor, 0),
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Minhas Comissões</h1>

        {/* Seletor de mês */}
        <input
          type="month"
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />

        {/* Total */}
        <div className="bg-white rounded-lg shadow p-6 text-center border-t-4" style={{ borderColor: COLORS.PRIMARY }}>
          <p className="text-sm text-gray-600">Total Acumulado</p>
          <p className="text-4xl font-bold mt-1" style={{ color: COLORS.PRIMARY }}>R$ {total.toFixed(2)}</p>
        </div>

        {/* Por tipo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600">Novo Cliente ({COMISSOES.NOVO_CLIENTE}%)</p>
            <p className="text-xl font-bold text-blue-600">R$ {porTipo.novo_cliente.toFixed(0)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600">Performance ({COMISSOES.PERFORMANCE}%)</p>
            <p className="text-xl font-bold text-green-600">R$ {porTipo.performance.toFixed(0)}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600">Prêmio 10 Clientes</p>
            <p className="text-xl font-bold text-yellow-600">R$ {porTipo.premio_10.toFixed(0)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600">Eventos ({COMISSOES.EVENTO}%)</p>
            <p className="text-xl font-bold text-purple-600">R$ {porTipo.evento.toFixed(0)}</p>
          </div>
        </div>

        {/* Lista detalhada */}
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Carregando...</div>
        ) : (comissoes as any[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma comissão neste mês</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Detalhamento</h3>
            {(comissoes as any[]).map((c: any) => (
              <div key={c.id} className="bg-white rounded-lg shadow p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.cliente?.nome || 'Prêmio'}</p>
                  <p className="text-xs text-gray-500">{c.tipo?.replace('_', ' ')} | {new Date(c.data_calculo).toLocaleDateString('pt-BR')}</p>
                </div>
                <p className="font-bold" style={{ color: COLORS.PRIMARY }}>R$ {c.valor?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VendedorComissoesPage;
