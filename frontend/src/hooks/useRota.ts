import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rotasService } from '../services/rotasService';
import { atividadesService } from '../services/atividadesService';

interface ClienteRota {
  cliente_id: string;
  nome: string;
  endereco: string;
  telefone: string;
  segmento: string;
  ordem: number;
  prioridade: number;
  dias_sem_visita?: number;
}

export function useRota(vendedor_id: string | null) {
  const [clienteAtual, setClienteAtual] = useState<number>(0);
  const [atividadeAtiva, setAtividadeAtiva] = useState<string | null>(null);

  const hoje = new Date().toISOString().split('T')[0];

  // Buscar rota do dia
  const { data: rotaDoDia, isLoading, refetch } = useQuery({
    queryKey: ['rota', hoje],
    queryFn: () => rotasService.buscarRotaDoDia(hoje),
    enabled: !!vendedor_id,
    retry: false
  });

  // Buscar atividades do dia
  const { data: atividadesDoDia, refetch: refetchAtividades } = useQuery({
    queryKey: ['atividades-hoje', vendedor_id],
    queryFn: () => atividadesService.buscarHoje(vendedor_id!),
    enabled: !!vendedor_id,
    refetchInterval: 30000
  });

  // Verificar se há atividade em andamento
  useEffect(() => {
    if (atividadesDoDia?.resumo?.em_andamento) {
      setAtividadeAtiva(atividadesDoDia.resumo.em_andamento);
    } else {
      setAtividadeAtiva(null);
    }
  }, [atividadesDoDia]);

  // Extrair clientes da rota
  const clientes: ClienteRota[] = rotaDoDia?.clientes_sequencia || [];

  // Iniciar atividade
  const iniciarAtividade = useCallback(async (
    cliente_id: string,
    tipo: string,
    latitude?: number,
    longitude?: number
  ) => {
    if (!vendedor_id) return null;

    const atividade = await atividadesService.iniciar({
      vendedor_id,
      cliente_id,
      rota_id: rotaDoDia?.id,
      tipo,
      latitude,
      longitude
    });

    setAtividadeAtiva(atividade.id);
    await refetchAtividades();
    return atividade;
  }, [vendedor_id, rotaDoDia, refetchAtividades]);

  // Concluir atividade
  const concluirAtividade = useCallback(async (
    resultado: string,
    dados?: {
      observacoes?: string;
      fotos?: string[];
      latitude_fim?: number;
      longitude_fim?: number;
      valor_pedido?: number;
    }
  ) => {
    if (!atividadeAtiva) return null;

    const atividade = await atividadesService.concluir(atividadeAtiva, {
      resultado,
      ...dados
    });

    setAtividadeAtiva(null);
    setClienteAtual(prev => prev + 1);
    await refetchAtividades();
    return atividade;
  }, [atividadeAtiva, refetchAtividades]);

  // Progresso
  const visitasRealizadas = atividadesDoDia?.resumo?.concluidas || 0;
  const totalClientes = clientes.length;
  const progresso = totalClientes > 0 ? (visitasRealizadas / totalClientes) * 100 : 0;

  return {
    rotaDoDia,
    clientes,
    clienteAtual,
    setClienteAtual,
    atividadeAtiva,
    atividadesDoDia: atividadesDoDia?.atividades || [],
    visitasRealizadas,
    totalClientes,
    progresso,
    isLoading,
    iniciarAtividade,
    concluirAtividade,
    refetch
  };
}
