import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { whatsappService } from '../services/whatsappService';
import { configService } from '../services/configService';

const prisma = new PrismaClient();

export function iniciarAlertasCriticos() {
  // Executa a cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
    try {
      if (await configService.getBool('alerta_lead_risco_ativo')) {
        await verificarLeadsEmRisco();
      }
      if (await configService.getBool('alerta_vendedor_parado_ativo')) {
        await verificarVendedorParado();
      }
      if (await configService.getBool('alerta_meta_diaria_ativo')) {
        await verificarMetaDiaria();
      }
    } catch (error) {
      console.error('[ALERTA] Erro nos alertas críticos:', error);
    }
  });

  // Alerta meio-dia: progresso da meta
  cron.schedule('59 11 * * 1-6', async () => {
    try {
      if (await configService.getBool('alerta_progresso_meiodia_ativo')) {
        await alertaProgressoMeioDia();
      }
    } catch (error) {
      console.error('[ALERTA] Erro no alerta meio-dia:', error);
    }
  });

  // Alerta fim do dia: resumo
  cron.schedule('0 17 * * 1-6', async () => {
    try {
      if (await configService.getBool('alerta_resumo_fim_dia_ativo')) {
        await alertaResumoFimDoDia();
      }
    } catch (error) {
      console.error('[ALERTA] Erro no alerta fim do dia:', error);
    }
  });
}

async function verificarLeadsEmRisco() {
  const prazoHoras = await configService.getNumber('prazo_retorno_lead_horas');

  const leads = await prisma.lead.findMany({
    where: {
      status: {
        in: ['novo', 'contatado', 'interessado']
      }
    }
  });

  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (!whatsappGerente) return;

  for (const lead of leads) {
    const horasSemContato = lead.data_ultimo_contato
      ? (Date.now() - lead.data_ultimo_contato.getTime()) / (1000 * 60 * 60)
      : (Date.now() - lead.data_criacao.getTime()) / (1000 * 60 * 60);

    if (horasSemContato > prazoHoras) {
      try {
        await whatsappService.enviarAlerta(
          whatsappGerente,
          'Lead em risco',
          `Lead "${lead.nome}" está há ${Math.floor(horasSemContato)}h sem contato.\nPrazo limite: ${prazoHoras}h\nOrigem: ${lead.origem || 'N/A'}`
        );
      } catch (err) {
        // Continua para próximo lead
      }
    }
  }
}

async function verificarVendedorParado() {
  const tempoParadoMin = await configService.getNumber('tempo_vendedor_parado_min');

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendedores = await prisma.vendedor.findMany({
    where: { status: 'ativo' }
  });

  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (!whatsappGerente) return;

  for (const vendedor of vendedores) {
    const horaAtual = new Date().getHours();
    if (horaAtual < 8 || horaAtual > 17) continue;

    const ultimaAtividade = await prisma.atividade.findFirst({
      where: {
        vendedor_id: vendedor.id,
        data_hora_inicio: { gte: hoje }
      },
      orderBy: { data_hora_inicio: 'desc' }
    });

    if (!ultimaAtividade && horaAtual > 9) {
      await whatsappService.enviarAlerta(
        whatsappGerente,
        'Vendedor sem atividade',
        `${vendedor.nome} não registrou nenhuma atividade hoje.\nHora atual: ${horaAtual}h`
      );
    } else if (ultimaAtividade) {
      const minutosSemAtividade = (Date.now() - ultimaAtividade.data_hora_inicio.getTime()) / (1000 * 60);
      if (minutosSemAtividade > tempoParadoMin && ultimaAtividade.resultado) {
        await whatsappService.enviarAlerta(
          whatsappGerente,
          'Vendedor parado',
          `${vendedor.nome} está há ${Math.floor(minutosSemAtividade)}min sem nova atividade.`
        );
      }
    }
  }
}

async function verificarMetaDiaria() {
  const horaAtual = new Date().getHours();
  if (horaAtual < 15) return;

  const metaVisitasDia = await configService.getNumber('meta_visitas_dia');

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendedores = await prisma.vendedor.findMany({
    where: { status: 'ativo' }
  });

  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (!whatsappGerente) return;

  for (const vendedor of vendedores) {
    const visitasHoje = await prisma.atividade.count({
      where: {
        vendedor_id: vendedor.id,
        data_hora_inicio: { gte: hoje },
        resultado: 'concluida'
      }
    });

    if (visitasHoje < metaVisitasDia * 0.5) {
      await whatsappService.enviarAlerta(
        whatsappGerente,
        'Meta em risco',
        `${vendedor.nome}: apenas ${visitasHoje}/${metaVisitasDia} visitas às ${horaAtual}h.\nMeta diária pode não ser atingida.`
      );
    }
  }
}

async function alertaProgressoMeioDia() {
  const metaVisitasDia = await configService.getNumber('meta_visitas_dia');

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendedores = await prisma.vendedor.findMany({
    where: { status: 'ativo' }
  });

  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (!whatsappGerente) return;

  let resumo = '*Progresso meio-dia:*\n\n';

  for (const vendedor of vendedores) {
    const visitasHoje = await prisma.atividade.count({
      where: {
        vendedor_id: vendedor.id,
        data_hora_inicio: { gte: hoje },
        resultado: 'concluida'
      }
    });

    const emoji = visitasHoje >= metaVisitasDia / 2 ? '✅' : '⚠️';
    resumo += `${emoji} ${vendedor.nome}: ${visitasHoje}/${metaVisitasDia}\n`;
  }

  await whatsappService.enviarMensagem(whatsappGerente, resumo);
}

async function alertaResumoFimDoDia() {
  const metaVisitasDia = await configService.getNumber('meta_visitas_dia');

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendedores = await prisma.vendedor.findMany({
    where: { status: 'ativo' }
  });

  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (!whatsappGerente) return;

  let resumo = '*Resumo do dia:*\n\n';

  for (const vendedor of vendedores) {
    const visitasHoje = await prisma.atividade.count({
      where: {
        vendedor_id: vendedor.id,
        data_hora_inicio: { gte: hoje },
        resultado: 'concluida'
      }
    });

    const propostasHoje = await prisma.proposta.count({
      where: {
        vendedor_id: vendedor.id,
        data_criacao: { gte: hoje }
      }
    });

    const emoji = visitasHoje >= metaVisitasDia ? '🏆' : visitasHoje >= 7 ? '✅' : '❌';
    resumo += `${emoji} ${vendedor.nome}\n   Visitas: ${visitasHoje}/${metaVisitasDia}\n   Propostas: ${propostasHoje}\n\n`;
  }

  await whatsappService.enviarMensagem(whatsappGerente, resumo);
}
