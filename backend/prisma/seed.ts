import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // 1. Criar usuário gerente
  const senhaGerente = await bcrypt.hash('gelateria2026', 10);
  const gerente = await prisma.usuario.upsert({
    where: { email: 'ricardo@gelateriamoderna.com.br' },
    update: {},
    create: {
      nome: 'Ricardo',
      email: 'ricardo@gelateriamoderna.com.br',
      senha_hash: senhaGerente,
      role: 'gerente',
      ativo: true
    }
  });
  console.log(`Gerente criado: ${gerente.email}`);

  // 2. Criar usuário vendedor
  const senhaVendedor = await bcrypt.hash('vendedor2026', 10);
  const usuarioVendedor = await prisma.usuario.upsert({
    where: { email: 'vendedor@gelateriamoderna.com.br' },
    update: {},
    create: {
      nome: 'Vendedor 1',
      email: 'vendedor@gelateriamoderna.com.br',
      senha_hash: senhaVendedor,
      role: 'vendedor',
      ativo: true
    }
  });
  console.log(`Usuário vendedor criado: ${usuarioVendedor.email}`);

  // 3. Criar vendedor no cadastro
  const vendedor = await prisma.vendedor.upsert({
    where: { id: usuarioVendedor.id },
    update: {},
    create: {
      id: usuarioVendedor.id,
      nome: 'Vendedor 1',
      email: 'vendedor@gelateriamoderna.com.br',
      whatsapp: '5579988298722',
      regiao: 'Aracaju',
      status: 'ativo',
      meta_visitas_dia: 10,
      data_admissao: new Date()
    }
  });
  console.log(`Vendedor cadastrado: ${vendedor.nome}`);

  // 4. Criar parâmetros iniciais
  const parametros = [
    { chave: 'comissao_novo_cliente', valor: '5', descricao: 'Comissão novo cliente (%)' },
    { chave: 'comissao_performance', valor: '3', descricao: 'Comissão performance (%)' },
    { chave: 'comissao_evento', valor: '10', descricao: 'Comissão evento (%)' },
    { chave: 'premio_10_clientes', valor: '300', descricao: 'Prêmio a cada 10 leads convertidos (R$)' },
    { chave: 'meta_visitas_dia', valor: '10', descricao: 'Meta de visitas por dia' },
    { chave: 'prazo_retorno_lead_h', valor: '48', descricao: 'Prazo máximo retorno lead (horas)' },
    { chave: 'raio_desvio_rota_m', valor: '500', descricao: 'Raio máximo desvio de rota (metros)' }
  ];

  for (const param of parametros) {
    await prisma.parametro.upsert({
      where: { chave: param.chave },
      update: { valor: param.valor },
      create: param
    });
  }
  console.log(`${parametros.length} parâmetros configurados`);

  // 5. Criar alguns clientes de exemplo
  const clientesExemplo = [
    {
      nome_fantasia: 'Restaurante Mangue Seco',
      telefone: '79999001122',
      email: 'contato@mangueseco.com.br',
      endereco: 'Rua Itabaiana, 200 - Centro, Aracaju/SE',
      segmento: 'RESTAURANTE',
      status: 'ativo',
      latitude: -10.9111,
      longitude: -37.0717
    },
    {
      nome_fantasia: 'Hotel Celi',
      telefone: '79999223344',
      email: 'compras@hotelceli.com.br',
      endereco: 'Av. Santos Dumont, 1500 - Atalaia, Aracaju/SE',
      segmento: 'HOTEL',
      status: 'ativo',
      latitude: -10.9833,
      longitude: -37.0392
    },
    {
      nome_fantasia: 'Padaria Pão Nosso',
      telefone: '79999445566',
      email: 'padariapaonosso@gmail.com',
      endereco: 'Rua Lagarto, 450 - Centro, Aracaju/SE',
      segmento: 'PADARIA',
      status: 'ativo',
      latitude: -10.9150,
      longitude: -37.0700
    },
    {
      nome_fantasia: 'Supermercado GBarbosa Jardins',
      telefone: '79999667788',
      email: 'compras.jardins@gbarbosa.com.br',
      endereco: 'Av. Min. Geraldo Barreto Sobral - Jardins, Aracaju/SE',
      segmento: 'SUPERMERCADO',
      status: 'ativo',
      latitude: -10.9450,
      longitude: -37.0600
    },
    {
      nome_fantasia: 'Restaurante Caçarola do Fabrício',
      telefone: '79999889900',
      email: 'fabricio@casarola.com.br',
      endereco: 'Rua Niceu Dantas, 80 - Atalaia, Aracaju/SE',
      segmento: 'RESTAURANTE',
      status: 'ativo',
      latitude: -10.9780,
      longitude: -37.0410
    }
  ];

  for (const cliente of clientesExemplo) {
    await prisma.cliente.create({
      data: {
        ...cliente,
        data_cadastro: new Date(),
        origem: 'seed'
      }
    });
  }
  console.log(`${clientesExemplo.length} clientes de exemplo criados`);

  console.log('\nSeed concluído com sucesso!');
  console.log('\nCredenciais de acesso:');
  console.log('  Gerente: ricardo@gelateriamoderna.com.br / gelateria2026');
  console.log('  Vendedor: vendedor@gelateriamoderna.com.br / vendedor2026');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
