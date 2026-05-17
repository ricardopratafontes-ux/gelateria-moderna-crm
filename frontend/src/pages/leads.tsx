import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

interface Lead {
  id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  empresa?: string;
  segmento?: string;
  origem?: string;
  status: string;
  observacoes?: string;
  vendedor_id?: string;
  data_ultimo_contato?: string;
  data_proximo_contato?: string;
  created_at?: string;
}

const statusLead = ['novo', 'contatado', 'interessado', 'proposta_enviada', 'negociando', 'convertido', 'perdido'];
const origens = ['indicacao', 'site', 'whatsapp', 'instagram', 'feira', 'prospeccao', 'outro'];

export const LeadsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Lead | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');

  const [form, setForm] = useState({
    nome: '', telefone: '', whatsapp: '', email: '', empresa: '',
    segmento: 'RESTAURANTE', origem: 'prospeccao', status: 'novo',
    observacoes: '', data_proximo_contato: ''
  });

  // Buscar leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', filtroStatus],
    queryFn: async () => {
      const params = filtroStatus ? `?status=${filtroStatus}` : '';
      const response = await api.get(`/leads${params}`);
      return response.data;
    }
  });

  // Criar lead
  const criarLead = useMutation({
    mutationFn: async (dados: any) => {
      const response = await api.post('/leads', dados);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      resetForm();
    }
  });

  // Atualizar lead
  const atualizarLead = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: any }) => {
      const response = await api.put(`/leads/${id}`, dados);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      resetForm();
    }
  });

  // Converter lead em cliente
  const converterLead = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/leads/${id}/converter`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });

  const resetForm = () => {
    setForm({ nome: '', telefone: '', whatsapp: '', email: '', empresa: '', segmento: 'RESTAURANTE', origem: 'prospeccao', status: 'novo', observacoes: '', data_proximo_contato: '' });
    setShowForm(false);
    setEditando(null);
  };

  const abrirEdicao = (lead: Lead) => {
    setEditando(lead);
    setForm({
      nome: lead.nome || '',
      telefone: lead.telefone || '',
      whatsapp: lead.whatsapp || '',
      email: lead.email || '',
      empresa: lead.empresa || '',
      segmento: lead.segmento || 'RESTAURANTE',
      origem: lead.origem || 'prospeccao',
      status: lead.status || 'novo',
      observacoes: lead.observacoes || '',
      data_proximo_contato: lead.data_proximo_contato ? lead.data_proximo_contato.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editando) {
      atualizarLead.mutate({ id: editando.id, dados: form });
    } else {
      criarLead.mutate(form);
    }
  };

  const diasSemContato = (lead: Lead) => {
    if (!lead.data_ultimo_contato) return null;
    const dias = Math.floor((Date.now() - new Date(lead.data_ultimo_contato).getTime()) / 86400000);
    return dias;
  };

  const leadsFiltrados = (leads as Lead[]).filter(l =>
    !busca || l.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    l.empresa?.toLowerCase().includes(busca.toLowerCase()) ||
    l.telefone?.includes(busca)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-blue-100 text-blue-800';
      case 'contatado': return 'bg-yellow-100 text-yellow-800';
      case 'interessado': return 'bg-purple-100 text-purple-800';
      case 'proposta_enviada': return 'bg-orange-100 text-orange-800';
      case 'negociando': return 'bg-indigo-100 text-indigo-800';
      case 'convertido': return 'bg-green-100 text-green-800';
      case 'perdido': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-600 mt-1">{leadsFiltrados.length} leads no funil</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 text-white rounded-lg font-semibold text-sm"
            style={{ backgroundColor: COLORS.PRIMARY }}
          >
            + Novo Lead
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Buscar por nome, empresa ou telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              {statusLead.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {/* Pipeline visual */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {statusLead.map(status => {
            const count = (leads as Lead[]).filter(l => l.status === status).length;
            return (
              <div
                key={status}
                onClick={() => setFiltroStatus(filtroStatus === status ? '' : status)}
                className={`p-3 rounded-lg text-center cursor-pointer transition-all ${filtroStatus === status ? 'ring-2 ring-offset-1' : ''} ${getStatusColor(status)}`}
              >
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs font-medium mt-1">{status.replace('_', ' ')}</p>
              </div>
            );
          })}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editando ? 'Editar Lead' : 'Novo Lead'}
                  </h2>
                  <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input type="text" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nome do contato" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                      <input type="text" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nome da empresa" />
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
                      <select value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                        <option value="RESTAURANTE">Restaurante</option>
                        <option value="SUPERMERCADO">Supermercado</option>
                        <option value="PADARIA">Padaria</option>
                        <option value="HOTEL">Hotel</option>
                        <option value="EVENTO">Evento</option>
                        <option value="COLEGIO">Colégio</option>
                        <option value="OUTROS">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                      <select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                        {origens.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                        {statusLead.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Próximo Contato</label>
                      <input type="date" value={form.data_proximo_contato} onChange={(e) => setForm({ ...form, data_proximo_contato: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                    <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-20" placeholder="Detalhes sobre o lead..." />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={criarLead.isPending || atualizarLead.isPending} className="px-4 py-2 text-white rounded-lg text-sm font-semibold" style={{ backgroundColor: COLORS.PRIMARY }}>
                      {criarLead.isPending || atualizarLead.isPending ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Lista de leads */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando leads...</div>
        ) : leadsFiltrados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">Nenhum lead encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leadsFiltrados.map((lead: Lead) => {
              const dias = diasSemContato(lead);
              const emRisco = dias !== null && dias > 2 && !['convertido', 'perdido'].includes(lead.status);
              return (
                <div key={lead.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${emRisco ? 'border-red-500' : ''}`} style={!emRisco ? { borderColor: COLORS.PRIMARY } : {}}>
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{lead.nome}</h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getStatusColor(lead.status)}`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                        {emRisco && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800">
                            {dias}d sem contato
                          </span>
                        )}
                      </div>
                      {lead.empresa && <p className="text-sm text-gray-600 mt-1">{lead.empresa}</p>}
                      <p className="text-sm text-gray-500">{lead.telefone || lead.whatsapp} {lead.email && `| ${lead.email}`}</p>
                      {lead.observacoes && <p className="text-sm text-gray-500 mt-1 italic">"{lead.observacoes}"</p>}
                    </div>
                    <div className="flex gap-2 items-start">
                      <button onClick={() => abrirEdicao(lead)} className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded">Editar</button>
                      {!['convertido', 'perdido'].includes(lead.status) && (
                        <button
                          onClick={() => {
                            if (confirm('Converter lead em cliente?')) converterLead.mutate(lead.id);
                          }}
                          className="text-sm font-medium text-green-600 hover:bg-green-50 px-3 py-1.5 rounded"
                        >
                          Converter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LeadsPage;
