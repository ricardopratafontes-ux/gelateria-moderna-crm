import { PrismaClient } from '@prisma/client';
import { whatsappService } from './whatsappService';

const prisma = new PrismaClient();

// Constantes de comissão
const COMISSAO_NOVO_CLIENTE = 0.05;      // 5%
const COMISSAO_PERFORMANCE = 0.03;        // 3%
const COMISSAO_EVENTO = 0.10;             // 10%
const PREMIO_10_CLIENTES = 300;           // R$ 300 a cada 10 leads convertidos
const THRESHOLD_PERFORMANCE = 0.10;       // 10% acima da média

export const comissaoService = {
  // CONTABILIZAR COMISSÃO QUANDO VENDA É RECEBIDA
  async contabilizarComissao(venda: any) {
    const valorBase = Number(venda.valor_recebido || venda.valor_total);
    if (!valorBase || valorBase <= 0) return;

    const cliente = await prisma.cliente.findUnique({
      where: { id: venda.cliente_id }
    });

    if (!cliente) return;

    const vendedorId = venda.vendedor_id;

    // 1. Comissão de novo cliente (5%)
    await this.calcularNovoCliente(venda, cliente, vendedorId);

    // 2. Comissão de performance (3%)
    await this.calcularPerformance(venda, cliente, vendedorId);

    // 3. Comissão de evento (10%)
    await this.calcularEvento(venda, cliente, vendedorId);

    // 4. Prêmio de 10 clientes convertidos
    await this.calcularPremio10Clientes(vendedorId);
  },

  // 5% DO VALOR RECEBIDO - PRIMEIRO PEDIDO DO CLIENTE
  async calcularNovoCliente(venda: any, cliente: any, vendedorId: string) {
    // Verificar se é a primeira venda deste cliente
    const vendasAnteriores = await prisma.venda.count({
      where: {
        cliente_id: cliente.id,
        status: 'recebimento',
        id: { not: venda.id }
      }
    });

    if (vendasAnteriores > 0) return; // Não é novo cliente

    const valorComissao = Number(venda.valor_recebido) * COMISSAO_NOVO_CLIENTE;

    await prisma.comissao.create({
      data: {
        vendedor_id: vendedorId,
        venda_id: venda.id,
        cliente_id: cliente.id,
        tipo_comissao: 'novo_cliente',
        valor: valorComissao,
        percentual: COMISSAO_NOVO_CLIENTE * 100,
        valor_base: Number(venda.valor_recebido),
        data_calculo: new Date(),
        status: 'pendente',
        descricao: `Novo cliente: ${cliente.nome_fantasia}`
      }
    });

    console.log(`[COMISSAO] Novo cliente ${cliente.nome_fantasia}: R$ ${valorComissao.toFixed(2)}`);
  },

  // 3% SE VENDA >= 10% ACIMA DA MÉDIA HISTÓRICA
  async calcularPerformance(venda: any, cliente: any, vendedorId: string) {
    const mediaHistorica = Number(cliente.media_mensal_customizada || cliente.media_mensal_historica || 0);

    if (mediaHistorica <= 0) return; // Sem histórico para comparar

    const valorRecebido = Number(venda.valor_recebido);
    const percentualAcima = (valorRecebido - mediaHistorica) / mediaHistorica;

    if (percentualAcima < THRESHOLD_PERFORMANCE) return; // Não atingiu 10% acima

    const valorComissao = valorRecebido * COMISSAO_PERFORMANCE;

    await prisma.comissao.create({
      data: {
        vendedor_id: vendedorId,
        venda_id: venda.id,
        cliente_id: cliente.id,
        tipo_comissao: 'performance',
        valor: valorComissao,
        percentual: COMISSAO_PERFORMANCE * 100,
        valor_base: valorRecebido,
        data_calculo: new Date(),
        status: 'pendente',
        descricao: `Performance +${(percentualAcima * 100).toFixed(0)}% acima da média (${cliente.nome_fantasia})`
      }
    });

    console.log(`[COMISSAO] Performance ${cliente.nome_fantasia}: +${(percentualAcima * 100).toFixed(0)}% = R$ ${valorComissao.toFixed(2)}`);
  },

  // 10% DO VALOR RECEBIDO - VENDAS PARA EVENTOS
  async calcularEvento(venda: any, cliente: any, vendedorId: string) {
    if (cliente.segmento !== 'EVENTO') return;

    const valorComissao = Number(venda.valor_recebido) * COMISSAO_EVENTO;

    await prisma.comissao.create({
      data: {
        vendedor_id: vendedorId,
        venda_id: venda.id,
        cliente_id: cliente.id,
        tipo_comissao: 'evento',
        valor: valorComissao,
        percentual: COMISSAO_EVENTO * 100,
        valor_base: Number(venda.valor_recebido),
        data_calculo: new Date(),
        status: 'pendente',
        descricao: `Evento: ${cliente.nome_fantasia}`
      }
    });

    console.log(`[COMISSAO] Evento ${cliente.nome_fantasia}: R$ ${valorComissao.toFixed(2)}`);
  },

  // R$ 300 A CADA 10 LEADS CONVERTIDOS (CUMULATIVO)
  async calcularPremio10Clientes(vendedorId: string) {
    // Contar total de leads convertidos pelo vendedor
    const totalConvertidos = await prisma.lead.count({
      where: {
        vendedor_id: vendedorId,
        status: 'convertido'
      }
    });

    // Contar quantos prêmios já foram dados
    const premiosExistentes = await prisma.comissao.count({
      where: {
        vendedor_id: vendedorId,
        tipo_comissao: 'premio_10_clientes'
      }
    });

    const premiosDevidos = Math.floor(totalConvertidos / 10);

    if (premiosDevidos > premiosExistentes) {
      // Criar prêmio(s) faltante(s)
      const premiosFaltantes = premiosDevidos - premiosExistentes;

      for (let i = 0; i < premiosFaltantes; i++) {
        await prisma.comissao.create({
          data: {
            vendedor_id: vendedorId,
            tipo_comissao: 'premio_10_clientes',
            valor: PREMIO_10_CLIENTES,
            percentual: 0,
            valor_base: 0,
            data_calculo: new Date(),
            status: 'pendente',
            descricao: `Prêmio: ${(premiosExistentes + i + 1) * 10} leads convertidos`
          }
        });

        console.log(`[COMISSAO] Prêmio 10 clientes: R$ ${PREMIO_10_CLIENTES} (${(premiosExistentes + i + 1) * 10} leads)`);
      }

      // Notificar vendedor
      const vendedor = await prisma.vendedor.findUnique({ where: { id: vendedorId } });
      if (vendedor?.whatsapp) {
        await whatsappService.enviarMensagem(
          vendedor.whatsapp,
          `🎉 Parabéns! Você atingiu ${premiosDevidos * 10} leads convertidos!\nPrêmio de R$ ${PREMIO_10_CLIENTES} adicionado à sua comissão.`
        );
      }
    }
  },

  // ESTORNAR COMISSÃO (cliente inadimplente)
  async estornarComissao(clienteId: string) {
    const comissoes = await prisma.comissao.findMany({
      where: {
        cliente_id: clienteId,
        status: 'pendente'
      }
    });

    for (const comissao of comissoes) {
      await prisma.comissao.update({
        where: { id: comissao.id },
        data: {
          status: 'estornada',
          descricao: comissao.descricao + ' [ESTORNADA - inadimplência]'
        }
      });
    }

    console.log(`[COMISSAO] Estornadas ${comissoes.length} comissões do cliente ${clienteId}`);
    return comissoes.length;
  },

  // CONSULTAR COMISSÕES DO VENDEDOR NO MÊS
  async consultarComissoesMes(vendedorId: string, mes?: Date) {
    const referencia = mes || new Date();
    const inicioMes = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
    const fimMes = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0, 23, 59, 59);

    const comissoes = await prisma.comissao.findMany({
      where: {
        vendedor_id: vendedorId,
        data_calculo: { gte: inicioMes, lte: fimMes },
        status: { not: 'estornada' }
      },
      include: { cliente: true, venda: true }
    });

    const total = comissoes.reduce((acc, c) => acc + Number(c.valor), 0);

    const porTipo = {
      novo_cliente: comissoes.filter(c => c.tipo_comissao === 'novo_cliente').reduce((acc, c) => acc + Number(c.valor), 0),
      performance: comissoes.filter(c => c.tipo_comissao === 'performance').reduce((acc, c) => acc + Number(c.valor), 0),
      evento: comissoes.filter(c => c.tipo_comissao === 'evento').reduce((acc, c) => acc + Number(c.valor), 0),
      premio_10_clientes: comissoes.filter(c => c.tipo_comissao === 'premio_10_clientes').reduce((acc, c) => acc + Number(c.valor), 0)
    };

    return { comissoes, total, porTipo };
  }
};
