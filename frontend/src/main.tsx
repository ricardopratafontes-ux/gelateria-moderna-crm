import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import App from './App';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000 // 30 segundos
    }
  }
});

function render() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

// ── Login único: o site (protegido pela Intranet) entrega o token do CRM ──
// Sem tela de login própria: pega o token em /api/comercial/token (mesma origem,
// cookie da Intranet). Se não houver sessão → manda pro login da Intranet.
async function bootstrap() {
  const root = document.getElementById('root');
  if (root) root.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui;color:#9ca3af;font-size:14px">Carregando…</div>';
  try {
    const r = await fetch('/api/comercial/token', { headers: { 'Accept': 'application/json' } });
    if (r.status === 401 || r.status === 403) { window.location.href = '/intranet'; return; }
    if (r.ok) {
      const j = await r.json();
      if (j?.token) {
        localStorage.setItem('token', j.token);
        if (j.usuario) localStorage.setItem('usuario', JSON.stringify(j.usuario));
      }
    }
  } catch { /* segue com o token que houver (degrada graciosamente) */ }
  if (root) root.innerHTML = '';
  render();
}

bootstrap();
