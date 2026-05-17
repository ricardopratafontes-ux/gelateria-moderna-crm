# 🚀 CLAUDE.md - CRM Gelateria Moderna

⚠️ **LEIA ESTE ARQUIVO NO INÍCIO DE CADA SESSÃO ANTES DE QUALQUER EDIÇÃO**

---

## 1️⃣ STACK & TECNOLOGIAS

### Frontend
- React 18 + TypeScript (Vercel)
- TailwindCSS + Shadcn/ui (componentes)
- React Query (cache de dados)
- Leaflet ou Google Maps SDK (mapas)
- Axios (requisições HTTP)

### Backend
- Node.js 18+ + Express (Render)
- PostgreSQL (Supabase)
- Prisma ORM (queries ao banco)
- JWT (autenticação)
- Node-cron (jobs agendados)

### Integrações
- OMIE API (clientes, vendas, status)
- Google Maps API (rotas, geocoding)
- TextMeBot (WhatsApp)
- Supabase Auth (login)
- Supabase Storage (fotos)

### Infraestrutura
- Vercel (frontend deploy)
- Render (backend deploy)
- Supabase (banco + auth + storage)
- GitHub (versionamento)

---

## 2️⃣ ESTRUTURA DE ARQUIVOS

```
projeto-crm-gelateria/
├── frontend/                    # React app (Vercel)
│   ├── src/
│   │   ├── components/          # Componentes reutilizáveis
│   │   │   ├── Dashboard.tsx    # Dashboard gerente
│   │   │   ├── AppVendedor.tsx  # App vendedor (mobile)
│   │   │   ├── MapaRota.tsx     # Mapa com rota do dia
│   │   │   └── FormProposta.tsx # Geração de proposta
│   │   ├── pages/               # Páginas (Next.js style)
│   │   │   ├── login.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── vendedor.tsx
│   │   │   └── relatorios.tsx
│   │   ├── services/            # Chamadas à API
│   │   │   ├── api.ts           # Configuração Axios
│   │   │   ├── clientesService.ts
│   │   │   ├── rotasService.ts
│   │   │   ├── atividadesService.ts
│   │   │   └── comissoesService.ts
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useGPS.ts
│   │   │   └── useRota.ts
│   │   ├── utils/               # Funções utilitárias
│   │   │   ├── formatters.ts    # Formatação de dados
│   │   │   ├── validators.ts    # Validações
│   │   │   └── constants.ts     # Constantes globais
│   │   ├── styles/              # CSS global
│   │   └── App.tsx              # Componente raiz
│   ├── public/                  # Assets estáticos
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.local               # Variáveis de ambiente
│
├── backend/                     # Node.js API (Render)
│   ├── src/
│   │   ├── routes/              # Endpoints da API
│   │   │   ├── clientes.ts
│   │   │   ├── vendedores.ts
│   │   │   ├── rotas.ts
│   │   │   ├── atividades.ts
│   │   │   ├── propostas.ts
│   │   │   ├── comissoes.ts
│   │   │   ├── leads.ts
│   │   │   └── auth.ts
│   │   ├── controllers/         # Lógica de negócio
│   │   │   ├── clienteController.ts
│   │   │   ├── rotaController.ts
│   │   │   ├── comissaoController.ts
│   │   │   └── leadController.ts
│   │   ├── services/            # Serviços (integrações)
│   │   │   ├── omieService.ts         # Integração OMIE
│   │   │   ├── googleMapsService.ts
│   │   │   ├── whatsappService.ts
│   │   │   ├── comissaoService.ts
│   │   │   └── rotaService.ts
│   │   ├── jobs/                # Cron jobs
│   │   │   ├── planejamentoRotaDiaria.ts  (7h)
│   │   │   ├── relatorioSemanal.ts        (sábado 9h)
│   │   │   ├── sincronizacaoOMIE.ts       (30min)
│   │   │   ├── alertasCriticos.ts         (contínuo)
│   │   │   └── relatorioMensal.ts         (1º dia útil)
│   │   ├── middleware/          # Middlewares
│   │   │   ├── auth.ts          # Validação JWT
│   │   │   ├── errorHandler.ts
│   │   │   └── logger.ts
│   │   ├── models/              # Schemas Prisma
│   │   │   └── schema.prisma    # Definição do banco
│   │   ├── utils/               # Utilitários
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   └── index.ts             # Entrada da API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                     # Variáveis de ambiente
│   └── prisma/
│       └── migrations/          # Histórico de migrações
│
├── docs/                        # Documentação
│   ├── CLAUDE.md                # Este arquivo
│   ├── TASKS.md                 # Tarefas (próximas, backlog, ideias)
│   ├── API.md                   # Documentação de endpoints
│   └── ARQUITETURA.md           # Diagramas e fluxos
│
├── scripts/                     # Scripts de automação
│   ├── preview.sh               # Deploy em teste
│   ├── deploy.sh                # Deploy em produção
│   ├── rollback.sh              # Reverter produção
│   ├── update_lines.sh          # Atualizar CLAUDE.md
│   └── runTests.js              # Validar lógica central
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml            # GitHub Actions
│
├── .gitignore
├── README.md
└── package.json (root)
```

