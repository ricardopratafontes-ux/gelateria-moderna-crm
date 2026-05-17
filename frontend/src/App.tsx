import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Pages - Gerente
import DashboardPage from './pages/dashboard';
import ClientesPage from './pages/clientes';
import LeadsPage from './pages/leads';
import VendasPage from './pages/vendas';
import ComissoesPage from './pages/comissoes';
import VendedoresPage from './pages/vendedores';
import RotasPage from './pages/rotas';

// Pages - Vendedor
import VendedorPage from './pages/vendedor';
import VendedorClientesPage from './pages/vendedor-clientes';
import VendedorRegistrarPage from './pages/vendedor-registrar';
import VendedorPropostasPage from './pages/vendedor-propostas';
import VendedorComissoesPage from './pages/vendedor-comissoes';

// Pages - Public
import LoginPage from './pages/login';

// Componente de rota protegida
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { isAuthenticated, usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#f31c40', borderTopColor: 'transparent' }}></div>
          <p className="mt-4 text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && usuario?.role !== requiredRole) {
    if (usuario?.role === 'gerente') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/vendedor" replace />;
  }

  return <>{children}</>;
}

// Redirecionamento pós-login baseado em role
function HomeRedirect() {
  const { isAuthenticated, usuario, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (usuario?.role === 'gerente') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/vendedor" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Rota raiz - redireciona baseado no role */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* ===== GERENTE ===== */}
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="gerente"><DashboardPage /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute requiredRole="gerente"><ClientesPage /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute requiredRole="gerente"><LeadsPage /></ProtectedRoute>} />
      <Route path="/vendas" element={<ProtectedRoute requiredRole="gerente"><VendasPage /></ProtectedRoute>} />
      <Route path="/comissoes" element={<ProtectedRoute requiredRole="gerente"><ComissoesPage /></ProtectedRoute>} />
      <Route path="/vendedores" element={<ProtectedRoute requiredRole="gerente"><VendedoresPage /></ProtectedRoute>} />
      <Route path="/rotas" element={<ProtectedRoute requiredRole="gerente"><RotasPage /></ProtectedRoute>} />

      {/* ===== VENDEDOR ===== */}
      <Route path="/vendedor" element={<ProtectedRoute requiredRole="vendedor"><VendedorPage /></ProtectedRoute>} />
      <Route path="/vendedor/clientes" element={<ProtectedRoute requiredRole="vendedor"><VendedorClientesPage /></ProtectedRoute>} />
      <Route path="/vendedor/registrar" element={<ProtectedRoute requiredRole="vendedor"><VendedorRegistrarPage /></ProtectedRoute>} />
      <Route path="/vendedor/propostas" element={<ProtectedRoute requiredRole="vendedor"><VendedorPropostasPage /></ProtectedRoute>} />
      <Route path="/vendedor/comissoes" element={<ProtectedRoute requiredRole="vendedor"><VendedorComissoesPage /></ProtectedRoute>} />

      {/* Proposta pública (sem auth) */}
      <Route path="/proposta/:id" element={<PropostaPublica />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

// Componente simples para visualização de proposta (público)
function PropostaPublica() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#f31c40' }}>Gelateria Moderna</h1>
        <p className="text-gray-500">Proposta Comercial</p>
        <p className="mt-4 text-gray-600">Carregando detalhes da proposta...</p>
      </div>
    </div>
  );
}
