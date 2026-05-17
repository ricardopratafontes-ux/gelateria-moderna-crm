import axios from 'axios';

const TEXTMEBOT_API = axios.create({
  baseURL: 'https://api.textmebot.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const whatsappService = {
  // ENVIAR MENSAGEM WHATSAPP
  async enviarMensagem(telefone: string, mensagem: string) {
    try {
      const response = await TEXTMEBOT_API.post('/send', {
        apikey: process.env.TEXTMEBOT_API_KEY,
        phone: telefone.replace(/\D/g, ''),
        message: mensagem
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      throw error;
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
