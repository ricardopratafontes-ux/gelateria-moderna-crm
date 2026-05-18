import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Importar rotas
import authRoutes from './routes/auth';
import clientesRoutes from './routes/clientes';
import vendedoresRoutes from './routes/vendedores';
import rotasRoutes from './routes/rotas';
import atividadesRoutes from './routes/atividades';
import propostasRoutes from './routes/propostas';
import comissoesRoutes from './routes/comissoes';
import leadsRoutes from './routes/leads';
import dashboardRoutes from './routes/dashboard';
import vendasRoutes from './routes/vendas';
import webhookRoutes from './routes/webhooks';

// Importar jobs
import { iniciarPlanejamentoRotaDiaria } from './jobs/planejamentoRotaDiaria';
import { iniciarSincronizacaoOMIE } from './jobs/sincronizacaoOMIE';
import { iniciarAlertasCriticos } from './jobs/alertasCriticos';
import { iniciarRelatorioSemanal } from './jobs/relatorioSemanal';
import { iniciarRelatorioMensal } from './jobs/relatorioMensal';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger básico
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Webhooks OMIE (SEM auth - OMIE envia POST diretamente)
app.use('/api/webhooks', webhookRoutes);

// Rotas da API (com auth)
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/vendedores', vendedoresRoutes);
app.use('/api/rotas', rotasRoutes);
app.use('/api/atividades', atividadesRoutes);
app.use('/api/propostas', propostasRoutes);
app.use('/api/comissoes', comissoesRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vendas', vendasRoutes);

// Teste WhatsApp (temporário - remover em produção)
// Aceita ?telefone=5579991052599 para testar com número específico
app.get('/api/test/whatsapp', async (req, res) => {
  try {
    const { whatsappService } = await import('./services/whatsappService');
    const telefone = (req.query.telefone as string) || process.env.WHATSAPP_GERENTE;
    if (!telefone) {
      return res.status(400).json({ error: 'WHATSAPP_GERENTE não configurado e nenhum telefone informado via ?telefone=' });
    }
    const resultado = await whatsappService.enviarMensagem(
      telefone,
      '✅ *CRM Gelateria Moderna*\n\nTeste de integração WhatsApp realizado com sucesso!\n\nData: ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    );
    res.json({ success: true, resultado, telefone_destino: telefone, apikey_usada: process.env.TEXTMEBOT_API_KEY ? 'sim (configurada)' : 'NÃO CONFIGURADA' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota raiz
app.get('/', (_req, res) => {
  res.json({
    app: 'Gelateria Moderna CRM API',
    version: '1.0.0',
    endpoints: [
      '/api/clientes',
      '/api/rotas',
      '/api/vendedores',
      '/api/atividades',
      '/api/propostas',
      '/api/comissoes',
      '/api/leads',
      '/api/vendas',
      '/api/webhooks/omie',
      '/api/auth',
      '/health'
    ]
  });
});

// Error handler global
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Gelateria Moderna CRM API`);
  console.log(`  Rodando na porta ${PORT}`);
  console.log(`  Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================\n`);

  // Iniciar jobs agendados
  if (process.env.NODE_ENV !== 'test') {
    iniciarPlanejamentoRotaDiaria();
    console.log('[JOBS] Planejamento de rota diária: 7h (todos os dias)');

    // Sync OMIE removido do cron - agora é manual via botão na página de Clientes
    // iniciarSincronizacaoOMIE();
    console.log('[JOBS] Sincronização OMIE: MANUAL (botão na página de Clientes)');

    iniciarAlertasCriticos();
    console.log('[JOBS] Alertas críticos: a cada 15min + meio-dia + 17h');

    iniciarRelatorioSemanal();
    console.log('[JOBS] Relatório semanal: sábado 9h');

    iniciarRelatorioMensal();
    console.log('[JOBS] Relatório mensal: dia 5 às 8h');

    console.log('\n[JOBS] Todos os jobs agendados com sucesso!\n');
  }
});

export default app;
