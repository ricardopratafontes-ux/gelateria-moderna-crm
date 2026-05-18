// Script de importação dos 52 clientes da planilha para o Supabase
// Executar: node scripts/importar-clientes.js
// Requer: backend rodando localmente ou em produção

const axios = require('axios');

// Configurar URL da API
const API_URL = process.env.API_URL || 'https://gelateria-moderna-crm.onrender.com/api';

// Token JWT (fazer login antes e colocar aqui)
const TOKEN = process.env.AUTH_TOKEN || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`
  }
});

// 52 clientes extraídos da planilha "LEVANTAMENTO POR CLIENTE E FAIXA.xlsx"
const clientes = [
  {
    "nome_fantasia": "COLEGIO ESPIRITO SANTO",
    "segmento": "COLEGIO",
    "total_vendas": 27194,
    "media_mensal": 2091.85,
    "observacoes": "Freezer: COMPROU FREEZER | Produto: POTES 150ML | Dias: 5"
  },
  {
    "nome_fantasia": "CANTINA CASA ALEMÃ COLÉGIO MASTER",
    "segmento": "COLEGIO",
    "total_vendas": 5941,
    "media_mensal": 457.0,
    "observacoes": "Freezer: SEM FREEZER | Produto: POTES 150ML | Dias: 5"
  },
  {
    "nome_fantasia": "CANTINA CASA ALEMÃ COLEGIO ARQUI FAROLANDIA",
    "segmento": "COLEGIO",
    "total_vendas": 5320,
    "media_mensal": 409.23,
    "observacoes": "Freezer: SEM FREEZER | Produto: POTES 150ML | Dias: 5"
  },
  {
    "nome_fantasia": "CANTINA COLEGIO MÓDULO",
    "segmento": "COLEGIO",
    "total_vendas": 3732,
    "media_mensal": 287.08,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML | Dias: 5"
  },
  {
    "nome_fantasia": "REDE PRIMAVERA",
    "segmento": "EVENTO",
    "total_vendas": 16750,
    "media_mensal": 1288.46,
    "observacoes": "Freezer: EVENTO | Produto: POTES 150ML | Dias: None"
  },
  {
    "nome_fantasia": "GEOLAB",
    "segmento": "EVENTO",
    "total_vendas": 4770,
    "media_mensal": 366.92,
    "observacoes": "Freezer: EVENTO | Produto: BALDES | Dias: None"
  },
  {
    "nome_fantasia": "AMASE",
    "segmento": "EVENTO",
    "total_vendas": 4150,
    "media_mensal": 319.23,
    "observacoes": "Freezer: EVENTO | Produto: BALDES | Dias: None"
  },
  {
    "nome_fantasia": "Fábio Corrêa Ribeiro",
    "segmento": "EVENTO",
    "total_vendas": 4150,
    "media_mensal": 319.23,
    "observacoes": "Freezer: EVENTO | Produto: BALDES | Dias: None"
  },
  {
    "nome_fantasia": "FAVORITOS TRANSPORTES E EVENTOS",
    "segmento": "EVENTO",
    "total_vendas": 3630,
    "media_mensal": 279.23,
    "observacoes": "Freezer: EVENTO | Produto: POTES 150ML | Dias: None"
  },
  {
    "nome_fantasia": "PORTO FAROL",
    "segmento": "EVENTO",
    "total_vendas": 1385,
    "media_mensal": 106.54,
    "observacoes": "Freezer: EVENTO | Produto: POTES 150ML | Dias: None"
  },
  {
    "nome_fantasia": "IBIS ARACAJU",
    "segmento": "EVENTO",
    "total_vendas": 695,
    "media_mensal": 53.46,
    "observacoes": "Freezer: EVENTO | Produto: BALDES | Dias: None"
  },
  {
    "nome_fantasia": "Quality Hotel Aracaju",
    "segmento": "HOTEL",
    "total_vendas": 34059.16,
    "media_mensal": 2619.94,
    "observacoes": "Freezer: COMPROU FREEZER | Produto: POTES 150ML | Dias: 7"
  },
  {
    "nome_fantasia": "Go Inn Aracaju",
    "segmento": "HOTEL",
    "total_vendas": 10049,
    "media_mensal": 773.0,
    "observacoes": "Freezer: COMPROU FREEZER | Produto: POTES 150ML | Dias: 7"
  },
  {
    "nome_fantasia": "CELI HOTEL ARACAJU",
    "segmento": "HOTEL",
    "total_vendas": 1845,
    "media_mensal": 141.92,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 7"
  },
  {
    "nome_fantasia": "MABENI",
    "segmento": "PADARIA",
    "total_vendas": 8001.9,
    "media_mensal": 615.53,
    "observacoes": "Freezer: SEM FREEZER | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "PANDORO TREZE DE JULHO",
    "segmento": "PADARIA",
    "total_vendas": 13451.8,
    "media_mensal": 1034.75,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "PANDORO JARDIM EUROPA",
    "segmento": "PADARIA",
    "total_vendas": 10128.2,
    "media_mensal": 779.09,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "DELI GARDEN",
    "segmento": "PADARIA",
    "total_vendas": 5203.8,
    "media_mensal": 400.29,
    "observacoes": "Freezer: COMPROU FREEZER | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "REGINA DELI",
    "segmento": "PADARIA",
    "total_vendas": 4803.8,
    "media_mensal": 369.52,
    "observacoes": "Freezer: COMPROU FREEZER | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "FRIGORIFICO GOIAS",
    "segmento": "PADARIA",
    "total_vendas": 4047.2,
    "media_mensal": 311.32,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML | Dias: 7"
  },
  {
    "nome_fantasia": "S. BENTO SERVICOS",
    "segmento": "PADARIA",
    "total_vendas": 1750,
    "media_mensal": 134.62,
    "observacoes": "Freezer: SEM FREEZER | Produto: POTES 150ML | Dias: 7"
  },
  {
    "nome_fantasia": "MAGG'S SANDUICHES",
    "segmento": "RESTAURANTE",
    "total_vendas": 7279,
    "media_mensal": 559.92,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML | Dias: 7"
  },
  {
    "nome_fantasia": "LUGANO TREZE DE JULHO",
    "segmento": "RESTAURANTE",
    "total_vendas": 42155,
    "media_mensal": 3242.69,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "RESTAURANTE BERGAMO CUCINA",
    "segmento": "RESTAURANTE",
    "total_vendas": 36500,
    "media_mensal": 2807.69,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "CASA ALEMÃ MATRIZ",
    "segmento": "RESTAURANTE",
    "total_vendas": 26326,
    "media_mensal": 2025.08,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML | Dias: 7"
  },
  {
    "nome_fantasia": "R3 BOTECO ORIGINAL",
    "segmento": "RESTAURANTE",
    "total_vendas": 10504,
    "media_mensal": 808.0,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML | Dias: 6"
  },
  {
    "nome_fantasia": "CASA ALEMÃ ATALAIA",
    "segmento": "RESTAURANTE",
    "total_vendas": 6927,
    "media_mensal": 532.85,
    "observacoes": "Freezer: COMPROU FREEZER | Produto: POTES 150ML | Dias: 7"
  },
  {
    "nome_fantasia": "MITTRI RESTAURANTE",
    "segmento": "RESTAURANTE",
    "total_vendas": 9450,
    "media_mensal": 726.92,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "CASA ALEMÃ RIOMAR",
    "segmento": "RESTAURANTE",
    "total_vendas": 9008,
    "media_mensal": 692.92,
    "observacoes": "Freezer: COMPROU FREEZER | Produto: POTES 150ML | Dias: 7"
  },
  {
    "nome_fantasia": "CASA DUE - BISTRO",
    "segmento": "RESTAURANTE",
    "total_vendas": 8539,
    "media_mensal": 656.85,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "PIZZA BABBO",
    "segmento": "RESTAURANTE",
    "total_vendas": 8000.04,
    "media_mensal": 615.39,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "PESCATORE",
    "segmento": "RESTAURANTE",
    "total_vendas": 7684,
    "media_mensal": 591.08,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "SAL E BRASA LTDA",
    "segmento": "RESTAURANTE",
    "total_vendas": 5896,
    "media_mensal": 453.54,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML | Dias: 7"
  },
  {
    "nome_fantasia": "GRAND CRU ARACAJU",
    "segmento": "RESTAURANTE",
    "total_vendas": 5520,
    "media_mensal": 424.62,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "FORNERIA DELICATESSEN",
    "segmento": "RESTAURANTE",
    "total_vendas": 5125,
    "media_mensal": 394.23,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 7"
  },
  {
    "nome_fantasia": "TIO ARMENIO",
    "segmento": "RESTAURANTE",
    "total_vendas": 2875,
    "media_mensal": 221.15,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "RESTAURANTE OTTO",
    "segmento": "RESTAURANTE",
    "total_vendas": 2700,
    "media_mensal": 207.69,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "DON RAFAEL",
    "segmento": "RESTAURANTE",
    "total_vendas": 1925,
    "media_mensal": 148.08,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "OSTERIA CB",
    "segmento": "RESTAURANTE",
    "total_vendas": 1725,
    "media_mensal": 132.69,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "STALEIRO 79 Beach Club",
    "segmento": "RESTAURANTE",
    "total_vendas": 1600,
    "media_mensal": 123.08,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "JUJU TORRES CAFE E ATELIE",
    "segmento": "RESTAURANTE",
    "total_vendas": 1550,
    "media_mensal": 119.23,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "CHA DAS CINCO",
    "segmento": "RESTAURANTE",
    "total_vendas": 1000,
    "media_mensal": 76.92,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "JOBIM PRODUCOES E EVENTOS",
    "segmento": "RESTAURANTE",
    "total_vendas": 500,
    "media_mensal": 38.46,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "CORDEL CULINARIA REGIONAL",
    "segmento": "RESTAURANTE",
    "total_vendas": 300,
    "media_mensal": 23.08,
    "observacoes": "Freezer: SEM FREEZER | Produto: BALDES | Dias: 6"
  },
  {
    "nome_fantasia": "G. BARBOSA - HIPER JARDINS B006",
    "segmento": "SUPERMERCADO",
    "total_vendas": 36376.8,
    "media_mensal": 2798.22,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "G. BARBOSA - HIPER FRANCISCO PORTO B020",
    "segmento": "SUPERMERCADO",
    "total_vendas": 28672.8,
    "media_mensal": 2205.6,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "G. BARBOSA - HIPER RIOMAR B090",
    "segmento": "SUPERMERCADO",
    "total_vendas": 26868.6,
    "media_mensal": 2066.82,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "G. BARBOSA - HIPER SUL B004",
    "segmento": "SUPERMERCADO",
    "total_vendas": 26242.2,
    "media_mensal": 2018.63,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "1MINUTO",
    "segmento": "SUPERMERCADO",
    "total_vendas": 16863.0,
    "media_mensal": 1297.15,
    "observacoes": "Freezer: SEM FREEZER | Produto: POTES DE 1L | Dias: 7"
  },
  {
    "nome_fantasia": "SUPERMERCADO HIPER CARNES",
    "segmento": "SUPERMERCADO",
    "total_vendas": 10758.6,
    "media_mensal": 827.58,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "CASA BENVI",
    "segmento": "SUPERMERCADO",
    "total_vendas": 4811.4,
    "media_mensal": 370.11,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML E 500ML | Dias: 7"
  },
  {
    "nome_fantasia": "SUPERMERCADO BOMBOM LTDA",
    "segmento": "SUPERMERCADO",
    "total_vendas": 3906.6,
    "media_mensal": 300.51,
    "observacoes": "Freezer: FREEZER MODERNA | Produto: POTES 150ML E 500ML | Dias: 7"
  }
];

async function importar() {
  console.log(`Importando ${clientes.length} clientes...`);
  
  try {
    const response = await api.post('/clientes/importar', { clientes });
    console.log('Resultado:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

async function mapearCodigosOMIE() {
  console.log('\nBuscando códigos OMIE para todos os clientes...');
  console.log('(Isso pode levar ~1 minuto por causa do rate limit da API OMIE)\n');
  
  try {
    const response = await api.post('/clientes/mapear-omie');
    const result = response.data;
    
    console.log(`Mapeados com sucesso: ${result.mapeados}`);
    
    if (result.nao_encontrados.length > 0) {
      console.log(`\nNão encontrados (${result.nao_encontrados.length}):`);
      result.nao_encontrados.forEach(n => console.log(`  - ${n}`));
    }
    
    if (result.multiplos.length > 0) {
      console.log(`\nMúltiplos resultados (resolver manualmente):`);
      result.multiplos.forEach(m => {
        console.log(`  ${m.nome}:`);
        m.opcoes.forEach(o => console.log(`    -> Código: ${o.codigo_omie} | ${o.nome_fantasia} | CNPJ: ${o.cnpj}`));
      });
    }
    
    if (result.erros.length > 0) {
      console.log(`\nErros: ${result.erros.join(', ')}`);
    }
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

// Executar
async function main() {
  if (!TOKEN) {
    console.error('ERRO: Defina AUTH_TOKEN com um JWT válido');
    console.log('Para obter: POST /api/auth/login com email/senha');
    process.exit(1);
  }
  
  await importar();
  
  // Após importar, buscar códigos OMIE automaticamente
  const args = process.argv.slice(2);
  if (args.includes('--mapear-omie')) {
    await mapearCodigosOMIE();
  } else {
    console.log('\nPara mapear códigos OMIE, execute novamente com --mapear-omie');
  }
}

main();
