import axios from 'axios';

// TextMeBot usa GET com query params (não POST com JSON)
// Docs: https://textmebot.com/send-text-messages/
// Rate limit: 1 mensagem a cada 5 segundos (403 se violar)

// Controle de rate limit - garante intervalo mínimo entre envios
let ultimoEnvio = 0;
const INTERVALO_MINIMO_MS = 6000; // 6 segundos entre mensagens (margem de segurança)

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Normaliza telefone BR para formato TextMeBot: +55DD8DIGITOS (sem 9 extra)
// Aceita: 5579991052599, +5579991052599, 79991052599, +557991052599
// Retorna: +557991052599
function normalizarTelefone(telefone: string): string {
  let digits = telefone.replace(/\D/g, ''); // só dígitos

  // Remover 55 do início se presente
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.substring(2); // fica DD + número
  }

  // Agora temos DD + número (ex: 79991052599 ou 7991052599)
  // Se DD(2) + 9 dígitos = 11 chars, remover o 9 extra (terceiro dígito)
  if (digits.length === 11 && digits[2] === '9') {
    digits = digits.substring(0, 2) + digits.substring(3); // remove o 9 extra
  }

  return '+55' + digits;
}

export const whatsappService = {
  // ENVIAR MENSAGEM WHATSAPP (com rate limiting automático)
  async enviarMensagem(telefone: string, mensagem: string) {
    try {
      const apiKey = process.env.TEXTMEBOT_API_KEY;
      if (!apiKey) {
        console.error('TEXTMEBOT_API_KEY não configurada');
        return { success: false, error: 'API key não configurada' };
      }

      // Respeitar rate limit: aguardar se necessário
      const agora = Date.now();
      const tempoDesdeUltimo = agora - ultimoEnvio;
      if (tempoDesdeUltimo < INTERVALO_MINIMO_MS) {
        const espera = INTERVALO_MINIMO_MS - tempoDesdeUltimo;
        console.log(`[WHATSAPP] Rate limit: aguardando ${espera}ms antes de enviar`);
        await sleep(espera);
      }

      const phoneClean = normalizarTelefone(telefone);
      const response = await axios.get('https://api.textmebot.com/send.php', {
        params: {
          recipient: phoneClean,
          apikey: apiKey,
          text: mensagem,
          json: 'yes'
        },
        timeout: 30000
      });

      ultimoEnvio = Date.now();
      console.log(`[WHATSAPP] Mensagem enviada para ${phoneClean}:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp:', error?.message || error);
      // Não propagar erro para não travar jobs
      return { success: false, error: error?.message };
    }
  },

  // ENVIAR ROTA VIA WHATSAPP
  async enviarRota(telefone: string, rota: any) {
    const clientes = rota.clientes_sequencia || [];
    const listaClientes = clientes
      .map(
        (cliente: any, idx: number) =>
          `${idx + 1}. ${cliente.nome || cliente.cliente_id}\n   ${cliente.endereco || ''}\n   ${cliente.telefone || ''}`
      )
      .join('\n\n');

    const mensagem = `*Sua rota de hoje:*\n\n${listaClientes}\n\nTempo estimado: ${rota.tempo_estimado_minutos || 0}min\nMeta: ${clientes.length} visitas\n\nBoa sorte!`;

    return this.enviarMensagem(telefone, mensagem);
  },

  // ENVIAR PROPOSTA VIA WHATSAPP
  async enviarProposta(telefone: string, cliente: any, link_proposta: string) {
    const mensagem = `Ola ${cliente.nome_fantasia}!\n\nPreparei uma proposta especial de gelato para voce!\n\nClique no link abaixo para visualizar e confirmar seu pedido:\n${link_proposta}\n\nQualquer duvida, e so chamar!`;

    return this.enviarMensagem(telefone, mensagem);
  },

  // ENVIAR ALERTA AO GERENTE
  async enviarAlerta(telefone: string, titulo: string, descricao: string) {
    const mensagem = `*ALERTA: ${titulo}*\n\n${descricao}\n\nVerifique o dashboard para mais informacoes.`;

    return this.enviarMensagem(telefone, mensagem);
  }
};