---

## 3️⃣ CONSTANTES & VARIÁVEIS GLOBAIS

### Localização: `frontend/src/utils/constants.ts`

```typescript
// Cores da marca
export const COLORS = {
  PRIMARY: '#f31c40',      // Vermelho
  SECONDARY: '#c9e7bd',    // Verde claro
  TERTIARY: '#98472d',     // Marrom
  BACKGROUND: '#fffaf2',   // Bege
  WHITE: '#ffffff',
  BLACK: '#000000'
};

// Metas e limites
export const LIMITS = {
  META_VISITAS_DIA: 10,
  TEMPO_MEDIO_VISITA_MIN: 40,
  RAIO_DESVIO_ROTA_M: 500,
  PRAZO_RETORNO_LEAD_H: 48,
  DIAS_SEM_VISITA_ALERTA: 7
};

// Frequência de visitas por segmento (dias)
export const FREQUENCIA_IDEAL = {
  RESTAURANTE: 3,
  SUPERMERCADO: 7,
  PADARIA: 5,
  HOTEL: 5,
  EVENTO: 14,
  COLEGIO: 30
};

// Comissões (%)
export const COMISSOES = {
  NOVO_CLIENTE: 5,
  PERFORMANCE: 3,
  EVENTO: 10,
  EXPANSAO_CANAL: 5,
  PREMIO_10_CLIENTES: 300
};

// Horários de jobs
export const HORARIOS = {
  PLANEJAMENTO_ROTA: '07:00',
  RELATORIO_SEMANAL: '09:00',
  ALERTA_1: '11:59',
  ALERTA_2: '17:00'
};
```

### Localização: `backend/src/utils/constants.ts`

```typescript
// URLs de APIs externas
export const URLS = {
  OMIE_API: 'https://app.omie.com.br/api/v1',
  GOOGLE_MAPS: 'https://maps.googleapis.com/maps/api',
  TEXTMEBOT: 'https://api.textmebot.com/send'
};

// Status de vendas (OMIE)
export const STATUS_VENDA = {
  VENDAS: 'vendas',
  SEPARACAO: 'separacao',
  FATURAMENTO: 'faturamento',
  ENTREGA: 'entrega',
  RECEBIMENTO: 'recebimento'
};

// Status de leads
export const STATUS_LEAD = [
  'novo',
  'contatado',
  'interessado',
  'proposta_enviada',
  'negociando',
  'convertido',
  'perdido'
];
```

---

## 4️⃣ FUNÇÕES & MÓDULOS PRINCIPAIS

### Backend - `backend/src/services/comissaoService.ts`
**Função:** Calcular comissões automáticas baseado em vendas, leads e performance

Métodos principais:
- `calcularNovoCliente(venda)` → Retorna 5% do valor recebido
- `calcularPerformance(venda, cliente)` → Compara venda vs. média histórica, retorna 3% se ≥10%
- `calcularPremio10Clientes(vendedor)` → Conta leads convertidos, retorna R$ 300 a cada 10
- `calcularEvento(venda)` → Retorna 10% do valor recebido (parcelado)
- `contabilizarComissao(venda)` → Registra no banco, entra no relatório mensal
- `estornarComissao(cliente_id)` → Remove comissões se cliente ficar inadimplente

### Backend - `backend/src/services/rotaService.ts`
**Função:** Otimizar rota diária usando Google Maps API

Métodos principais:
- `planejamentoRotaDiaria(vendedor_id, data)` → Busca clientes, calcula prioridade, otimiza sequência
- `otimizarSequencia(clientes)` → Traveling salesman problem via Google Maps
- `calcularDistancia(lat1, lon1, lat2, lon2)` → Distância entre pontos
- `enviarRotaViaWhatsapp(vendedor_id, rota)` → Envia via TextMeBot

### Frontend - `frontend/src/hooks/useRota.ts`
**Função:** Hook para gerenciar rota do dia no app vendedor

