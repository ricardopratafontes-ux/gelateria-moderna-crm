import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import api from '../services/api';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'gerente' | 'vendedor';
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isGerente: boolean;
  isVendedor: boolean;
  login: (email: string, senha: string) => Promise<Usuario>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Carregar estado inicial do localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUsuario = localStorage.getItem('usuario');

      if (storedToken && storedUsuario) {
        setToken(storedToken);
        setUsuario(JSON.parse(storedUsuario));
      }
    } catch (e) {
      // localStorage corrupted - limpar
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const response = await api.post('/auth/login', { email, senha });
    const { token: novoToken, usuario: dadosUsuario } = response.data;

    localStorage.setItem('token', novoToken);
    localStorage.setItem('usuario', JSON.stringify(dadosUsuario));

    setToken(novoToken);
    setUsuario(dadosUsuario);

    return dadosUsuario;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }, []);

  const isAuthenticated = !!token;
  const isGerente = usuario?.role === 'gerente';
  const isVendedor = usuario?.role === 'vendedor';

  const value: AuthContextType = {
    usuario,
    token,
    loading,
    isAuthenticated,
    isGerente,
    isVendedor,
    login,
    logout
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback para quando não há provider (não deveria acontecer)
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
