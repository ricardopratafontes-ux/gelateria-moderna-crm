import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

export const VendedorClientesPage: React.FC = () => {
  const [busca, setBusca] = useState('');
  const [filtroSegmento, setFiltroSegmento] = useState('');

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['meus-clientes'],
    queryFn: async () => {
      const response = await api.get('/clientes');
      return response.data;
    }
  });

  const clientesFiltrados = (clientes as any[]).filter(c =>
    (!busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca)) &&
    (!filtroSegmento || c.segmento === filtroSegmento)
  );

  return (
    <Layout>
      <div className="space-y-4 p-4">
        <h1 className="text-xl font-bold text-gray-900">Meus Clientes</h1>

        {/* Busca */}
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />

        {/* Filtro segmento */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['', 'RESTAURANTE', 'SUPERMERCADO', 'PADARIA', 'HOTEL', 'EVENTO'].map(seg => (
            <button
              key={seg}
              onClick={() => setFiltroSegmento(seg)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${filtroSegmento === seg ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
              style={filtroSegmento === seg ? { backgroundColor: COLORS.PRIMARY } : {}}
            >
              {seg || 'Todos'}
            </button>
          ))}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {clientesFiltrados.map((cliente: any) => (
              <div key={cliente.id} className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderColor: COLORS.PRIMARY }}>
                <h3 className="font-bold text-gray-900">{cliente.nome}</h3>
                <p className="text-sm text-gray-600">{cliente.endereco}</p>
                <div className="flex items-center gap-2 mt-2">
                  {cliente.telefone && (
                    <a href={`tel:${cliente.telefone}`} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                      Ligar
                    </a>
                  )}
                  {cliente.whatsapp && (
                    <a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                      WhatsApp
                    </a>
                  )}
                  {cliente.segmento && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{cliente.segmento}</span>
                  )}
                </div>
                {cliente.ultima_compra && (
                  <p className="text-xs text-gray-500 mt-2">Última compra: {new Date(cliente.ultima_compra).toLocaleDateString('pt-BR')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VendedorClientesPage;
