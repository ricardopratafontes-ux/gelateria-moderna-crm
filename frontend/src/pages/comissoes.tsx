import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { COLORS, COMISSOES } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

interface Comissao {
  id: string;
  vendedor_id: string;
  vendedor?: { nome: string };
  venda_id?: string;
  cliente_id?: string;
  cliente?: { nome: string };
  tipo: string;
  valor: number;
  percentual?: number;
  status: string;
  data_calculo: string;
  data_pagamento?: string;
  observacoes?: string;
}

export const ComissoesPage: React.FC = () => {
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));
  const [filtroTipo, setFiltroTipo] = useState('');

  // Buscar comissões
  const { data: comissoes = [], isLoading } = useQuery({
    queryKey: ['comissoes', filtroMes, filtroTipo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtroMes) params.append('mes', filtroMes);
      if (filtroTipo) params.append('tipo', filtroTipo);
      const response = await api.get(`/comissoes?${params.toString()}`);
      return response.data;
    }
  });

  const tiposComissao = ['novo_cliente', 'performance', 'premio_10', 'evento', 'expansao_canal'];

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'novo_cliente': return `Novo Cliente (${COMISSOES.NOVO_CLIENTE}%)`;
      case 'performance': return `Performance (${COMISSOES.PERFORMANCE}%)`;
      case 'premio_10': return `Prêmio 10 Clientes (R$ ${COMISSOES.PREMIO_10_CLIENTES})`;
      case 'evento': return `Evento (${COMISSOES.EVENTO}%)`;
      case 'expansao_canal': return `Expansão Canal (${COMISSOES.EXPANSAO_CANAL}%)`;
      default: return tipo;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'novo_cliente': return 'bg-blue-100 text-blue-800';
      case 'performance': return 'bg-green-100 text-green-800';
      case 'premio_10': return 'bg-yellow-100 text-yellow-800';
      case 'evento': return 'bg-purple-100 text-purple-800';
      case 'expansao_canal': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Totais por tipo
  const totaisPorTipo = tiposComissao.map(tipo => ({
    tipo,
    total: (comissoes as Comissao[]).filter(c => c.tipo === tipo).reduce((acc, c) => acc + c.valor, 0),
    count: (comissoes as Comissao[]).filter(c => c.tipo === tipo).length
  }));

  const totalGeral = (comissoes as Comissao[]).reduce((acc, c) => acc + c.valor, 0);
  const totalPago = (comissoes as Comissao[]).filter(c => c.status === 'pago').reduce((acc, c) => acc + c.valor, 0);
  const totalPendente = totalGeral - totalPago;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comissões</h1>
          <p className="text-sm text-gray-600 mt-1">Acompanhamento de comissões dos vendedores</p>
        </div>

        {/* Resumo geral */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-5 border-l-4" style={{ borderColor: COLORS.PRIMARY }}>
            <p className="text-sm text-gray-600 font-medium">Total Acumulado</p>
            <p className="text-3xl font-bold mt-1" style={{ color: COLORS.PRIMARY }}>R$ {totalGeral.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 font-medium">Pago</p>
            <p className="text-3xl font-bold text-green-600 mt-1">R$ {totalPago.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 font-medium">Pendente</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">R$ {totalPendente.toFixed(2)}</p>
          </div>
        </div>

        {/* Cards por tipo */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {totaisPorTipo.map(({ tipo, total, count }) => (
            <div
              key={tipo}
              onClick={() => setFiltroTipo(filtroTipo === tipo ? '' : tipo)}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all hover:shadow-md ${filtroTipo === tipo ? 'ring-2 ring-offset-1 ring-red-500' : ''}`}
            >
              <p className="text-xs text-gray-600 font-medium">{getTipoLabel(tipo).split('(')[0]}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">R$ {total.toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">{count} registros</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="month"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos os tipos</option>
              {tiposComissao.map(t => <option key={t} value={t}>{getTipoLabel(t)}</option>)}
            </select>
          </div>
        </div>

        {/* Tabela de comissões */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando comissões...</div>
        ) : (comissoes as Comissao[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">Nenhuma comissão no período</p>
            <p className="text-gray-400 text-sm mt-1">Comissões são calculadas automaticamente com base nas vendas</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Data</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Vendedor</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Valor</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(comissoes as Comissao[]).map((comissao) => (
                    <tr key={comissao.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(comissao.data_calculo).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3">{comissao.vendedor?.nome || '—'}</td>
                      <td className="px-4 py-3">{comissao.cliente?.nome || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getTipoColor(comissao.tipo)}`}>
                          {comissao.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: COLORS.PRIMARY }}>
                        R$ {comissao.valor.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${comissao.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {comissao.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Regras de comissão */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Regras de Comissionamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold text-blue-900">Novo Cliente</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{COMISSOES.NOVO_CLIENTE}%</p>
              <p className="text-xs text-blue-700 mt-1">Sobre valor recebido da 1ª venda</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-semibold text-green-900">Performance</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{COMISSOES.PERFORMANCE}%</p>
              <p className="text-xs text-green-700 mt-1">Quando venda supera média em 10%+</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="font-semibold text-yellow-900">Prêmio 10 Clientes</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">R$ {COMISSOES.PREMIO_10_CLIENTES}</p>
              <p className="text-xs text-yellow-700 mt-1">A cada 10 leads convertidos (cumulativo)</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="font-semibold text-purple-900">Eventos</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{COMISSOES.EVENTO}%</p>
              <p className="text-xs text-purple-700 mt-1">Sobre valor recebido em eventos</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ComissoesPage;
