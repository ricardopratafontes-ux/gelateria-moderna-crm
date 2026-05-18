import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  bairro?: string;
  segmento?: string;
  status?: string;
  observacoes?: string;
  media_mensal?: number;
  media_mensal_customizada?: number;
  ultima_visita?: string;
  ultima_compra?: string;
  created_at?: string;
}

const segmentos = ['RESTAURANTE', 'SUPERMERCADO', 'PADARIA', 'HOTEL', 'EVENTO', 'COLEGIO', 'OUTROS'];
const statusOptions = ['ativo', 'inativo', 'prospecto'];

export const ClientesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showImportOmie, setShowImportOmie] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [filtroSegmento, setFiltroSegmento] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaOmie, setBuscaOmie] = useState('');
  const [resultadosOmie, setResultadosOmie] = useState<any[]>([]);
  const [buscandoOmie, setBuscandoOmie] = useState(false);
  const [importandoOmie, setImportandoOmie] = useState<string | null>(null);
  const [segmentoImport, setSegmentoImport] = useState('RESTAURANTE');

  // Form state
  const [form, setForm] = useState({
    nome: '', cnpj: '', telefone: '', whatsapp: '', email: '',
    endereco: '', cidade: '', bairro: '', segmento: 'RESTAURANTE',
    status: 'ativo', observacoes: '', media_mensal_customizada: ''
  });

  // Buscar clientes
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', filtroSegmento, filtroStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtroSegmento) params.append('segmento', filtroSegmento);
      if (filtroStatus) params.append('status', filtroStatus);
      const response = await api.get(`/clientes?${params.toString()}`);
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // Criar cliente
  const criarCliente = useMutation({
    mutationFn: async (dados: any) => {
      const response = await api.post('/clientes', dados);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      resetForm();
    }
  });

  // Atualizar cliente
  const atualizarCliente = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: any }) => {
      const response = await api.put(`/clientes/${id}`, dados);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      resetForm();
    }
  });

  // Deletar cliente
  const deletarCliente = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clientes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });

  const resetForm = () => {
    setForm({ nome: '', cnpj: '', telefone: '', whatsapp: '', email: '', endereco: '', cidade: '', bairro: '', segmento: 'RESTAURANTE', status: 'ativo', observacoes: '', media_mensal_customizada: '' });
    setShowForm(false);
    setEditando(null);
  };

  const abrirEdicao = (cliente: Cliente) => {
    setEditando(cliente);
    setForm({
      nome: cliente.nome || '',
      cnpj: cliente.cnpj || '',
      telefone: cliente.telefone || '',
      whatsapp: cliente.whatsapp || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      bairro: cliente.bairro || '',
      segmento: cliente.segmento || 'RESTAURANTE',
      status: cliente.status || 'ativo',
      observacoes: cliente.observacoes || '',
      media_mensal_customizada: cliente.media_mensal_customizada?.toString() || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dados = {
      ...form,
      media_mensal_customizada: form.media_mensal_customizada ? parseFloat(form.media_mensal_customizada) : null
    };

    if (editando) {
      atualizarCliente.mutate({ id: editando.id, dados });
    } else {
      criarCliente.mutate(dados);
    }
  };

  // Buscar no OMIE por nome
  const buscarNoOmie = async () => {
    if (buscaOmie.length < 3) return;
    setBuscandoOmie(true);
    try {
      const response = await api.get(`/clientes/buscar-omie/${encodeURIComponent(buscaOmie)}`);
      setResultadosOmie(Array.isArray(response.data) ? response.data : []);
    } catch {
      setResultadosOmie([]);
    }
    setBuscandoOmie(false);
  };

  // Importar um cliente do OMIE
  const importarDoOmie = async (codigo_omie: string) => {
    setImportandoOmie(codigo_omie);
    try {
      await api.post('/clientes/importar-omie', { codigo_omie, segmento: segmentoImport });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      // Remover da lista de resultados
      setResultadosOmie(prev => prev.filter(r => r.codigo_omie !== codigo_omie));
      alert('Cliente importado com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao importar');
    }
    setImportandoOmie(null);
  };

  // Filtrar por busca
  const clientesFiltrados = (clientes as Cliente[]).filter(c =>
    !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca) || c.cnpj?.includes(busca)
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-600 mt-1">{clientesFiltrados.length} clientes cadastrados</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setBuscaOmie(''); setResultadosOmie([]); setShowImportOmie(true); }}
              className="px-4 py-2 border-2 rounded-lg font-semibold text-sm"
              style={{ borderColor: COLORS.PRIMARY, color: COLORS.PRIMARY }}
            >
              Importar do OMIE
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 text-white rounded-lg font-semibold text-sm"
              style={{ backgroundColor: COLORS.PRIMARY }}
            >
              + Novo Cliente
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou CNPJ..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
            <select
              value={filtroSegmento}
              onChange={(e) => setFiltroSegmento(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos os segmentos</option>
              {segmentos.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Modal: Importar do OMIE */}
        {showImportOmie && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900">Importar Cliente do OMIE</h2>
                  <button onClick={() => setShowImportOmie(false)} className="text-gray-500 text-2xl">&times;</button>
                </div>

                <p className="text-sm text-gray-600">
                  Busque pelo nome do cliente no OMIE e importe com 1 clique. O código OMIE, CNPJ, telefone e endereço serão trazidos automaticamente.
                </p>

                {/* Busca */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={buscaOmie}
                    onChange={(e) => setBuscaOmie(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscarNoOmie()}
                    placeholder="Digite o nome do cliente..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={buscarNoOmie}
                    disabled={buscandoOmie || buscaOmie.length < 3}
                    className="px-4 py-2 text-white rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: COLORS.PRIMARY }}
                  >
                    {buscandoOmie ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>

                {/* Segmento para aplicar */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Segmento ao importar:</label>
                  <select
                    value={segmentoImport}
                    onChange={(e) => setSegmentoImport(e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm"
                  >
                    {segmentos.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Resultados */}
                {resultadosOmie.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {resultadosOmie.map((r: any) => (
                      <div key={r.codigo_omie} className="border rounded-lg p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{r.nome_fantasia}</p>
                            <p className="text-xs text-gray-500">{r.razao_social}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              CNPJ: {r.cnpj || '-'} | Tel: {r.telefone || '-'}
                            </p>
                            <p className="text-xs text-gray-400">Código OMIE: {r.codigo_omie}</p>
                          </div>
                          <button
                            onClick={() => importarDoOmie(r.codigo_omie)}
                            disabled={importandoOmie === r.codigo_omie}
                            className="ml-2 px-3 py-1.5 text-white rounded text-xs font-semibold shrink-0"
                            style={{ backgroundColor: '#22c55e' }}
                          >
                            {importandoOmie === r.codigo_omie ? 'Importando...' : 'Importar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : buscaOmie.length >= 3 && !buscandoOmie ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhum cliente encontrado no OMIE</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Modal/Form de cadastro */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editando ? 'Editar Cliente' : 'Novo Cliente'}
                  </h2>
                  <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input
                        type="text"
                        required
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="Nome do estabelecimento"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={form.cnpj}
                        onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                      <input
                        type="tel"
                        value={form.telefone}
                        onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="(11) 9999-9999"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                      <input
                        type="tel"
                        value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="email@empresa.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
                      <select
                        value={form.segmento}
                        onChange={(e) => setForm({ ...form, segmento: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        {segmentos.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Média Mensal (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.media_mensal_customizada}
                        onChange={(e) => setForm({ ...form, media_mensal_customizada: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="Valor customizado"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={form.endereco}
                      onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Rua, número, complemento"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={form.cidade}
                        onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={form.bairro}
                        onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                    <textarea
                      value={form.observacoes}
                      onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm h-20"
                      placeholder="Anotações sobre o cliente..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={criarCliente.isPending || atualizarCliente.isPending}
                      className="px-4 py-2 text-white rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: COLORS.PRIMARY }}
                    >
                      {criarCliente.isPending || atualizarCliente.isPending ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Lista de clientes */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">Nenhum cliente encontrado</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "+ Novo Cliente" para cadastrar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesFiltrados.map((cliente: Cliente) => (
              <div key={cliente.id} className="bg-white rounded-lg shadow p-4 border-l-4 hover:shadow-md transition-shadow" style={{ borderColor: COLORS.PRIMARY }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{cliente.nome}</h3>
                    <p className="text-sm text-gray-600 mt-1">{cliente.endereco || 'Sem endereço'}</p>
                    <p className="text-sm text-gray-600">{cliente.telefone || cliente.whatsapp || 'Sem telefone'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${cliente.status === 'ativo' ? 'bg-green-100 text-green-800' : cliente.status === 'inativo' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {cliente.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {cliente.segmento && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                      {cliente.segmento}
                    </span>
                  )}
                  {cliente.ultima_visita && (
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                      Visita: {new Date(cliente.ultima_visita).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                {cliente.media_mensal_customizada || cliente.media_mensal ? (
                  <p className="text-sm font-semibold mt-2" style={{ color: COLORS.PRIMARY }}>
                    Média: R$ {(cliente.media_mensal_customizada || cliente.media_mensal || 0).toFixed(2)}
                  </p>
                ) : null}

                <div className="mt-3 pt-3 border-t flex gap-2">
                  <button
                    onClick={() => abrirEdicao(cliente)}
                    className="flex-1 text-sm font-medium text-blue-600 hover:bg-blue-50 py-1.5 rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este cliente?')) {
                        deletarCliente.mutate(cliente.id);
                      }
                    }}
                    className="flex-1 text-sm font-medium text-red-600 hover:bg-red-50 py-1.5 rounded"
                  >
                    Excluir
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

export default ClientesPage;
