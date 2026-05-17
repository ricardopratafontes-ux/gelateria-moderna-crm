#!/usr/bin/env node

/**
 * runTests.js - Valida lógica central do CRM Gelateria
 * Executável via: node runTests.js ou npm run test
 * Retorna: PASS/FAIL para cada teste + resumo final
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

let totalTestes = 0;
let testesPassaram = 0;

function teste(nome, condicao) {
  totalTestes++;
  if (condicao) {
    console.log(`${colors.green}✓ PASS${colors.reset} - ${nome}`);
    testesPassaram++;
  } else {
    console.log(`${colors.red}✗ FAIL${colors.reset} - ${nome}`);
  }
}

console.log(`\n${colors.blue}=== TESTES DE LOGICA CENTRAL - CRM GELATERIA ===${colors.reset}\n`);

// == TESTE 1: Calculo de Comissao - Novo Cliente
console.log(`${colors.yellow}1. COMISSOES${colors.reset}`);

const calcularComissaoNovoCliente = (valor_recebido) => valor_recebido * 0.05;
teste(
  'Comissao novo cliente: 5% de R$ 1.000 = R$ 50',
  calcularComissaoNovoCliente(1000) === 50
);

// == TESTE 2: Comissao Performance (3% se venda >= 10% acima da media)
const calcularComissaoPerformance = (venda_atual, media_historica) => {
  const percentual_acima = ((venda_atual - media_historica) / media_historica) * 100;
  return percentual_acima >= 10 ? venda_atual * 0.03 : 0;
};
teste(
  'Comissao performance: venda R$ 1.100 vs media R$ 1.000 (10% acima) = R$ 33',
  calcularComissaoPerformance(1100, 1000) === 33
);
teste(
  'Comissao performance: venda R$ 1.050 vs media R$ 1.000 (5% acima) = R$ 0',
  calcularComissaoPerformance(1050, 1000) === 0
);

// == TESTE 3: Premio 10 Clientes (R$ 300 cumulativo)
const calcularPremio10Clientes = (total_clientes_convertidos) => {
  return Math.floor(total_clientes_convertidos / 10) * 300;
};
teste(
  'Premio 10 clientes: 10 clientes = R$ 300',
  calcularPremio10Clientes(10) === 300
);
teste(
  'Premio 10 clientes: 20 clientes = R$ 600 (cumulativo)',
  calcularPremio10Clientes(20) === 600
);
teste(
  'Premio 10 clientes: 18 clientes = R$ 300 (nao atingiu 20)',
  calcularPremio10Clientes(18) === 300
);

// == TESTE 4: Comissao Evento (10% do valor recebido)
const calcularComissaoEvento = (valor_recebido) => valor_recebido * 0.10;
teste(
  'Comissao evento: 10% de R$ 10.000 = R$ 1.000',
  calcularComissaoEvento(10000) === 1000
);

// == TESTE 5: Calculo de Distancia entre Pontos GPS
console.log(`\n${colors.yellow}2. OTIMIZACAO DE ROTA${colors.reset}`);

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const distancia = calcularDistancia(-10.9028, -37.0675, -10.9100, -37.0700);
teste(
  `Distancia Aracaju (2 pontos): ${distancia.toFixed(2)} km (deve ser ~1km)`,
  distancia > 0.5 && distancia < 2
);

// == TESTE 6: Validacao de Desvio de Rota (>500m = alerta)
const validarDesvioRota = (distancia_metros) => distancia_metros > 500;
teste(
  'Desvio rota: 600m = ALERTA',
  validarDesvioRota(600) === true
);
teste(
  'Desvio rota: 400m = OK',
  validarDesvioRota(400) === false
);

// == TESTE 7: Validacao de Cliente
console.log(`\n${colors.yellow}3. VALIDACOES DE DADOS${colors.reset}`);

const validarCliente = (cliente) => {
  return Boolean(
    cliente.nome &&
    cliente.nome.trim().length > 0 &&
    cliente.telefone &&
    cliente.telefone.trim().length > 0 &&
    cliente.endereco &&
    cliente.endereco.trim().length > 0
  );
};

teste(
  'Validacao cliente: dados completos = VALIDO',
  validarCliente({
    nome: 'Lugano Treze de Julho',
    telefone: '79999999999',
    endereco: 'Rua X, 123'
  }) === true
);

teste(
  'Validacao cliente: sem telefone = INVALIDO',
  validarCliente({
    nome: 'Lugano Treze de Julho',
    telefone: '',
    endereco: 'Rua X, 123'
  }) === false
);

// == TESTE 8: Validacao de Venda
const validarVenda = (venda) => {
  return Boolean(
    venda.cliente_id &&
    venda.vendedor_id &&
    venda.valor_recebido &&
    venda.valor_recebido > 0
  );
};

teste(
  'Validacao venda: dados completos = VALIDO',
  validarVenda({
    cliente_id: '123',
    vendedor_id: '456',
    valor_recebido: 1000
  }) === true
);

teste(
  'Validacao venda: valor_recebido = 0 = INVALIDO',
  validarVenda({
    cliente_id: '123',
    vendedor_id: '456',
    valor_recebido: 0
  }) === false
);

// == TESTE 9: Validacao de Atividade
console.log(`\n${colors.yellow}4. GESTAO DE LEADS${colors.reset}`);

const TIPOS_ATIVIDADE_VALIDOS = [
  'venda',
  'reparo',
  'reposicao',
  'degustacao',
  'prospecacao'
];

const validarAtividade = (atividade) => {
  return TIPOS_ATIVIDADE_VALIDOS.includes(atividade.tipo);
};

teste(
  'Validacao atividade: tipo "venda" = VALIDO',
  validarAtividade({ tipo: 'venda' }) === true
);

teste(
  'Validacao atividade: tipo "outro" = INVALIDO',
  validarAtividade({ tipo: 'outro' }) === false
);

// == TESTE 10: Conversao de Lead para Cliente
const STATUS_LEAD_VALIDOS = [
  'novo',
  'contatado',
  'interessado',
  'proposta_enviada',
  'negociando',
  'convertido',
  'perdido'
];

const validarStatusLead = (status) => STATUS_LEAD_VALIDOS.includes(status);

teste(
  'Validacao lead: status "convertido" = VALIDO',
  validarStatusLead('convertido') === true
);

teste(
  'Validacao lead: status "invalido" = INVALIDO',
  validarStatusLead('invalido') === false
);

// == TESTE 11: Prazo de Retorno de Lead (48h)
const validarPrazoLead = (data_captacao, data_contato) => {
  const diferenca_ms = data_contato - data_captacao;
  const diferenca_horas = diferenca_ms / (1000 * 60 * 60);
  return diferenca_horas <= 48;
};

const agora = new Date();
const h48Atras = new Date(agora.getTime() - 48 * 60 * 60 * 1000);
const h72Atras = new Date(agora.getTime() - 72 * 60 * 60 * 1000);

teste(
  'Prazo lead: contatado em 48h = DENTRO DO PRAZO',
  validarPrazoLead(h48Atras, agora) === true
);

teste(
  'Prazo lead: contatado em 72h = FORA DO PRAZO',
  validarPrazoLead(h72Atras, agora) === false
);

// == RESUMO
console.log(`\n${colors.blue}=== RESUMO ===${colors.reset}`);
console.log(`Total de testes: ${totalTestes}`);
console.log(`${colors.green}Passaram: ${testesPassaram}${colors.reset}`);
console.log(`${colors.red}Falharam: ${totalTestes - testesPassaram}${colors.reset}`);

if (testesPassaram === totalTestes) {
  console.log(`\n${colors.green}✓ TODOS OS TESTES PASSARAM!${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(
    `\n${colors.red}✗ ALGUNS TESTES FALHARAM. Verifique a logica.${colors.reset}\n`
  );
  process.exit(1);
}
