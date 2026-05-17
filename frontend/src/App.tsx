import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import VendedorPage from './pages/vendedor';

// Componente de rota protegida
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { isAuthenticated, usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-tertiary">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && usuario?.role !== requiredRole) {
    // Redirecionar para a rota correta baseado no role
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota raiz - redireciona baseado no role */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard do gerente */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="gerente">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* App do vendedor */}
        <Route
          path="/vendedor"
          element={
            <ProtectedRoute requiredRole="vendedor">
              <VendedorPage />
            </ProtectedRoute>
          }
        />

        {/* Proposta pública (sem auth) */}
        <Route path="/proposta/:id" element={<PropostaPublica />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Componente simples para visualização de proposta (público)
function PropostaPublica() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold text-primary mb-2">Gelateria Moderna</h1>
        <p className="text-tertiary">Proposta Comercial</p>
        <p className="mt-4 text-gray-600">Carregando detalhes da proposta...</p>
      </div>
    </div>
  );
}
