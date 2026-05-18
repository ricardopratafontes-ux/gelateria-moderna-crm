import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  status?: string;
  meta_mensal?: number;
  comissao_acumulada?: number;
  clientes_ativos?: number;
  visitas_hoje?: number;
  created_at?: string;
}

export const VendedoresPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Vendedor | null>(null);
  const [syncMsg, setSyncMsg] = useState('');

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', whatsapp: '', meta_mensal: '', status: 'ativo'
  });

  // Buscar vendedores
  const { data: vendedores = [], isLoading } = useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const response = await api.get('/vendedores');
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // Criar vendedor
  const criarVendedor = useMutation({
    mutationFn: async (dados: any) => {
      const response = await api.post('/vendedores', dados);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      resetForm();
    }
  });

  // Sincronizar vendedores do OMIE
  const syncOmie = useMutation({
    mutationFn: async () => {
      const response = await api.post('/vendedores/sync-omie');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      setSyncMsg(`OMIE: ${data.importados} importados, ${data.atualizados} atualizados (${data.total_omie} no OMIE)`);
      setTimeout(() => setSyncMsg(''), 8000);
    },
    onError: () => {
      setSyncMsg('Erro ao sincronizar com OMIE');
      setTimeout(() => setSyncMsg(''), 5000);
    }
  });

  // Atualizar vendedor
  const atualizarVendedor = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: any }) => {
      const response = await api.put(`/vendedores/${id}`, dados);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      resetForm();
    }
  });

  const resetForm = () => {
    setForm({ nome: '', email: '', telefone: '', whatsapp: '', meta_mensal: '', status: 'ativo' });
    setShowForm(false);
    setEditando(null);
  };

  const abrirEdicao = (vendedor: Vendedor) => {
    setEditando(vendedor);
    setForm({
      nome: vendedor.nome || '',
      email: vendedor.email || '',
      telefone: vendedor.telefone || '',
      whatsapp: vendedor.whatsapp || '',
      meta_mensal: vendedor.meta_mensal?.toString() || '',
      status: vendedor.status || 'ativo'
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dados = { ...form, meta_mensal: form.meta_mensal ? parseFloat(form.meta_mensal) : null };
    if (editando) {
      atualizarVendedor.mutate({ id: editando.id, dados });
    } else {
      criarVendedor.mutate(dados);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendedores</h1>
            <p className="text-sm text-gray-600 mt-1">Gestão da equipe comercial</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => syncOmie.mutate()}
              disabled={syncOmie.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {syncOmie.isPending ? 'Sincronizando...' : '🔄 Importar do OMIE'}
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 text-white rounded-lg font-semibold text-sm"
              style={{ backgroundColor: COLORS.PRIMARY }}
            >
              + Novo Vendedor
            </button>
          </div>
        </div>

        {/* Sync Message */}
        {syncMsg && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
            {syncMsg}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{editando ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
                  <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input type="text" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                      <input type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                      <input type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meta Mensal (R$)</label>
                      <input type="number" step="0.01" value={form.meta_mensal} onChange={(e) => setForm({ ...form, meta_mensal: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-white rounded-lg text-sm font-semibold" style={{ backgroundColor: COLORS.PRIMARY }}>
                      {editando ? 'Atualizar' : 'Cadastrar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Lista de vendedores */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : (vendedores as Vendedor[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">Nenhum vendedor cadastrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(vendedores as Vendedor[]).map((vendedor) => (
              <div key={vendedor.id} className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: COLORS.PRIMARY }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{vendedor.nome}</h3>
                    <p className="text-sm text-gray-600">{vendedor.email}</p>
                    <p className="text-sm text-gray-600">{vendedor.telefone || vendedor.whatsapp}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${vendedor.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {vendedor.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-3 rounded text-center">
                    <p className="text-xs text-gray-600">Meta Mensal</p>
                    <p className="text-sm font-bold text-gray-900">R$ {vendedor.meta_mensal?.toFixed(0) || '—'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-center">
                    <p className="text-xs text-gray-600">Clientes</p>
                    <p className="text-sm font-bold text-gray-900">{vendedor.clientes_ativos || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-center">
                    <p className="text-xs text-gray-600">Comissão Mês</p>
                    <p className="text-sm font-bold" style={{ color: COLORS.PRIMARY }}>R$ {vendedor.comissao_acumulada?.toFixed(0) || '0'}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <button onClick={() => abrirEdicao(vendedor)} className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded">
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VendedoresPage;

