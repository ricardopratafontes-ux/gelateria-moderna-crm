import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../utils/constants';
import api from '../services/api';
import { Layout } from '../components/Layout';

interface Configuracao {
  chave: string;
  valor: string;
  descricao: string;
  salvo: boolean;
  updated_at?: string;
}

// Organização visual das seções
const SECOES = [
  {
    titulo: 'Alertas e Notificações',
    descricao: 'Ativar/desativar cada tipo de alerta via WhatsApp',
    icone: '🔔',
    campos: [
      'alerta_lead_risco_ativo',
      'alerta_vendedor_parado_ativo',
      'alerta_meta_diaria_ativo',
      'alerta_progresso_meiodia_ativo',
      'alerta_resumo_fim_dia_ativo',
    ]
  },
  {
    titulo: 'Relatórios Automáticos',
    descricao: 'Controle dos relatórios e planejamento de rota',
    icone: '📊',
    campos: [
      'relatorio_semanal_ativo',
      'relatorio_mensal_ativo',
      'rota_diaria_ativo',
    ]
  },
  {
    titulo: 'Horários dos Jobs',
    descricao: 'Ajuste os horários de execução dos processos automáticos',
    icone: '⏰',
    campos: [
      'horario_rota_diaria',
      'horario_alerta_meiodia',
      'horario_alerta_fimdia',
      'horario_relatorio_semanal',
      'horario_relatorio_mensal',
      'intervalo_alertas_min',
    ]
  },
  {
    titulo: 'Destinatários WhatsApp',
    descricao: 'Números que recebem alertas e relatórios',
    icone: '📱',
    campos: [
      'whatsapp_gerente',
      'whatsapp_grupo',
    ]
  },
  {
    titulo: 'Metas e Limites',
    descricao: 'Parâmetros de performance e monitoramento',
    icone: '🎯',
    campos: [
      'meta_visitas_dia',
      'prazo_retorno_lead_horas',
      'dias_sem_visita_alerta',
      'tempo_vendedor_parado_min',
      'raio_desvio_rota_metros',
    ]
  },
  {
    titulo: 'Rate Limit WhatsApp',
    descricao: 'Controle de velocidade de envio de mensagens',
    icone: '⚡',
    campos: [
      'whatsapp_delay_segundos',
    ]
  }
];

const ConfiguracoesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [alterados, setAlterados] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState({ texto: '', tipo: '' });

  // Buscar configurações
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const response = await api.get('/configuracoes');
      const data = Array.isArray(response.data) ? response.data : [];
      // Preencher valores iniciais
      const valoresIniciais: Record<string, string> = {};
      data.forEach((c: Configuracao) => {
        valoresIniciais[c.chave] = c.valor;
      });
      setValores(valoresIniciais);
      setAlterados(new Set());
      return data;
    }
  });

  // Salvar configurações
  const salvarMutation = useMutation({
    mutationFn: async () => {
      const configuracoes = Array.from(alterados).map(chave => ({
        chave,
        valor: valores[chave]
      }));
      const response = await api.put('/configuracoes', { configuracoes });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
      setMsg({ texto: `${data.atualizados} configurações salvas com sucesso!`, tipo: 'sucesso' });
      setAlterados(new Set());
      setTimeout(() => setMsg({ texto: '', tipo: '' }), 4000);
    },
    onError: (error: any) => {
      setMsg({ texto: `Erro ao salvar: ${error?.response?.data?.error || error.message}`, tipo: 'erro' });
      setTimeout(() => setMsg({ texto: '', tipo: '' }), 5000);
    }
  });

  const handleChange = (chave: string, valor: string) => {
    setValores(prev => ({ ...prev, [chave]: valor }));
    setAlterados(prev => new Set(prev).add(chave));
  };

  const handleToggle = (chave: string) => {
    const novoValor = valores[chave] === 'true' ? 'false' : 'true';
    handleChange(chave, novoValor);
  };

  const isBool = (chave: string) => chave.endsWith('_ativo');
  const isHorario = (chave: string) => chave.startsWith('horario_');
  const isTelefone = (chave: string) => chave.startsWith('whatsapp_');

  const renderCampo = (chave: string) => {
    const config = configs.find((c: Configuracao) => c.chave === chave);
    const descricao = config?.descricao || chave;
    const valor = valores[chave] ?? '';
    const foiAlterado = alterados.has(chave);

    if (isBool(chave)) {
      const ativo = valor === 'true';
      return (
        <div
          key={chave}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: foiAlterado ? '#fffbeb' : 'white',
            borderRadius: 8,
            border: foiAlterado ? '1px solid #f59e0b' : '1px solid #e5e7eb',
            marginBottom: 8
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
              {descricao}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{chave}</div>
          </div>
          <button
            onClick={() => handleToggle(chave)}
            style={{
              width: 52,
              height: 28,
              borderRadius: 14,
              border: 'none',
              background: ativo ? COLORS.PRIMARY : '#d1d5db',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s'
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: 3,
                left: ativo ? 27 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            />
          </button>
        </div>
      );
    }

    return (
      <div
        key={chave}
        style={{
          padding: '12px 16px',
          background: foiAlterado ? '#fffbeb' : 'white',
          borderRadius: 8,
          border: foiAlterado ? '1px solid #f59e0b' : '1px solid #e5e7eb',
          marginBottom: 8
        }}
      >
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1f2937', marginBottom: 4 }}>
          {descricao}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type={isHorario(chave) ? 'time' : isTelefone(chave) ? 'tel' : 'number'}
            value={valor}
            onChange={(e) => handleChange(chave, e.target.value)}
            placeholder={isTelefone(chave) ? '5579991052599' : ''}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 14,
              outline: 'none',
              maxWidth: isHorario(chave) ? 140 : isTelefone(chave) ? 250 : 120
            }}
          />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {chave.includes('min') && !chave.includes('minutos') ? 'min' : ''}
            {chave.includes('horas') ? 'h' : ''}
            {chave.includes('metros') ? 'm' : ''}
            {chave.includes('segundos') ? 's' : ''}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{chave}</div>
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
              Configurações
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
              Ajuste alertas, horários, destinatários e limites do sistema
            </p>
          </div>
          <button
            onClick={() => salvarMutation.mutate()}
            disabled={alterados.size === 0 || salvarMutation.isPending}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: alterados.size > 0 ? COLORS.PRIMARY : '#d1d5db',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              cursor: alterados.size > 0 ? 'pointer' : 'default',
              opacity: salvarMutation.isPending ? 0.7 : 1
            }}
          >
            {salvarMutation.isPending ? 'Salvando...' : `Salvar${alterados.size > 0 ? ` (${alterados.size})` : ''}`}
          </button>
        </div>

        {/* Mensagem de feedback */}
        {msg.texto && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            background: msg.tipo === 'sucesso' ? '#dcfce7' : '#fef2f2',
            color: msg.tipo === 'sucesso' ? '#166534' : '#991b1b',
            fontSize: 14,
            fontWeight: 500
          }}>
            {msg.texto}
          </div>
        )}

        {/* Banner de alterações pendentes */}
        {alterados.size > 0 && (
          <div style={{
            padding: '10px 16px',
            borderRadius: 8,
            marginBottom: 16,
            background: '#fffbeb',
            border: '1px solid #f59e0b',
            color: '#92400e',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>⚠️</span>
            <span>Você tem {alterados.size} alteração(ões) não salva(s)</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            Carregando configurações...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {SECOES.map(secao => (
              <div
                key={secao.titulo}
                style={{
                  background: '#f9fafb',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: 0 }}>
                    {secao.icone} {secao.titulo}
                  </h2>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                    {secao.descricao}
                  </p>
                </div>
                <div>
                  {secao.campos.map(chave => renderCampo(chave))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info de nota de rodapé */}
        <div style={{
          marginTop: 24,
          padding: '12px 16px',
          background: '#f0f9ff',
          borderRadius: 8,
          border: '1px solid #bae6fd',
          fontSize: 13,
          color: '#0c4a6e'
        }}>
          <strong>Nota:</strong> Alterações nos horários dos jobs só entram em vigor após o próximo restart do servidor (deploy).
          Toggles de ativar/desativar e limites numéricos têm efeito imediato (cache de 5 minutos).
        </div>
      </div>
    </Layout>
  );
};

export default ConfiguracoesPage;
