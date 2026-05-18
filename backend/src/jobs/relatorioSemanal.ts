import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { whatsappService } from '../services/whatsappService';
import { emailService } from '../services/emailService';
import { configService } from '../services/configService';

const prisma = new PrismaClient();

export function iniciarRelatorioSemanal() {
  // Executa todo sábado às 9h
  cron.schedule('0 9 * * 6', async () => {
    const ativo = await configService.getBool('relatorio_semanal_ativo');
    if (!ativo) {
      console.log('[JOB] Relatório semanal DESATIVADO nas configurações');
      return;
    }
    console.log('[JOB] Relatório semanal iniciado');
    try {
      await gerarRelatorioSemanal();
    } catch (error) {
      console.error('[JOB] Erro no relatório semanal:', error);
    }
  });
}

async function gerarRelatorioSemanal() {
  const hoje = new Date();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - 7);
  inicioSemana.setHours(0, 0, 0, 0);

  // 1. Visitas da semana
  const visitas = await prisma.atividade.findMany({
    where: {
      data_hora_inicio: { gte: inicioSemana },
      resultado: 'concluida'
    }
  });

  // 2. Propostas da semana
  const propostas = await prisma.proposta.findMany({
    where: {
      data_criacao: { gte: inicioSemana }
    }
  });

  const propostasAceitas = propostas.filter(p => p.status === 'aceita');
  const valorPropostas = propostas.reduce((acc, p) => acc + Number(p.valor_total || 0), 0);
  const valorAceitas = propostasAceitas.reduce((acc, p) => acc + Number(p.valor_total || 0), 0);

  // 3. Leads da semana
  const leadsNovos = await prisma.lead.count({
    where: {
      data_criacao: { gte: inicioSemana }
    }
  });

  const leadsConvertidos = await prisma.lead.count({
    where: {
      status: 'convertido',
      data_conversao: { gte: inicioSemana }
    }
  });

  // 4. Vendas recebidas na semana
  const vendasRecebidas = await prisma.venda.findMany({
    where: {
      data_recebimento: { gte: inicioSemana },
      status: 'recebimento'
    }
  });

  const totalRecebido = vendasRecebidas.reduce((acc, v) => acc + Number(v.valor_recebido || 0), 0);

  // 5. Comissões da semana
  const comissoes = await prisma.comissao.findMany({
    where: {
      data_calculo: { gte: inicioSemana }
    }
  });

  const totalComissoes = comissoes.reduce((acc, c) => acc + Number(c.valor || 0), 0);

  // 6. Performance por vendedor
  const vendedores = await prisma.vendedor.findMany({
    where: { status: 'ativo' }
  });

  let performanceVendedores = '';
  for (const vendedor of vendedores) {
    const visitasVendedor = visitas.filter(v => v.vendedor_id === vendedor.id).length;
    const propostasVendedor = propostas.filter(p => p.vendedor_id === vendedor.id).length;
    const diasUteis = 6; // seg-sab
    const mediaVisitasDia = (visitasVendedor / diasUteis).toFixed(1);

    performanceVendedores += `\n👤 ${vendedor.nome}\n`;
    performanceVendedores += `   Visitas: ${visitasVendedor} (média ${mediaVisitasDia}/dia)\n`;
    performanceVendedores += `   Propostas: ${propostasVendedor}\n`;
  }

  // 7. Montar relatório WhatsApp
  const relatorioWhatsApp = `*📊 RELATÓRIO SEMANAL*\n*${formatarData(inicioSemana)} a ${formatarData(hoje)}*\n\n` +
    `*Visitas:* ${visitas.length}\n` +
    `*Propostas:* ${propostas.length} (${propostasAceitas.length} aceitas)\n` +
    `*Valor propostas:* R$ ${valorPropostas.toFixed(2)}\n` +
    `*Valor aceitas:* R$ ${valorAceitas.toFixed(2)}\n\n` +
    `*Leads novos:* ${leadsNovos}\n` +
    `*Leads convertidos:* ${leadsConvertidos}\n\n` +
    `*Vendas recebidas:* R$ ${totalRecebido.toFixed(2)}\n` +
    `*Comissões geradas:* R$ ${totalComissoes.toFixed(2)}\n\n` +
    `*Performance:*${performanceVendedores}`;

  // 8. Enviar via WhatsApp para gerente
  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (whatsappGerente) {
    try {
      await whatsappService.enviarMensagem(whatsappGerente, relatorioWhatsApp);
      console.log('[JOB] Relatório semanal enviado via WhatsApp');
    } catch (err) {
      console.error('[JOB] Erro ao enviar relatório via WhatsApp:', err);
    }
  }

  // 9. Enviar via WhatsApp para grupo (se configurado)
  const whatsappGrupo = process.env.WHATSAPP_GRUPO;
  if (whatsappGrupo) {
    try {
      await whatsappService.enviarMensagem(whatsappGrupo, relatorioWhatsApp);
    } catch (err) {
      console.error('[JOB] Erro ao enviar relatório para grupo:', err);
    }
  }

  // 10. Enviar via email
  try {
    await emailService.enviarRelatorioSemanal({
      periodo: `${formatarData(inicioSemana)} a ${formatarData(hoje)}`,
      visitas: visitas.length,
      propostas: propostas.length,
      propostasAceitas: propostasAceitas.length,
      valorPropostas,
      valorAceitas,
      leadsNovos,
      leadsConvertidos,
      totalRecebido,
      totalComissoes,
      vendedores: vendedores.map(v => ({
        nome: v.nome,
        visitas: visitas.filter(vis => vis.vendedor_id === v.id).length,
        propostas: propostas.filter(p => p.vendedor_id === v.id).length
      }))
    });
    console.log('[JOB] Relatório semanal enviado via email');
  } catch (err) {
    console.error('[JOB] Erro ao enviar relatório via email:', err);
  }
}

function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
