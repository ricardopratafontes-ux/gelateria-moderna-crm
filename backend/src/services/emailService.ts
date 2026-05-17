import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const emailService = {
  // ENVIAR EMAIL GENÉRICO
  async enviarEmail(para: string, assunto: string, html: string) {
    try {
      await transporter.sendMail({
        from: `"Gelateria Moderna CRM" <${process.env.EMAIL_USER}>`,
        to: para,
        subject: assunto,
        html
      });
      console.log(`[EMAIL] Enviado para ${para}: ${assunto}`);
    } catch (error) {
      console.error('[EMAIL] Erro ao enviar:', error);
      throw error;
    }
  },

  // RELATÓRIO SEMANAL POR EMAIL
  async enviarRelatorioSemanal(dados: any) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f31c40; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Relatório Semanal</h1>
          <p style="margin: 5px 0 0;">${dados.periodo}</p>
        </div>

        <div style="padding: 20px; background: #fffaf2;">
          <h2 style="color: #98472d;">Resumo Geral</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Visitas realizadas</strong></td>
              <td style="padding: 8px; text-align: right;">${dados.visitas}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Propostas enviadas</strong></td>
              <td style="padding: 8px; text-align: right;">${dados.propostas}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Propostas aceitas</strong></td>
              <td style="padding: 8px; text-align: right;">${dados.propostasAceitas}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Valor em propostas</strong></td>
              <td style="padding: 8px; text-align: right;">R$ ${dados.valorPropostas.toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Valor aceito</strong></td>
              <td style="padding: 8px; text-align: right;">R$ ${dados.valorAceitas.toFixed(2)}</td>
            </tr>
          </table>

          <h2 style="color: #98472d; margin-top: 20px;">Leads</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Novos</strong></td>
              <td style="padding: 8px; text-align: right;">${dados.leadsNovos}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Convertidos</strong></td>
              <td style="padding: 8px; text-align: right;">${dados.leadsConvertidos}</td>
            </tr>
          </table>

          <h2 style="color: #98472d; margin-top: 20px;">Financeiro</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Total recebido</strong></td>
              <td style="padding: 8px; text-align: right; color: green;">R$ ${dados.totalRecebido.toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Comissões geradas</strong></td>
              <td style="padding: 8px; text-align: right;">R$ ${dados.totalComissoes.toFixed(2)}</td>
            </tr>
          </table>

          <h2 style="color: #98472d; margin-top: 20px;">Performance por Vendedor</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f31c40; color: white;">
              <th style="padding: 8px; text-align: left;">Vendedor</th>
              <th style="padding: 8px; text-align: center;">Visitas</th>
              <th style="padding: 8px; text-align: center;">Propostas</th>
            </tr>
            ${dados.vendedores.map((v: any) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">${v.nome}</td>
                <td style="padding: 8px; text-align: center;">${v.visitas}</td>
                <td style="padding: 8px; text-align: center;">${v.propostas}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div style="background: #98472d; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Gelateria Moderna CRM - Relatório Automático</p>
        </div>
      </div>
    `;

    const destinatario = process.env.EMAIL_USER || 'ricardo@gelateriamoderna.com.br';
    await this.enviarEmail(destinatario, `Relatório Semanal - ${dados.periodo}`, html);
  },

  // RELATÓRIO MENSAL POR EMAIL
  async enviarRelatorioMensal(dados: any) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f31c40; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Relatório Mensal</h1>
          <p style="margin: 5px 0 0;">${dados.mes}</p>
        </div>

        <div style="padding: 20px; background: #fffaf2;">
          <h2 style="color: #98472d;">Faturamento</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Total vendido</strong></td>
              <td style="padding: 8px; text-align: right;">R$ ${dados.totalVendas.toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Total recebido</strong></td>
              <td style="padding: 8px; text-align: right; color: green;">R$ ${dados.totalRecebido.toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Vendas pendentes</strong></td>
              <td style="padding: 8px; text-align: right; color: ${dados.vendasPendentes > 0 ? 'red' : 'green'};">${dados.vendasPendentes}</td>
            </tr>
          </table>

          <h2 style="color: #98472d; margin-top: 20px;">Operacional</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Total de visitas</strong></td>
              <td style="padding: 8px; text-align: right;">${dados.totalVisitas}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Clientes novos</strong></td>
              <td style="padding: 8px; text-align: right;">${dados.clientesNovos}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Leads gerados</strong></td>
              <td style="padding: 8px; text-align: right;">${dados.leadsTotal}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;"><strong>Leads convertidos</strong></td>
              <td style="padding: 8px; text-align: right;">${dados.leadsConvertidos}</td>
            </tr>
          </table>

          <h2 style="color: #98472d; margin-top: 20px;">Comissões - R$ ${dados.totalComissoes.toFixed(2)}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f31c40; color: white;">
              <th style="padding: 8px; text-align: left;">Vendedor</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
            ${dados.comissoesPorVendedor.map((v: any) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">${v.nome}</td>
                <td style="padding: 8px; text-align: right;">R$ ${v.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>

          <h2 style="color: #98472d; margin-top: 20px;">Top 10 Clientes</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f31c40; color: white;">
              <th style="padding: 8px; text-align: left;">#</th>
              <th style="padding: 8px; text-align: left;">Cliente</th>
              <th style="padding: 8px; text-align: right;">Valor</th>
            </tr>
            ${dados.topClientes.map((c: any, i: number) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">${i + 1}</td>
                <td style="padding: 8px;">${c.nome}</td>
                <td style="padding: 8px; text-align: right;">R$ ${c.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div style="background: #98472d; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Gelateria Moderna CRM - Relatório Automático</p>
        </div>
      </div>
    `;

    const destinatario = process.env.EMAIL_USER || 'ricardo@gelateriamoderna.com.br';
    await this.enviarEmail(destinatario, `Relatório Mensal - ${dados.mes}`, html);
  }
};
