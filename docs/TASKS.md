# TASKS.md - CRM Gelateria

**Projeto:** CRM de gelateria com rastreamento de vendedor, otimização de rotas, propostas automáticas, comissionamento automático, gestão de leads.

**Última atualização:** 17/05/2026

## Em andamento

- [ ] Deploy frontend na Vercel
- [ ] Teste end-to-end (login + dashboard + WhatsApp)

## Próximas (pós-MVP)

- [ ] Otimização avançada de rota (Traveling Salesman via Google Maps)
- [ ] Mobile app otimizado (offline, notificações push)
- [ ] Analytics e insights avançados
- [ ] Preparar para 2º vendedor
- [ ] Gestão de leads com automação completa (funil)
- [ ] Relatório mensal detalhado com validação de pendências

## Ideias futuras (baixa prioridade)

- [ ] Eventos (sistema separado, comissão 10%)
- [ ] Food service (canal adicional)
- [ ] Clube do Gelato (assinaturas)
- [ ] Multi-zona (se expandir)
- [ ] Treinamento de IA customizada

## Concluído

- [x] Exploração do projeto e planejamento
- [x] Criação de CLAUDE.md, TASKS.md, runTests.js, scripts de automação
- [x] Schema Prisma (11 tabelas: clientes, vendedores, rotas, atividades, propostas, vendas, leads, comissoes, freezers, parametros, usuarios)
- [x] Migration SQL inicial
- [x] API completa (CRUD clientes, vendedores, rotas, atividades, propostas, comissoes, leads, auth)
- [x] Middleware JWT de autenticação
- [x] Integração OMIE (sincronização clientes e vendas)
- [x] Integração Google Maps (geocoding, otimização de rota)
- [x] Integração TextMeBot (WhatsApp: rota, proposta, alertas)
- [x] Serviço de comissões (novo cliente 5%, performance 3%, prêmio R$300, evento 10%)
- [x] Serviço de email (relatórios)
- [x] 5 cron jobs (planejamento diário 7h, relatório semanal sábado 9h, sincronização OMIE 30min, alertas críticos 15min, relatório mensal)
- [x] Dashboard gerente (mapa, visitas, alertas, KPIs)
- [x] App vendedor (rota do dia, registrar atividade, GPS, fotos)
- [x] Frontend completo (login, dashboard, vendedor, services, hooks)
- [x] Seed script (gerente + vendedor + 5 clientes Aracaju)
- [x] Correções de consistência (schema ↔ rotas ↔ migration)
- [x] Repositório GitHub criado e código pushed
- [x] Supabase configurado (banco PostgreSQL + migrations rodadas + seed executado)
- [x] Deploy backend no Render.com (free tier, build com --include=dev)
- [x] Fix: tsconfig.json (removido baseUrl deprecado, adicionado types:["node"])
- [x] Fix: whatsappService.ts (nome → nome_fantasia)
- [x] Documentação atualizada (CLAUDE.md, DEPLOY.md, TASKS.md → Railway→Render)
