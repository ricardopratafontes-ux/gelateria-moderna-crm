# Guia de Deploy - Gelateria Moderna CRM

## Pré-requisitos
- Conta no [Supabase](https://supabase.com)
- Conta no [Railway](https://railway.app)
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

## PASSO 2: Railway (Backend)

### 2.1 Criar projeto
1. https://railway.app → New Project → Deploy from GitHub
2. Selecione o repositório → pasta `backend/`
3. Ou: New Project → Empty Project → Add Service from GitHub

### 2.2 Configurar variáveis de ambiente
No painel do serviço → Variables, adicione TODAS:

```
DATABASE_URL=postgresql://....(do Supabase)
JWT_SECRET=gere-com-openssl-rand-base64-32
OMIE_APP_SECRET=7bd5bd04c7a6e1f8ad2fb6feb6d5d6ff
OMIE_API_KEY=7185468814524
GOOGLE_MAPS_API_KEY=AIzaSyB-hFrZWSa2xhF1cDhiOw-7wsaIIvEI1q4
TEXTMEBOT_API_KEY=S5S38GqJLM59
TEXTMEBOT_PHONE=5579988298722
EMAIL_USER=ricardo@gelateriamoderna.com.br
EMAIL_PASSWORD=sua-senha-email
WHATSAPP_GERENTE=5579981319569
WHATSAPP_GRUPO=
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-anon-key
NODE_ENV=production
PORT=3001
```

### 2.3 Configurar domínio
1. Settings → Networking → Generate Domain
2. Anote a URL (ex: gelateria-api.railway.app)
3. Ou configure custom domain

### 2.4 Verificar deploy
- Acesse: `https://sua-url.railway.app/health`
- Deve retornar: `{"status":"ok",...}`

---

## PASSO 3: Vercel (Frontend)

### 3.1 Criar projeto
1. https://vercel.com → Import Project → GitHub
2. Selecione repositório → Root Directory: `frontend/`
3. Framework: Vite

### 3.2 Variáveis de ambiente
```
VITE_API_URL=https://gelateria-api.railway.app/api
VITE_GOOGLE_MAPS_KEY=AIzaSyB-hFrZWSa2xhF1cDhiOw-7wsaIIvEI1q4
```

### 3.3 Configurar domínio
- Vercel gera automaticamente: `gelateria-moderna.vercel.app`
- Ou configure custom domain

### 3.4 Atualizar vercel.json
Se a URL do Railway for diferente de `gelateria-api.railway.app`, atualize o rewrite no `vercel.json`.

---

## PASSO 4: Validação

### Checklist pós-deploy:
- [ ] `/health` do Railway retorna OK
- [ ] Login funciona (gerente + vendedor)
- [ ] Dashboard carrega dados
- [ ] App vendedor carrega rota
- [ ] WhatsApp recebe mensagem de teste
- [ ] Cron jobs aparecem no log do Railway

### Testar WhatsApp:
Acesse Railway logs e aguarde o próximo ciclo de 15min dos alertas, ou force via API:
```bash
curl -X POST https://sua-url.railway.app/api/rotas/planejar \
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
- Verifique se o rewrite do vercel.json aponta para a URL correta do Railway
- Ou adicione a URL do Vercel no CORS do backend

### Jobs não executam
- Verifique NODE_ENV != 'test' no Railway
- Verifique logs: `[JOBS] Todos os jobs agendados com sucesso!`

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
git push origin main           # Auto-deploy Railway + Vercel
```
