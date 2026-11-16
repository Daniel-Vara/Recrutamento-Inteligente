import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

export const Cadastro: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole: UserRole = searchParams.get('tipo') === 'empresa' ? 'empresa' : 'candidato';
  const [role, setRole] = useState<UserRole>(initialRole);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }
    if (role === 'empresa' && !companyName.trim()) {
      setError('Por favor, informe o nome da sua empresa.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!acceptedTerms) {
      setError('Você deve aceitar os termos de uso para continuar.');
      return;
    }

    setLoading(true);
    try {
      const newUser = await signup({
        fullName,
        email,
        password,
        role,
        city: city || 'São Paulo',
        phone,
        companyName,
      });

      if (newUser.role === 'candidato') {
        navigate('/candidato/perfil');
      } else {
        navigate('/empresa/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f2f8ff] flex flex-col lg:flex-row min-h-screen w-full">
      {/* Brand panel (Figma node 2:1583) */}
      <div className="flex flex-col justify-between p-8 sm:p-12 lg:w-[45%] xl:w-[48%] border-b lg:border-b-0 lg:border-r border-[#b8d8ff] shrink-0 bg-[#f2f8ff]">
        <div className="flex flex-col gap-10">
          <div className="bg-[#b8d8ff] h-px w-full shrink-0" />
          <div className="flex flex-col gap-6">
            <Link 
              to="/" 
              className="font-medium text-[#0b5aa8] text-[56px] sm:text-[88px] xl:text-[120px] tracking-[-8px] leading-[1.05] block select-none hover:opacity-95"
            >
              Appliety
            </Link>
            <div className="font-medium text-[#0b5aa8] text-[28px] sm:text-[36px] tracking-[-1.5px] leading-tight">
              <p>Seu talento.</p>
              <p>Novos caminhos.</p>
            </div>
            <p className="text-[#5f7288] text-[15px] sm:text-[16px] leading-relaxed max-w-md">
              {role === 'candidato'
                ? 'Crie seu perfil profissional, adicione suas competências e acompanhe cada candidatura em um único lugar.'
                : 'Cadastre sua organização, publique vagas assertivas e encontre talentos qualificados com matching objetivo.'}
            </p>
          </div>
        </div>

        {/* Structural lines motif */}
        <div className="mt-12 flex flex-col gap-4">
          <div className="flex gap-4 h-[160px] sm:h-[220px] items-start w-full overflow-hidden">
            <div className="border-t border-l border-[#b8d8ff] h-full w-[100px] sm:w-[112px] shrink-0" />
            <div className="border-t border-l border-[#b8d8ff] h-full w-[140px] sm:w-[176px] shrink-0" />
            <div className="border-t border-l border-[#5ea8ff] h-full flex-1 min-w-0" />
          </div>
          <p className="font-normal text-[#5f7288] text-[12px] tracking-[1px] uppercase">
            Oportunidades e talentos conectados.
          </p>
        </div>
      </div>

      {/* Registration Form (Figma node 2:1596) */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-12">
        <div className="max-w-xl w-full mx-auto flex flex-col gap-6">
          {/* Account type switch */}
          <div className="flex items-center justify-between pb-2 border-b border-[#b8d8ff]">
            <Badge variant="default" className="font-medium text-[12px] uppercase">
              {role === 'candidato' ? 'CONTA CANDIDATO' : 'CONTA EMPRESA'}
            </Badge>

            <button
              type="button"
              onClick={() => {
                setRole(role === 'candidato' ? 'empresa' : 'candidato');
                setError(null);
              }}
              className="text-[#0b5aa8] text-[14px] hover:underline cursor-pointer font-medium"
            >
              {role === 'candidato' ? 'Sou uma empresa ↗' : 'Sou um candidato ↗'}
            </button>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <h1 className="font-medium text-[#0b5aa8] text-[36px] sm:text-[46px] leading-[1.1] tracking-[-1.5px]">
              {role === 'candidato' ? 'Criar conta de candidato' : 'Criar conta corporativa'}
            </h1>
            <p className="text-[#5f7288] text-[15px]">
              {role === 'candidato' 
                ? 'Comece com seus dados. Depois, complete seu perfil profissional e competências.' 
                : 'Cadastre os dados do responsável e as informações da sua organização.'}
            </p>
            <p className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase mt-1">
              01 / ACESSO &nbsp;→&nbsp; 02 / {role === 'candidato' ? 'PERFIL E CURRÍCULO' : 'ORGANIZAÇÃO E VAGAS'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-[2px] text-[14px]">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                label={role === 'candidato' ? 'Nome Completo' : 'Nome do Responsável'}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === 'candidato' ? 'Ex: Marina Costa' : 'Ex: Rafael Oliveira'}
                requiredAsterisk
                required
              />
              <Input
                label="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
              />
            </div>

            {role === 'empresa' && (
              <Input
                label="Nome da Empresa / Organização"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: ATLAS TECH"
                requiredAsterisk
                required
              />
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                helperText="Será usado para entrar e receber avisos de oportunidades."
                requiredAsterisk
                required
              />
              <Input
                label="Celular (opcional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-2048"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                helperText="Mínimo de 6 caracteres."
                requiredAsterisk
                required
              />
              <Input
                label="Confirmar senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                helperText={confirmPassword && password === confirmPassword ? '✓ As senhas coincidem.' : undefined}
                requiredAsterisk
                required
              />
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 mt-2">
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded-[2px] border-[#b8d8ff] text-[#0b5aa8] focus:ring-[#5ea8ff] cursor-pointer"
              />
              <label htmlFor="terms" className="text-[13px] text-[#5f7288] leading-snug cursor-pointer select-none">
                Li e aceito os Termos de uso e estou ciente da Política de privacidade da Appliety. *
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              showArrow
              disabled={loading}
              className="w-full mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta e avançar'}
            </Button>

            <p className="text-[12px] text-[#5f7288] text-center">
              {role === 'candidato'
                ? 'Seu currículo só será compartilhado com a empresa quando você enviar uma candidatura.'
                : 'Suas vagas e dados corporativos são protegidos por políticas rigorosas de isolamento.'}
            </p>
          </form>

          {/* Signin redirect */}
          <div className="border-t border-[#b8d8ff] pt-4 text-[14px] text-[#5f7288] text-center">
            Já tem conta?{' '}
            <Link to="/login" className="text-[#0076ff] font-medium underline hover:text-[#0b5aa8]">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
