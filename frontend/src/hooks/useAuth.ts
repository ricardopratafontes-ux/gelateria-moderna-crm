import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'gerente' | 'vendedor';
}

export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Carregar estado inicial do localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUsuario = localStorage.getItem('usuario');

    if (storedToken && storedUsuario) {
      setToken(storedToken);
      setUsuario(JSON.parse(storedUsuario));
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

  return {
    usuario,
    token,
    loading,
    isAuthenticated,
    isGerente,
    isVendedor,
    login,
    logout
  };
}
