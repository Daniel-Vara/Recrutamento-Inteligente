import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const loggedUser = await login(email);
      if (from) {
        navigate(from, { replace: true });
      } else if (loggedUser.role === 'candidato') {
        navigate('/candidato/dashboard');
      } else {
        navigate('/empresa/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  // Login rápido de demonstração (Marina Costa ou Atlas Tech)
  const handleQuickDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('••••••••••••');
    setLoading(true);
    try {
      const loggedUser = await login(demoEmail);
      if (loggedUser.role === 'candidato') {
        navigate('/candidato/dashboard');
      } else {
        navigate('/empresa/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f3f7fb] flex flex-col lg:flex-row min-h-screen w-full">
      {/* Brand panel (Figma node 2:4222) */}
      <div className="bg-[#f2f8ff] flex flex-col justify-between p-8 sm:p-12 lg:w-[50%] xl:w-[55%] border-b lg:border-b-0 lg:border-r border-[#b8d8ff] relative overflow-hidden shrink-0">
        <div className="bg-[#b8d8ff] h-px w-full shrink-0" />
        
        <div className="my-12 lg:my-auto">
          <Link 
            to="/" 
            className="font-medium text-[#0b5aa8] text-[64px] sm:text-[100px] xl:text-[140px] tracking-[-8px] leading-[1.05] block select-none hover:opacity-95 transition-opacity"
          >
            Appliety
          </Link>
          <p className="font-medium text-[#0b5aa8] text-[24px] sm:text-[32px] tracking-[-1px] mt-4 leading-tight">
            Seu talento. Novos caminhos.
          </p>
          <p className="text-[#5f7288] text-[15px] sm:text-[16px] max-w-md mt-2 leading-relaxed">
            Plataforma inteligente que conecta candidatos qualificados às melhores oportunidades corporativas.
          </p>
        </div>

        {/* Panel structure (Figma node 2:4225) */}
        <div className="flex gap-4 h-[180px] sm:h-[240px] items-start w-full overflow-hidden shrink-0">
          <div className="bg-[#f2f8ff] border-t border-l border-[#b8d8ff] h-full w-[100px] sm:w-[128px] shrink-0" />
          <div className="bg-[#f2f8ff] border-t border-l border-[#b8d8ff] h-full w-[160px] sm:w-[208px] shrink-0" />
          <div className="bg-[#f2f8ff] border-t border-l border-[#5ea8ff] h-full flex-1 min-w-0" />
        </div>
      </div>

      {/* Sign in form (Figma node 2:4229) */}
      <div className="bg-[#f2f8ff] flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-12 lg:py-24">
        <div className="max-w-md w-full mx-auto flex flex-col gap-8">
          {/* Introduction */}
          <div className="flex flex-col gap-3">
            <h1 className="font-medium text-[#0b5aa8] text-[40px] sm:text-[52px] leading-[1.1] tracking-[-1.5px]">
              Entrar
            </h1>
            <p className="text-[#5f7288] text-[16px]">
              Acesse a sua conta com seu e-mail.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-[2px] text-[14px]">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              required
            />

            <div className="flex flex-col gap-2">
              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
              <div className="flex justify-end">
                <Link
                  to="/recuperar-senha"
                  className="text-[#0b5aa8] text-[14px] hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Quick Demo Selector */}
          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-4 rounded-[2px] flex flex-col gap-3">
            <p className="font-medium text-[#0b5aa8] text-[12px] tracking-[1px] uppercase">
              Acesso Rápido de Demonstração (MVP)
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('marina.costa@example.com')}
                className="flex-1 bg-[#f8fbff] border border-[#0b5aa8] hover:bg-white text-[#0b5aa8] text-[13px] font-medium py-2 px-3 rounded-[2px] text-left transition-colors"
              >
                👤 Candidata (Marina)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('rafael@atlastech.example.com')}
                className="flex-1 bg-[#f8fbff] border border-[#0b5aa8] hover:bg-white text-[#0b5aa8] text-[13px] font-medium py-2 px-3 rounded-[2px] text-left transition-colors"
              >
                🏢 Empresa (Atlas Tech)
              </button>
            </div>
          </div>

          {/* Registration link */}
          <div className="border-t border-[#b8d8ff] pt-6 text-[15px] text-[#5f7288]">
            Não tem conta?{' '}
            <Link
              to="/cadastro"
              className="text-[#0076ff] font-medium underline hover:text-[#0b5aa8]"
            >
              Cadastre-se
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
