import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { whatsappService } from '../services/whatsappService';
import { configService } from '../services/configService';

const prisma = new PrismaClient();

export function iniciarAlertasCriticos() {
  // Alerta único consolidado às 18h (seg-sáb)
  cron.schedule('0 18 * * 1-6', async () => {
    try {
      console.log('[ALERTA] Gerando resumo consolidado 18h...');
      await alertaConsolidado18h();
    } catch (error) {
      console.error('[ALERTA] Erro no alerta consolidado 18h:', error);
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

async function alertaConsolidado18h() {
  const whatsappGerente = process.env.WHATSAPP_GERENTE;
  if (!whatsappGerente) return;

  const metaVisitasDia = await configService.getNumber('meta_visitas_dia');
  const prazoHoras = await configService.getNumber('prazo_retorno_lead_horas');

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let msg = '*📊 Resumo do dia — 18h*\n\n';

  // === VENDEDORES: visitas e propostas ===
  const vendedores = await prisma.vendedor.findMany({ where: { status: 'ativo' } });

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
    msg += `${emoji} *${vendedor.nome}*\n   Visitas: ${visitasHoje}/${metaVisitasDia} | Propostas: ${propostasHoje}\n`;
  }

  // === LEADS EM RISCO ===
  const leads = await prisma.lead.findMany({
    where: { status: { in: ['novo', 'contatado', 'interessado'] } }
  });

  const leadsEmRisco = leads.filter(lead => {
    const ref = lead.data_ultimo_contato || lead.data_criacao;
    const horas = (Date.now() - ref.getTime()) / (1000 * 60 * 60);
    return horas > prazoHoras;
  });

  if (leadsEmRisco.length > 0) {
    msg += `\n⚠️ *${leadsEmRisco.length} lead(s) em risco (>${prazoHoras}h sem contato):*\n`;
    for (const lead of leadsEmRisco.slice(0, 5)) {
      const ref = lead.data_ultimo_contato || lead.data_criacao;
      const horas = Math.floor((Date.now() - ref.getTime()) / (1000 * 60 * 60));
      msg += `   • ${lead.nome} — ${horas}h sem contato\n`;
    }
    if (leadsEmRisco.length > 5) {
      msg += `   ... e mais ${leadsEmRisco.length - 5}\n`;
    }
  }

  await whatsappService.enviarMensagem(whatsappGerente, msg);
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
