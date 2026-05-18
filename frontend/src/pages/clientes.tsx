import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

interface Cliente {
  id: string;
  nome_fantasia: string;
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
  omie_codigo?: string;
  media_mensal_historica?: number;
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
  const [sincronizando, setSincronizando] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [geocodificando, setGeocodificando] = useState(false);

  // Form state
  const [form, setForm] = useState({
    nome_fantasia: '', cnpj: '', telefone: '', whatsapp: '', email: '',
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
    setForm({ nome_fantasia: '', cnpj: '', telefone: '', whatsapp: '', email: '', endereco: '', cidade: '', bairro: '', segmento: 'RESTAURANTE', status: 'ativo', observacoes: '', media_mensal_customizada: '' });
    setShowForm(false);
    setEditando(null);
  };

  const abrirEdicao = (cliente: Cliente) => {
    setEditando(cliente);
    setForm({
      nome_fantasia: cliente.nome_fantasia || '',
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

  // Sincronizar dados dos clientes com OMIE (manual)
  const sincronizarOmie = async () => {
    setSincronizando(true);
    setSyncMsg('Mapeando códigos OMIE...');
    try {
      // Etapa 1: Mapear códigos OMIE para clientes que não têm
      const resMap = await api.post('/clientes/mapear-omie');
      const mapResult = resMap.data;
      setSyncMsg(`Mapeados: ${mapResult.mapeados || 0} | Não encontrados: ${mapResult.nao_encontrados?.length || 0}`);

      // Etapa 2: Sincronizar dados cadastrais (endpoint manual)
      await api.post('/clientes/sync-omie');

      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setSyncMsg(`Sincronização concluída! ${mapResult.mapeados || 0} mapeados.`);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      setSyncMsg(`Erro: ${msg}`);
    }
    setSincronizando(false);
    setTimeout(() => setSyncMsg(''), 8000);
  };

  const geocodificarClientes = async () => {
    setGeocodificando(true);
    setSyncMsg('Geocodificando endereços...');
    try {
      const res = await api.post('/clientes/geocodificar');
      const { geocodificados, total, erros } = res.data;
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setSyncMsg(`Geocodificação: ${geocodificados}/${total} endereços convertidos em coordenadas.${erros?.length ? ` (${erros.length} erros)` : ''}`);
    } catch (err: any) {
      setSyncMsg(`Erro: ${err.response?.data?.error || err.message}`);
    }
    setGeocodificando(false);
    setTimeout(() => setSyncMsg(''), 8000);
  };

  // Filtrar por busca
  const clientesFiltrados = (clientes as Cliente[]).filter(c =>
    !busca || c.nome_fantasia?.toLowerCase().includes(busca.toLowerCase()) ||
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
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={sincronizarOmie}
              disabled={sincronizando}
              className="px-4 py-2 border-2 rounded-lg font-semibold text-sm"
              style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
            >
              {sincronizando ? 'Sincronizando...' : '🔄 Sincronizar OMIE'}
            </button>
            <button
              onClick={geocodificarClientes}
              disabled={geocodificando}
              className="px-4 py-2 border-2 rounded-lg font-semibold text-sm"
              style={{ borderColor: '#22c55e', color: '#22c55e' }}
            >
              {geocodificando ? 'Geocodificando...' : '📍 Geocodificar'}
            </button>
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

        {/* Mensagem de sync */}
        {syncMsg && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${syncMsg.startsWith('Erro') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
            {syncMsg}
          </div>
        )}

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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia *</label>
                      <input
                        type="text"
                        required
                        value={form.nome_fantasia}
                        onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
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

        {/* Lista de clientes - Layout compacto em coluna única */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">Nenhum cliente encontrado</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "+ Novo Cliente" para cadastrar</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden sm:table-cell">Contato</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden md:table-cell">Segmento</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 hidden lg:table-cell">Média</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente: Cliente) => (
                    <tr key={cliente.id} className="border-t hover:bg-gray-50 transition-colors">
                      {/* Nome + Endereço */}
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-900 truncate max-w-[220px]">{cliente.nome_fantasia}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[220px]">{cliente.endereco || '—'}</div>
                        {/* Mobile: mostrar contato inline */}
                        <div className="sm:hidden text-xs text-gray-500 mt-0.5">
                          {cliente.telefone || cliente.whatsapp || '—'}
                        </div>
                      </td>
                      {/* Contato */}
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-700 text-xs">{cliente.telefone || cliente.whatsapp || '—'}</span>
                          {(cliente.whatsapp || cliente.telefone) && (
                            <a
                              href={`https://wa.me/55${(cliente.whatsapp || cliente.telefone || '').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800"
                              title="WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>
                          )}
                        </div>
                        {cliente.email && (
                          <div className="text-xs text-gray-400 truncate max-w-[180px]">{cliente.email}</div>
                        )}
                      </td>
                      {/* Segmento */}
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        {cliente.segmento && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                            {cliente.segmento}
                          </span>
                        )}
                      </td>
                      {/* Média */}
                      <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                        {(cliente.media_mensal_customizada || cliente.media_mensal_historica) ? (
                          <span className="font-semibold text-xs" style={{ color: COLORS.PRIMARY }}>
                            R$ {Number(cliente.media_mensal_customizada || cliente.media_mensal_historica || 0).toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cliente.status === 'ativo' ? 'bg-green-100 text-green-800' : cliente.status === 'inativo' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {cliente.status}
                        </span>
                      </td>
                      {/* Ações */}
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirEdicao(cliente)}
                            className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                            title="Editar"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja excluir este cliente?')) {
                                deletarCliente.mutate(cliente.id);
                              }
                            }}
                            className="text-xs font-medium text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                            title="Excluir"
                          >
                            Excluir
                          </button>
                        </div>
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

export default ClientesPage;
                          <button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja excluir este cliente?')) {
                                deletarCliente.mutate(cliente.id);
                              }
                            }}
                            className="text-xs font-medium text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                            title="Excluir"
                          >
                            Excluir
                          </button>
                        </div>
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

export default ClientesPage;
