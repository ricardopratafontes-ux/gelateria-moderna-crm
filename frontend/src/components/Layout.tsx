import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../utils/constants';

interface LayoutProps {
  children: React.ReactNode;
}

const menuGerente = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/clientes', label: 'Clientes', icon: '👥' },
  { path: '/leads', label: 'Leads', icon: '🎯' },
  { path: '/vendas', label: 'Vendas', icon: '💰' },
  { path: '/comissoes', label: 'Comissões', icon: '💵' },
  { path: '/vendedores', label: 'Vendedores', icon: '🧑‍💼' },
  { path: '/rotas', label: 'Rotas', icon: '🗺️' },
  { path: '/configuracoes', label: 'Configurações', icon: '⚙️' },
];

const menuVendedor = [
  { path: '/vendedor', label: 'Rota do Dia', icon: '🗺️' },
  { path: '/vendedor/clientes', label: 'Clientes', icon: '👥' },
  { path: '/vendedor/registrar', label: 'Nova Visita', icon: '📝' },
  { path: '/vendedor/propostas', label: 'Propostas', icon: '📄' },
  { path: '/vendedor/comissoes', label: 'Comissões', icon: '💵' },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { usuario, logout, isGerente } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menu = isGerente ? menuGerente : menuVendedor;

  // Mobile bottom nav for vendedor
  if (!isGerente) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Top header */}
        <div className="bg-white border-b px-4 py-3 sticky top-0 z-20 flex justify-between items-center" style={{ borderBottomColor: COLORS.PRIMARY, borderBottomWidth: 3 }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: COLORS.PRIMARY }}>GM</div>
            <span className="font-bold text-gray-900">Gelateria Moderna</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{usuario?.nome}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">Sair</button>
          </div>
        </div>

        {/* Page content */}
        <div>{children}</div>

        {/* Bottom navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex z-20">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'font-bold' : 'text-gray-500'}`}
                style={isActive ? { color: COLORS.PRIMARY } : {}}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop sidebar for gerente
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:inset-0`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: COLORS.PRIMARY }}>GM</div>
            <div>
              <h2 className="font-bold text-sm">Gelateria Moderna</h2>
              <p className="text-xs text-gray-400">Sistema de Gestão</p>
            </div>
          </div>
        </div>

        <nav className="mt-4 px-2">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 text-sm transition-colors ${isActive ? 'bg-gray-700 text-white font-semibold' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{usuario?.nome}</p>
              <p className="text-xs text-gray-400">{usuario?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-400 transition-colors">Sair</button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 text-xl">☰</button>
          <span className="font-bold text-gray-900">Gelateria Moderna</span>
        </div>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
