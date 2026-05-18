import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

interface Venda {
  id: string;
  cliente_id: string;
  cliente?: { nome: string };
  vendedor_id?: string;
  vendedor?: { nome: string };
  proposta_id?: string;
  valor_total: number;
  valor_recebido?: number;
  status: string;
  data_venda: string;
  data_recebimento?: string;
  forma_pagamento?: string;
  parcelas?: number;
  observacoes?: string;
  itens?: any[];
  created_at?: string;
}

const statusVenda = ['pendente', 'vendas', 'separacao', 'faturamento', 'entrega', 'recebimento', 'cancelada'];
const formasPagamento = ['pix', 'boleto', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia'];

export const VendasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));

  const [form, setForm] = useState({
    cliente_id: '', valor_total: '', forma_pagamento: 'pix',
    parcelas: '1', observacoes: ''
  });

  // Buscar vendas
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas', filtroStatus, filtroMes],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtroStatus) params.append('status', filtroStatus);
      if (filtroMes) params.append('mes', filtroMes);
      const response = await api.get(`/vendas?${params.toString()}`);
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // Buscar clientes para select
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const response = await api.get('/clientes?status=ativo');
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // Registrar venda
  const criarVenda = useMutation({
    mutationFn: async (dados: any) => {
      const response = await api.post('/vendas', dados);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      setShowForm(false);
      setForm({ cliente_id: '', valor_total: '', forma_pagamento: 'pix', parcelas: '1', observacoes: '' });
    }
  });

  // Atualizar status
  const atualizarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.put(`/vendas/${id}`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    criarVenda.mutate({
      ...form,
      valor_total: parseFloat(form.valor_total),
      parcelas: parseInt(form.parcelas),
      data_venda: new Date().toISOString()
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'vendas': return 'bg-blue-100 text-blue-800';
      case 'separacao': return 'bg-purple-100 text-purple-800';
      case 'faturamento': return 'bg-indigo-100 text-indigo-800';
      case 'entrega': return 'bg-orange-100 text-orange-800';
      case 'recebimento': return 'bg-green-100 text-green-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalVendas = (vendas as Venda[]).reduce((acc, v) => acc + (v.valor_total || 0), 0);
  const totalRecebido = (vendas as Venda[]).reduce((acc, v) => acc + (v.valor_recebido || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
            <p className="text-sm text-gray-600 mt-1">{(vendas as Venda[]).length} vendas no período</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-white rounded-lg font-semibold text-sm"
            style={{ backgroundColor: COLORS.PRIMARY }}
          >
            + Nova Venda
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderColor: COLORS.PRIMARY }}>
            <p className="text-sm text-gray-600">Total Vendas</p>
            <p className="text-2xl font-bold text-gray-900">R$ {totalVendas.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Recebido</p>
            <p className="text-2xl font-bold text-green-600">R$ {totalRecebido.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">A Receber</p>
            <p className="text-2xl font-bold text-yellow-600">R$ {(totalVendas - totalRecebido).toFixed(2)}</p>
          </div>
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
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              {statusVenda.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Registrar Venda</h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                    <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Selecione um cliente</option>
                      {(clientes as any[]).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$) *</label>
                      <input type="number" step="0.01" required value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
                      <input type="number" min="1" max="12" value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                    <select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                      {formasPagamento.map(f => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                    <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-20" />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700">Cancelar</button>
                    <button type="submit" disabled={criarVenda.isPending} className="px-4 py-2 text-white rounded-lg text-sm font-semibold" style={{ backgroundColor: COLORS.PRIMARY }}>
                      {criarVenda.isPending ? 'Salvando...' : 'Registrar Venda'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Lista de vendas */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando vendas...</div>
        ) : (vendas as Venda[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">Nenhuma venda no período</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Data</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Valor</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Pagamento</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(vendas as Venda[]).map((venda) => (
                    <tr key={venda.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(venda.data_venda).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 font-medium">{venda.cliente?.nome || '—'}</td>
                      <td className="px-4 py-3 font-semibold">R$ {venda.valor_total?.toFixed(2)}</td>
                      <td className="px-4 py-3">{venda.forma_pagamento?.replace('_', ' ') || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(venda.status)}`}>
                          {venda.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {venda.status !== 'recebimento' && venda.status !== 'cancelada' && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                atualizarStatus.mutate({ id: venda.id, status: e.target.value });
                              }
                            }}
                            className="text-xs border rounded px-2 py-1"
                          >
                            <option value="">Avançar...</option>
                            {statusVenda.filter(s => s !== venda.status).map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VendasPage;
