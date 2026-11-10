import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { NoticeBanner } from '../../components/shared/NoticeBanner';

export const RecuperarSenha: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f2f8ff] flex flex-col justify-center items-center px-6 py-12">
      <div className="max-w-md w-full bg-[#f8fbff] border border-[#b8d8ff] p-8 sm:p-10 flex flex-col gap-6 shadow-sm">
        <Link to="/" className="font-medium text-[#0b5aa8] text-[36px] tracking-[-1.8px] leading-none">
          Appliety
        </Link>

        <div className="flex flex-col gap-2">
          <h1 className="font-medium text-[#0b5aa8] text-[28px] tracking-[-0.8px] leading-tight">
            Recuperar senha
          </h1>
          <p className="text-[#5f7288] text-[14px] leading-relaxed">
            Informe o e-mail cadastrado na sua conta. Você receberá um link com as instruções para redefinição segura.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col gap-6">
            <NoticeBanner
              title="Instruções enviadas com sucesso!"
              description={`Se houver uma conta associada a ${email}, você receberá um e-mail com o link de redefinição em alguns instantes.`}
            />
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Voltar para o Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              required
            />

            <Button
              type="submit"
              size="md"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </Button>

            <div className="border-t border-[#b8d8ff]/50 pt-4 text-center text-[14px]">
              <Link to="/login" className="text-[#0b5aa8] hover:underline">
                ← Voltar para o Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
