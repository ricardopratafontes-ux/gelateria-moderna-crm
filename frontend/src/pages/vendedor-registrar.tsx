import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';
import { useNavigate } from 'react-router-dom';

export const VendedorRegistrarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<'cliente' | 'detalhes' | 'fotos'>('cliente');
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);

  const [form, setForm] = useState({
    tipo: 'venda',
    resultado: 'concluida',
    observacoes: '',
    valor_venda: '',
    forma_pagamento: 'pix'
  });

  // Buscar clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-visita'],
    queryFn: async () => {
      const response = await api.get('/clientes?status=ativo');
      return response.data;
    }
  });

  // Registrar atividade/visita
  const registrarVisita = useMutation({
    mutationFn: async (dados: any) => {
      // Registra atividade
      const atividade = await api.post('/atividades', {
        cliente_id: clienteSelecionado.id,
        tipo: dados.tipo,
        resultado: dados.resultado,
        observacoes: dados.observacoes,
        fotos: fotos,
        data_hora_inicio: new Date(),
        data_hora_fim: new Date(),
        latitude: 0,
        longitude: 0
      });

      // Se houve venda, registra
      if (dados.tipo === 'venda' && dados.valor_venda) {
        await api.post('/vendas', {
          cliente_id: clienteSelecionado.id,
          valor_total: parseFloat(dados.valor_venda),
          forma_pagamento: dados.forma_pagamento,
          data_venda: new Date().toISOString(),
          status: 'vendas'
        });
      }

      return atividade.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      alert('Visita registrada com sucesso!');
      navigate('/vendedor');
    }
  });

  const tirarFoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          setFotos([...fotos, event.target.result]);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSubmit = () => {
    if (!clienteSelecionado) {
      alert('Selecione um cliente');
      return;
    }
    registrarVisita.mutate(form);
  };

  const clientesFiltrados = (clientes as any[]).filter(c =>
    !buscaCliente || c.nome?.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Registrar Visita</h1>

        {/* Progress */}
        <div className="flex gap-1">
          {['cliente', 'detalhes', 'fotos'].map((step, idx) => (
            <div key={step} className="flex-1 h-2 rounded" style={{ backgroundColor: ['cliente', 'detalhes', 'fotos'].indexOf(etapa) >= idx ? COLORS.PRIMARY : '#e5e7eb' }} />
          ))}
        </div>

        {/* Etapa 1: Selecionar Cliente */}
        {etapa === 'cliente' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium">1. Selecione o cliente</p>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clientesFiltrados.slice(0, 20).map((cliente: any) => (
                <button
                  key={cliente.id}
                  onClick={() => { setClienteSelecionado(cliente); setEtapa('detalhes'); }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${clienteSelecionado?.id === cliente.id ? 'border-2' : 'hover:bg-gray-50'}`}
                  style={clienteSelecionado?.id === cliente.id ? { borderColor: COLORS.PRIMARY } : {}}
                >
                  <p className="font-medium text-gray-900">{cliente.nome}</p>
                  <p className="text-xs text-gray-500">{cliente.endereco} | {cliente.segmento}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Etapa 2: Detalhes da visita */}
        {etapa === 'detalhes' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 font-medium">2. Detalhes da visita em: <strong>{clienteSelecionado?.nome}</strong></p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Atividade</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="venda">Venda</option>
                <option value="reposicao">Reposição</option>
                <option value="reparo">Reparo de Freezer</option>
                <option value="degustacao">Degustação</option>
                <option value="prospeccao">Prospecção</option>
                <option value="cobranca">Cobrança</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
              <select value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="concluida">Concluída com sucesso</option>
                <option value="cliente_ausente">Cliente ausente</option>
                <option value="sem_interesse">Sem interesse</option>
                <option value="reagendar">Reagendar</option>
                <option value="pendente">Pendente de retorno</option>
              </select>
            </div>

            {form.tipo === 'venda' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Venda (R$)</label>
                  <input type="number" step="0.01" value={form.valor_venda} onChange={(e) => setForm({ ...form, valor_venda: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-24" placeholder="Anotações da visita..." />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEtapa('cliente')} className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-700">Voltar</button>
              <button onClick={() => setEtapa('fotos')} className="flex-1 py-2 text-white rounded-lg text-sm font-semibold" style={{ backgroundColor: COLORS.PRIMARY }}>Próximo</button>
            </div>
          </div>
        )}

        {/* Etapa 3: Fotos */}
        {etapa === 'fotos' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 font-medium">3. Fotos de comprovação (opcional)</p>

            <button
              onClick={tirarFoto}
              className="w-full py-3 border-2 border-dashed rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              📷 Tirar Foto / Selecionar Imagem
            </button>

            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {fotos.map((foto, idx) => (
                  <div key={idx} className="relative">
                    <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      onClick={() => setFotos(fotos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Resumo */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">Resumo da Visita</h4>
              <p className="text-sm text-gray-700"><strong>Cliente:</strong> {clienteSelecionado?.nome}</p>
              <p className="text-sm text-gray-700"><strong>Tipo:</strong> {form.tipo}</p>
              <p className="text-sm text-gray-700"><strong>Resultado:</strong> {form.resultado}</p>
              {form.valor_venda && <p className="text-sm text-gray-700"><strong>Valor:</strong> R$ {form.valor_venda}</p>}
              {form.observacoes && <p className="text-sm text-gray-700"><strong>Obs:</strong> {form.observacoes}</p>}
              <p className="text-sm text-gray-700"><strong>Fotos:</strong> {fotos.length}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEtapa('detalhes')} className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-700">Voltar</button>
              <button
                onClick={handleSubmit}
                disabled={registrarVisita.isPending}
                className="flex-1 py-2 text-white rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#22c55e' }}
              >
                {registrarVisita.isPending ? 'Salvando...' : 'Confirmar Visita'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VendedorRegistrarPage;
