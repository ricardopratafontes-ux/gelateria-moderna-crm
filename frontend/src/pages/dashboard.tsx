import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { COLORS, LIMITS } from '../utils/constants';
import api from '../services/api';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // BUSCAR DADOS DO DASHBOARD
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const response = await api.get('/dashboard/hoje');
      return response.data;
    },
    refetchInterval: 30000 // Atualizar a cada 30s
  });

  useEffect(() => {
    if (dashboardData) {
      setData(dashboardData);
      setLoading(false);
    }
  }, [dashboardData]);

  if (loading) {
    return <div className="p-8 text-center">Carregando dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard Gerente</h1>
        <p className="text-gray-600 mt-2">Acompanhamento em tempo real - {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* SECAO 1: VISITAS DO DIA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card: Visitas */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: COLORS.PRIMARY }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600 text-sm font-semibold">VISITAS DO DIA</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                {data?.visitas_dia || 0}/{LIMITS.META_VISITAS_DIA}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {data?.visitas_dia >= LIMITS.META_VISITAS_DIA ? 'Meta atingida!' : `${LIMITS.META_VISITAS_DIA - (data?.visitas_dia || 0)} para atingir meta`}
              </p>
            </div>
          </div>
        </div>

        {/* Card: Alertas Criticos */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: COLORS.SECONDARY }}>
          <div>
            <p className="text-gray-600 text-sm font-semibold">ALERTAS CRITICOS</p>
            <div className="mt-4 space-y-2">
              {data?.alertas?.length > 0 ? (
                data.alertas.map((alerta: any, idx: number) => (
                  <div key={idx} className="text-sm text-red-600 font-semibold">
                    {alerta.mensagem}
                  </div>
                ))
              ) : (
                <p className="text-green-600 font-semibold">Nenhum alerta</p>
              )}
            </div>
          </div>
        </div>

        {/* Card: Taxa de Conversao */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: COLORS.TERTIARY }}>
          <div>
            <p className="text-gray-600 text-sm font-semibold">TAXA DE CONVERSAO</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {data?.taxa_conversao || 0}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {data?.propostas_enviadas || 0} propostas / {data?.propostas_aceitas || 0} aceitas
            </p>
          </div>
        </div>
      </div>

      {/* SECAO 2: MAPA EM TEMPO REAL */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Localizacao em Tempo Real</h2>
        <div className="bg-gray-200 rounded h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 text-lg">Mapa sera renderizado aqui</p>
            <p className="text-gray-500 text-sm mt-2">(Google Maps integrado)</p>
            {data?.vendedor_localizacao && (
              <div className="mt-4 text-sm text-gray-700">
                <p>Vendedor: {data.vendedor_localizacao.nome}</p>
                <p>Lat: {data.vendedor_localizacao.latitude.toFixed(4)}</p>
                <p>Lon: {data.vendedor_localizacao.longitude.toFixed(4)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECAO 3: VENDAS DO MES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Grafico: Vendas por Dia */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Vendas Realizadas (Mes)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.vendas_por_dia || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="valor" stroke={COLORS.PRIMARY} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Grafico: Vendas por Segmento */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Distribuicao por Segmento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.vendas_por_segmento || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: R$ ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="valor"
              >
                {[COLORS.PRIMARY, COLORS.SECONDARY, COLORS.TERTIARY, '#FFD700', '#FF6B6B'].map((color, idx) => (
                  <Cell key={`cell-${idx}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECAO 4: LEADS EM RISCO */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Leads em Risco (Nao contatados ha mais de 48h)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">Telefone</th>
                <th className="px-4 py-2 text-left">Dias sem contato</th>
                <th className="px-4 py-2 text-left">Acao</th>
              </tr>
            </thead>
            <tbody>
              {data?.leads_em_risco?.map((lead: any) => (
                <tr key={lead.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{lead.nome}</td>
                  <td className="px-4 py-2">{lead.telefone}</td>
                  <td className="px-4 py-2">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                      {lead.dias_sem_contato} dias
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button className="text-blue-600 hover:underline text-xs font-semibold">
                      Contatar via WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECAO 5: COMISSOES ACUMULADAS */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Comissoes Acumuladas (Mes)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-xs text-gray-600">Novo Cliente (5%)</p>
            <p className="text-2xl font-bold text-blue-600">R$ {data?.comissoes?.novo_cliente || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-xs text-gray-600">Performance (3%)</p>
            <p className="text-2xl font-bold text-green-600">R$ {data?.comissoes?.performance || 0}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <p className="text-xs text-gray-600">Premio 10 Clientes</p>
            <p className="text-2xl font-bold text-yellow-600">R$ {data?.comissoes?.premio || 0}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-xs text-gray-600">Eventos (10%)</p>
            <p className="text-2xl font-bold text-purple-600">R$ {data?.comissoes?.evento || 0}</p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t">
          <p className="text-lg font-bold text-gray-900">
            Total Acumulado: <span style={{ color: COLORS.PRIMARY }}>R$ {data?.comissoes?.total || 0}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
