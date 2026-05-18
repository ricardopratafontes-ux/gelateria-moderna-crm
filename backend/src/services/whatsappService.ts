import axios from 'axios';

// TextMeBot usa GET com query params (não POST com JSON)
// Docs: https://textmebot.com/send-text-messages/
// Delay mínimo recomendado: 5 segundos entre mensagens

export const whatsappService = {
  // ENVIAR MENSAGEM WHATSAPP
  async enviarMensagem(telefone: string, mensagem: string) {
    try {
      const apiKey = process.env.TEXTMEBOT_API_KEY;
      if (!apiKey) {
        console.error('TEXTMEBOT_API_KEY não configurada');
        return { success: false, error: 'API key não configurada' };
      }

      // TextMeBot exige formato +55DDNUMERO (sem o 9 extra do celular)
      // Exemplo correto: +557991052599 (não +5579991052599)
      let phoneClean = telefone.replace(/[^+\d]/g, ''); // mantém + e dígitos
      if (!phoneClean.startsWith('+')) {
        phoneClean = '+' + phoneClean;
      }
      const response = await axios.get('https://api.textmebot.com/send.php', {
        params: {
          recipient: phoneClean,
          apikey: apiKey,
          text: mensagem,
          json: 'yes'
        },
        timeout: 30000
      });

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
