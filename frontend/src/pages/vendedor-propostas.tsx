import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

interface Proposta {
  id: string;
  codigo?: string;
  cliente_id: string;
  cliente?: { nome: string; whatsapp?: string };
  valor_total: number;
  status: string;
  itens: any[];
  validade?: string;
  created_at?: string;
}

export const VendedorPropostasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    cliente_id: '',
    itens: [{ descricao: '', quantidade: 1, valor_unitario: '' }],
    validade: '',
    observacoes: ''
  });

  // Buscar propostas
  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ['minhas-propostas'],
    queryFn: async () => {
      const response = await api.get('/propostas');
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // Buscar clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-proposta'],
    queryFn: async () => {
      const response = await api.get('/clientes?status=ativo');
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // Criar proposta
  const criarProposta = useMutation({
    mutationFn: async (dados: any) => {
      const itensFormatados = dados.itens.filter((i: any) => i.descricao && i.valor_unitario).map((i: any) => ({
        descricao: i.descricao,
        quantidade: parseInt(i.quantidade),
        valor_unitario: parseFloat(i.valor_unitario),
        valor_total: parseInt(i.quantidade) * parseFloat(i.valor_unitario)
      }));

      const valorTotal = itensFormatados.reduce((acc: number, i: any) => acc + i.valor_total, 0);

      const response = await api.post('/propostas', {
        cliente_id: dados.cliente_id,
        itens: itensFormatados,
        valor_total: valorTotal,
        validade: dados.validade || null,
        observacoes: dados.observacoes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minhas-propostas'] });
      setShowForm(false);
      setForm({ cliente_id: '', itens: [{ descricao: '', quantidade: 1, valor_unitario: '' }], validade: '', observacoes: '' });
    }
  });

  // Enviar por WhatsApp
  const enviarWhatsapp = useMutation({
    mutationFn: async (proposta: Proposta) => {
      await api.post('/whatsapp/enviar', {
        telefone: proposta.cliente?.whatsapp,
        mensagem: `Olá! Segue sua proposta comercial Gelateria Moderna (${proposta.codigo}). Valor: R$ ${proposta.valor_total.toFixed(2)}`
      });
    }
  });

  const addItem = () => {
    setForm({ ...form, itens: [...form.itens, { descricao: '', quantidade: 1, valor_unitario: '' }] });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const novosItens = [...form.itens];
    novosItens[idx] = { ...novosItens[idx], [field]: value };
    setForm({ ...form, itens: novosItens });
  };

  const valorTotal = form.itens.reduce((acc, i) => acc + (parseInt(String(i.quantidade)) || 0) * (parseFloat(String(i.valor_unitario)) || 0), 0);

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Propostas</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-2 text-white rounded-lg font-semibold text-sm"
            style={{ backgroundColor: COLORS.PRIMARY }}
          >
            + Nova Proposta
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900">Nova Proposta</h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-500 text-2xl">&times;</button>
                </div>

                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    {(clientes as any[]).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Itens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Itens</label>
                  {form.itens.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-end">
                      <input type="text" placeholder="Produto" value={item.descricao} onChange={(e) => updateItem(idx, 'descricao', e.target.value)} className="flex-1 border rounded px-2 py-1.5 text-sm" />
                      <input type="number" min="1" value={item.quantidade} onChange={(e) => updateItem(idx, 'quantidade', e.target.value)} className="w-16 border rounded px-2 py-1.5 text-sm" />
                      <input type="number" step="0.01" placeholder="R$" value={item.valor_unitario} onChange={(e) => updateItem(idx, 'valor_unitario', e.target.value)} className="w-24 border rounded px-2 py-1.5 text-sm" />
                      {form.itens.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-red-500 text-lg">&times;</button>
                      )}
                    </div>
                  ))}
                  <button onClick={addItem} className="text-sm text-blue-600 font-medium">+ Adicionar item</button>
                </div>

                {/* Total */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-lg font-bold" style={{ color: COLORS.PRIMARY }}>Total: R$ {valorTotal.toFixed(2)}</p>
                </div>

                {/* Validade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                  <input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-16" />
                </div>

                {/* Ações */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-700">Cancelar</button>
                  <button
                    onClick={() => criarProposta.mutate(form)}
                    disabled={!form.cliente_id || criarProposta.isPending}
                    className="flex-1 py-2 text-white rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: COLORS.PRIMARY }}
                  >
                    {criarProposta.isPending ? 'Criando...' : 'Criar Proposta'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de propostas */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : (propostas as Proposta[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma proposta criada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(propostas as Proposta[]).map((proposta) => (
              <div key={proposta.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{proposta.cliente?.nome}</p>
                    <p className="text-xs text-gray-500">{proposta.codigo} | {new Date(proposta.created_at || '').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${proposta.status === 'aceita' ? 'bg-green-100 text-green-800' : proposta.status === 'recusada' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {proposta.status}
                  </span>
                </div>
                <p className="text-lg font-bold mt-2" style={{ color: COLORS.PRIMARY }}>R$ {proposta.valor_total?.toFixed(2)}</p>
                <div className="mt-3 flex gap-2">
                  {proposta.cliente?.whatsapp && (
                    <button
                      onClick={() => enviarWhatsapp.mutate(proposta)}
                      className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded font-medium"
                    >
                      Enviar WhatsApp
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VendedorPropostasPage;
