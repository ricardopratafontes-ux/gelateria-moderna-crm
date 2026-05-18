import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { whatsappService } from '../services/whatsappService';
import { emailService } from '../services/emailService';
import { configService } from '../services/configService';

const prisma = new PrismaClient();

export function iniciarRelatorioMensal() {
  // Executa no dia 5 de cada mês às 8h (dá margem para recebimentos atrasados)
  cron.schedule('0 8 5 * *', async () => {
    const ativo = await configService.getBool('relatorio_mensal_ativo');
    if (!ativo) {
      console.log('[JOB] Relatório mensal DESATIVADO nas configurações');
      return;
    }
    console.log('[JOB] Relatório mensal iniciado');
    try {
      await gerarRelatorioMensal();
    } catch (error) {
      console.error('[JOB] Erro no relatório mensal:', error);
    }
  });
}

async function gerarRelatorioMensal() {
  // Mês anterior
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);

  // 1. Verificar vendas pendentes
  const vendasPendentes = await prisma.venda.findMany({
    where: {
      data_venda: { gte: inicioMes, lte: fimMes },
      status: { notIn: ['recebimento', 'cancelada'] }
    }
  });

  if (vendasPendentes.length > 0) {
    const whatsappGerente = process.env.WHATSAPP_GERENTE;
    if (whatsappGerente) {
      await whatsappService.enviarAlerta(
        whatsappGerente,
        'Relatório mensal com pendências',
        `${vendasPendentes.length} vendas do mês anterior ainda não foram recebidas.\nO relatório será gerado com dados parciais.`
      );
    }
  }

  // 2. Vendas do mês
  const vendas = await prisma.venda.findMany({
    where: {
      data_venda: { gte: inicioMes, lte: fimMes }
    },
    include: { cliente: true }
  });

  const totalVendas = vendas.reduce((acc, v) => acc + Number(v.valor_total || 0), 0);
  const totalRecebido = vendas
    .filter(v => v.status === 'recebimento')
    .reduce((acc, v) => acc + Number(v.valor_recebido || 0), 0);

  // 3. Comissões do mês
  const comissoes = await prisma.comissao.findMany({
    where: {
      data_calculo: { gte: inicioMes, lte: fimMes }
    },
    include: { vendedor: true }
  });

  const totalComissoes = comissoes.reduce((acc, c) => acc + Number(c.valor || 0), 0);

  // Agrupar comissões por vendedor
  const comissoesPorVendedor: Record<string, { nome: string; total: number; detalhes: any[] }> = {};
  for (const comissao of comissoes) {
    const vendedorId = comissao.vendedor_id;
    if (!comissoesPorVendedor[vendedorId]) {
      comissoesPorVendedor[vendedorId] = {
        nome: comissao.vendedor?.nome || 'N/A',
        total: 0,
        detalhes: []
      };
    }
    comissoesPorVendedor[vendedorId].total += Number(comissao.valor);
    comissoesPorVendedor[vendedorId].detalhes.push({
      tipo: comissao.tipo_comissao,
      valor: Number(comissao.valor)
    });
  }

  // 4. Clientes novos no mês
  const clientesNovos = await prisma.cliente.count({
    where: {
      data_cadastro: { gte: inicioMes, lte: fimMes }
    }
  });

  // 5. Leads do mês
  const leadsTotal = await prisma.lead.count({
    where: {
      data_criacao: { gte: inicioMes, lte: fimMes }
    }
  });

  const leadsConvertidos = await prisma.lead.count({
    where: {
      data_conversao: { gte: inicioMes, lte: fimMes },
      status: 'convertido'
    }
  });

  // 6. Visitas do mês
  const totalVisitas = await prisma.atividade.count({
    where: {
      data_hora_inicio: { gte: inicioMes, lte: fimMes },
      resultado: 'concluida'
    }
  });

  // 7. Top 10 clientes por faturamento
  const vendasPorCliente: Record<string, { nome: string; total: number }> = {};
  for (const venda of vendas.filter(v => v.status === 'recebimento')) {
    const clienteId = venda.cliente_id;
    if (!vendasPorCliente[clienteId]) {
      vendasPorCliente[clienteId] = {
        nome: venda.cliente?.nome_fantasia || 'N/A',
        total: 0
      };
    }
    vendasPorCliente[clienteId].total += Number(venda.valor_recebido || 0);
  }

  const topClientes = Object.values(vendasPorCliente)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // 8. Montar nome do mês
  const nomeMes = inicioMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // 9. Relatório WhatsApp (resumido)
  const relatorioWhatsApp = `*📊 RELATÓRIO MENSAL - ${nomeMes.toUpperCase()}*\n\n` +
    `*Faturamento:* R$ ${totalVendas.toFixed(2)}\n` +
    `*Recebido:* R$ ${totalRecebido.toFixed(2)}\n` +
    `*Pendente:* ${vendasPendentes.length} vendas\n\n` +
    `*Visitas:* ${totalVisitas}\n` +
    `*Clientes novos:* ${clientesNovos}\n` +
    `*Leads:* ${leadsTotal} (${leadsConvertidos} convertidos)\n\n` +
    `*Comissões:* R$ ${totalComissoes.toFixed(2)}\n` +
    Object.values(comissoesPorVendedor).map(v =>
      `  ${v.nome}: R$ ${v.total.toFixed(2)}`
    ).join('\n') +
    `\n\n*Top 3 clientes:*\n` +
    topClientes.slice(0, 3).map((c, i) =>
      `  ${i + 1}. ${c.nome}: R$ ${c.total.toFixed(2)}`
    ).join('\n') +
    `\n\nRelatório completo enviado por email.`;

  // 10. Enviar WhatsApp
  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (whatsappGerente) {
    try {
      await whatsappService.enviarMensagem(whatsappGerente, relatorioWhatsApp);
      console.log('[JOB] Relatório mensal enviado via WhatsApp');
    } catch (err) {
      console.error('[JOB] Erro ao enviar relatório mensal WhatsApp:', err);
    }
  }

  // 11. Enviar email completo
  try {
    await emailService.enviarRelatorioMensal({
      mes: nomeMes,
      totalVendas,
      totalRecebido,
      vendasPendentes: vendasPendentes.length,
      totalVisitas,
      clientesNovos,
      leadsTotal,
      leadsConvertidos,
      totalComissoes,
      comissoesPorVendedor: Object.values(comissoesPorVendedor),
      topClientes
    });
    console.log('[JOB] Relatório mensal enviado via email');
  } catch (err) {
    console.error('[JOB] Erro ao enviar relatório mensal email:', err);
  }
}