Métodos principais:
- `useRota()` → Retorna rota do dia, cliente atual, progresso
- `iniciarAtividade(cliente_id, tipo)` → Registra GPS, timestamp
- `concluirAtividade(resultado, fotos)` → Salva atividade, sincroniza
- `desvioRota()` → Detecta se vendedor saiu >500m da rota

### Backend - `backend/src/jobs/sincronizacaoOMIE.ts`
**Função:** Sincronizar dados com OMIE a cada 30min

O que faz:
1. Busca status de todas as vendas no OMIE
2. Atualiza etapas (vendas → separação → faturamento → entrega → recebimento)
3. Quando status = "recebimento", registra data + valor recebido
4. Dispara cálculo de comissões
5. Atualiza relatório de comissões

---

## 5️⃣ PADRÕES DO PROJETO

### Como adicionar um novo endpoint na API

1. Crie arquivo em `backend/src/routes/novo.ts`:
```typescript
import express from 'express';
import { auth } from '../middleware/auth';
import { novoController } from '../controllers/novoController';

const router = express.Router();

router.get('/', auth, novoController.listar);
router.post('/', auth, novoController.criar);
router.put('/:id', auth, novoController.atualizar);
router.delete('/:id', auth, novoController.deletar);

export default router;
```

2. Registre em `backend/src/index.ts`:
```typescript
import novoRoutes from './routes/novo';
app.use('/api/novo', novoRoutes);
```

3. Crie controller em `backend/src/controllers/novoController.ts`
4. Crie service em `backend/src/services/novoService.ts`
5. Atualize `docs/API.md` com documentação

### Como adicionar um novo cron job

1. Crie arquivo em `backend/src/jobs/meuJob.ts`:
```typescript
import cron from 'node-cron';

export function iniciarMeuJob() {
  cron.schedule('0 7 * * *', async () => {
    console.log('Job executando às 7h');
    // Sua lógica aqui
  });
}
```

2. Chame em `backend/src/index.ts`:
```typescript
import { iniciarMeuJob } from './jobs/meuJob';
iniciarMeuJob();
```

### Como adicionar um novo componente React

1. Crie em `frontend/src/components/MeuComponente.tsx`:
```typescript
import React from 'react';
import { COLORS } from '../utils/constants';

interface Props {
  titulo: string;
  dados: any[];
}

export const MeuComponente: React.FC<Props> = ({ titulo, dados }) => {
  return (
    <div style={{ color: COLORS.PRIMARY }}>
      <h2>{titulo}</h2>
      {/* Seu JSX aqui */}
    </div>
  );
};
```

2. Exporte em `frontend/src/components/index.ts`:
```typescript
export { MeuComponente } from './MeuComponente';
```

3. Use em outras páginas:
```typescript
import { MeuComponente } from '../components';
```

---

## 6️⃣ GOTCHAS - ERROS QUE JÁ ACONTECERAM

### ❌ GOTCHA 1: Sincronização OMIE desincroniza comissões
**Problema:** Se a sincronização OMIE falhar, as comissões não são calculadas
**Solução:** Sempre verificar status de sincronização antes de calcular comissões
```typescript
const vendas = await buscarVendasOmie();
if (!vendas) {
  console.error('OMIE offline - comissões não calculadas');
  return;
}
```

### ❌ GOTCHA 2: GPS contínuo drena bateria
**Problema:** Rastreamento de GPS 24/7 mata a bateria do celular
**Solução:** GPS ativo apenas durante "Iniciar atividade" até "Concluir atividade"
```typescript
if (atividade.status === 'ativa') {
  iniciarGPS(); // Ativa GPS
} else {
  pararGPS(); // Desativa GPS
}
```

### ❌ GOTCHA 3: Cálculo de comissão com parcelamento
**Problema:** Se cliente paga parcelado, comissão deve cair no mês do recebimento
**Solução:** Registrar `data_recebimento` e `valor_recebido` (não valor_proposta)
```typescript
const comissao = {
  valor_base: venda.valor_recebido, // Não usar valor_proposta
  data_calculo: venda.data_recebimento // Mês do recebimento
};
```

### ❌ GOTCHA 4: Leads se perdem se não tiver prazo
**Problema:** Sem prazo de retorno, leads são esquecidos
**Solução:** Sistema alerta a cada 48h se lead não foi contatado
```typescript
const dias_sem_contato = Math.floor((Date.now() - lead.data_ultimo_contato) / 86400000);
if (dias_sem_contato > 2) {
  enviarAlerta('Lead em risco: ' + lead.nome);
}
```

