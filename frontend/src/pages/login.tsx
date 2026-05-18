import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login, isAuthenticated, usuario } = useAuth();
  const navigate = useNavigate();

  // Se já está logado, redirecionar
  React.useEffect(() => {
    if (isAuthenticated && usuario) {
      navigate(usuario.role === 'gerente' ? '/dashboard' : '/vendedor', { replace: true });
    }
  }, [isAuthenticated, usuario, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const dadosUsuario = await login(email, senha);

      // Redirecionar baseado no role
      if (dadosUsuario.role === 'gerente') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/vendedor', { replace: true });
      }
    } catch (err: any) {
      const mensagem = err.response?.data?.error || 'Erro ao fazer login. Tente novamente.';
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-full mx-auto flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-bold">GM</span>
          </div>
          <h1 className="text-2xl font-bold text-tertiary">Gelateria Moderna</h1>
          <p className="text-gray-500 mt-1">Sistema de Gestão Comercial</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Entrar</h2>

          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{erro}</p>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-3 bg-primary text-white font-semibold rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Entrando...
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          Gelateria Moderna CRM v1.0
        </p>
      </div>
    </div>
  );
}
