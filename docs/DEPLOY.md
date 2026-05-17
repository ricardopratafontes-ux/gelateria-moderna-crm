# Guia de Deploy - Gelateria Moderna CRM

## Pré-requisitos
- Conta no [Supabase](https://supabase.com)
- Conta no [Render](https://render.com)
- Conta no [Vercel](https://vercel.com)
- Git instalado
- Node.js 18+

---

## PASSO 1: Supabase (Banco de Dados)

### 1.1 Criar projeto
1. Acesse https://supabase.com → New Project
2. Nome: `gelateria-crm`
3. Região: South America (São Paulo)
4. Gere uma senha forte para o banco (GUARDE ESSA SENHA)

### 1.2 Obter DATABASE_URL
1. No dashboard do projeto → Settings → Database
2. Copie a **Connection string (URI)** em "Connection Pooling"
3. Substitua `[YOUR-PASSWORD]` pela senha criada
4. Formato: `postgresql://postgres.xxxx:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

### 1.3 Obter chaves
1. Settings → API
2. Copie: **Project URL** (SUPABASE_URL) e **anon public key** (SUPABASE_KEY)

### 1.4 Rodar migrations (local)
```bash
cd backend
# Atualizar .env com DATABASE_URL real
npx prisma migrate deploy
npx prisma generate
```

### 1.5 Rodar seed
```bash
npm run prisma:seed
```
Isso cria:
- Gerente: ricardo@gelateriamoderna.com.br / gelateria2026
- Vendedor: vendedor@gelateriamoderna.com.br / vendedor2026
- 5 clientes de exemplo em Aracaju
- Parâmetros do sistema

---

## PASSO 2: Render (Backend)

### 2.1 Criar projeto
1. https://render.com → New → Web Service
2. Conecte sua conta GitHub e selecione o repositório `gelateria-moderna-crm`
3. Configure:
   - **Name:** `gelateria-moderna-crm`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install --include=dev && npx prisma generate && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

> ⚠️ IMPORTANTE: O `--include=dev` é necessário porque `NODE_ENV=production` faz o npm pular devDependencies (TypeScript, @types/node, etc.)

### 2.2 Configurar variáveis de ambiente
No painel do serviço → Environment, adicione TODAS:

```
DATABASE_URL=postgresql://....(do Supabase, connection pooling porta 6543)
DIRECT_URL=postgresql://....(do Supabase, conexão direta porta 5432)
JWT_SECRET=gere-com-openssl-rand-base64-32
OMIE_APP_SECRET=7bd5bd04c7a6e1f8ad2fb6feb6d5d6ff
OMIE_API_KEY=7185468814524
GOOGLE_MAPS_API_KEY=AIzaSyB-hFrZWSa2xhF1cDhiOw-7wsaIIvEI1q4
TEXTMEBOT_API_KEY=S5S38GqJLM59
TEXTMEBOT_PHONE=5579988298722
WHATSAPP_GERENTE=5579981319569
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-anon-key
NODE_ENV=production
PORT=3001
```

### 2.3 URL do serviço
- Render gera automaticamente: `https://gelateria-moderna-crm.onrender.com`
- Ou configure custom domain em Settings → Custom Domains

### 2.4 Verificar deploy
- Acesse: `https://gelateria-moderna-crm.onrender.com/health`
- Deve retornar: `{"status":"ok",...}`
- Nota: No plano Free, o serviço "dorme" após 15min sem uso. A primeira requisição pode demorar ~30s.

---

## PASSO 3: Vercel (Frontend)

### 3.1 Criar projeto
1. https://vercel.com → Import Project → GitHub
2. Selecione repositório → Root Directory: `frontend/`
3. Framework: Vite

### 3.2 Variáveis de ambiente
```
VITE_API_URL=https://gelateria-moderna-crm.onrender.com/api
VITE_GOOGLE_MAPS_KEY=AIzaSyB-hFrZWSa2xhF1cDhiOw-7wsaIIvEI1q4
```

### 3.3 Configurar domínio
- Vercel gera automaticamente: `gelateria-moderna.vercel.app`
- Ou configure custom domain

### 3.4 Atualizar vercel.json
Se a URL do Render for diferente de `gelateria-moderna-crm.onrender.com`, atualize o rewrite no `vercel.json`.

---

## PASSO 4: Validação

### Checklist pós-deploy:
- [ ] `/health` do Render retorna OK
- [ ] Login funciona (gerente + vendedor)
- [ ] Dashboard carrega dados
- [ ] App vendedor carrega rota
- [ ] WhatsApp recebe mensagem de teste
- [ ] Cron jobs aparecem no log do Render

### Testar WhatsApp:
Acesse Render logs e aguarde o próximo ciclo de 15min dos alertas, ou force via API:
```bash
curl -X POST https://gelateria-moderna-crm.onrender.com/api/rotas/planejar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vendedor_id":"ID_DO_VENDEDOR","data_rota":"2026-05-17"}'
```

---

## Troubleshooting

### Erro: "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### Erro: "Connection refused" no banco
- Verifique se DATABASE_URL usa pooler (porta 6543, não 5432)
- Adicione `?pgbouncer=true` no final da URL

### Erro: CORS no frontend
- Verifique se o rewrite do vercel.json aponta para a URL correta do Render
- Ou adicione a URL do Vercel no CORS do backend

### Jobs não executam
- Verifique NODE_ENV != 'test' no Render
- Verifique logs: `[JOBS] Todos os jobs agendados com sucesso!`
- Nota: No plano Free do Render, o serviço dorme após 15min sem uso. Jobs só rodam enquanto o serviço está ativo.

### Serviço "dormindo" no Render Free
- O plano gratuito suspende o serviço após 15min de inatividade
- A primeira requisição após dormir leva ~30s (cold start)
- Solução: Upgrade para plano pago ou configurar health check externo (ex: UptimeRobot)

---

## Comandos úteis

```bash
# Local - backend
cd backend
npm run dev                    # Rodar local
npm run prisma:studio          # Visualizar banco
npm run prisma:seed            # Popular banco

# Local - frontend
cd frontend
npm run dev                    # Rodar local (porta 3000)

# Deploy
git add . && git commit -m "feat: descrição"
git push origin main           # Auto-deploy Render + Vercel
```