### ❌ GOTCHA 5: Relatório mensal não fecha se houver pendências
**Problema:** Se houver vendas sem status "recebimento", relatório fica incompleto
**Solução:** Validar que TODAS as vendas do mês têm status final antes de fechar
```typescript
const vendas_pendentes = await buscarVendasPendentes(mes);
if (vendas_pendentes.length > 0) {
  throw new Error(`${vendas_pendentes.length} vendas pendentes`);
}
```

### ❌ GOTCHA 6: Desvio de rota não detecta loop
**Problema:** Vendedor fica em círculo dentro do raio de 500m
**Solução:** Adicionar validação de movimento (deve se mover a cada 15min)
```typescript
const tempo_parado = Date.now() - ultima_localizacao.timestamp;
if (tempo_parado > 15 * 60 * 1000 && desvio < 500) {
  enviarAlerta('Vendedor parado por >15min');
}
```

### ❌ GOTCHA 7: Média histórica prejudicada por meses sem compra
**Problema:** Cliente que não comprou por 3 meses tem média muito baixa
**Solução:** Sistema permite sobrescrever média manualmente, deixa gerenciável
**Campo:** `clientes.media_mensal_customizada` (sobrescreve cálculo automático)

---

## 7️⃣ REGRAS DE EDIÇÃO ESPECÍFICAS

### 🔴 CRÍTICO: Nunca edite estas tabelas manualmente
- `comissoes` (sempre via sistema)
- `vendas` (sincroniza com OMIE)
- `rotas` (gerada automaticamente)

### 🟡 CUIDADO: Edições que requerem validação
- `clientes.media_mensal_customizada` (sobrescreve cálculo automático)
- `leads.status` (dispara alertas)
- `parametros.*` (afeta todos os cálculos)

### 🟢 SEGURO: Pode editar livremente
- `clientes.observacoes`
- `leads.observacoes`
- `atividades.observacoes`

### 📋 Antes de fazer qualquer DELETE:
1. Verificar se está faturado no OMIE
2. Se sim, NÃO DELETAR (apenas marcar como inativo)
3. Se não, pode deletar (mas fazer backup antes)

---

## 8️⃣ URLs RELEVANTES

### Produção
- Frontend: https://gelateria-moderna.vercel.app
- Backend: https://gelateria-moderna-crm.onrender.com
- Banco de dados: Supabase dashboard

### Desenvolvimento
- Frontend local: http://localhost:3000
- Backend local: http://localhost:3001
- Supabase Studio: https://app.supabase.com

### Repositório
- GitHub: https://github.com/ricardopratafontes-ux/gelateria-moderna-crm
- Branch principal: `main` (produção)
- Branch desenvolvimento: `develop`

### APIs Externas
- OMIE: https://app.omie.com.br/api/v1 (credenciais: app secret + api key)
- Google Maps: https://maps.googleapis.com/maps/api (API key)
- TextMeBot: https://api.textmebot.com/send (API key)

### Painéis
- Supabase (banco): https://supabase.com/dashboard/project/svruwxhbpuobmcifrjcp
- Vercel (frontend): https://vercel.com/dashboard
- Render (backend): https://dashboard.render.com
- GitHub (código): https://github.com/ricardopratafontes-ux/gelateria-moderna-crm

---

## 9️⃣ CHECKLIST PRÉ-EXECUÇÃO

### Antes de fazer QUALQUER mudança no código:
- [ ] Você leu este arquivo (CLAUDE.md)?
- [ ] Você fez `git pull` (sincronizou com repositório)?
- [ ] Você criou uma branch nova (`git checkout -b feature/sua-feature`)?
- [ ] Você rodou `npm install` (atualizou dependências)?
- [ ] Você rodou `npm run test` (validou lógica)?
- [ ] Você rodou `npm run dev` (testou localmente)?

### Antes de fazer DEPLOY:
- [ ] Você testou em `preview` (staging)?
- [ ] Você rodou `runTests()` (validou lógica central)?
- [ ] Você fez commit com mensagem clara (`git commit -m "feat: descrição"`)?
- [ ] Você fez `git push` (enviou para repositório)?
- [ ] Você tem backup local (`scripts/deploy.sh` faz isso)?
- [ ] Você sabe como fazer `rollback` se der problema?

---

## 🔟 PRÓXIMOS PASSOS

1. Leia TASKS.md - Veja o que precisa ser feito
2. Rode `npm run test` - Valide a lógica central
3. Rode `npm run dev` - Teste localmente
4. Leia API.md - Entenda os endpoints
5. Comece a editar - Use os padrões acima

---

**Última atualização:** 16/05/2026
**Próxima revisão:** Após cada deploy em produção
