import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createOrUpdateCompany } from '../../services/api';
import { PageHeader } from '../../components/shared/PageHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { NoticeBanner } from '../../components/shared/NoticeBanner';

export const CompanyPerfil: React.FC = () => {
  const { user, company, refreshAuth } = useAuth();

  const [name, setName] = useState(company?.name || '');
  const [description, setDescription] = useState(company?.description || '');
  const [city, setCity] = useState(company?.city || 'São Paulo');
  const [website, setWebsite] = useState(company?.website || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setDescription(company.description || '');
      setCity(company.city);
      setWebsite(company.website || '');
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setError('Por favor, informe o nome da sua organização.');
      return;
    }

    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      await createOrUpdateCompany(user.id, {
        name,
        description,
        city,
        website,
      });
      await refreshAuth();
      setFeedback('Dados da organização atualizados com sucesso!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar dados da empresa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-24 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow={`${company?.name || 'EMPRESA'} / DADOS DA ORGANIZAÇÃO`}
        title="Perfil institucional da empresa"
        description="Mantenha as informações institucionais, localização e canais de contato da sua organização atualizados."
        contextText="Área da empresa / Perfil da organização"
        backPath="/empresa/dashboard"
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-4xl mx-auto w-full flex flex-col gap-8">
        {feedback && (
          <NoticeBanner
            title="Alterações salvas"
            description={feedback}
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-[2px] text-[14px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-6">
            <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.6px] border-b border-[#b8d8ff]/50 pb-3">
              Identificação da organização
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Nome da organização *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: ATLAS TECH"
                requiredAsterisk
                required
              />
              <Input
                label="Cidade sede *"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                requiredAsterisk
                required
              />
              <Input
                label="Website institucional"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://suaempresa.com.br"
              />
              <Input
                label="Responsável da conta"
                value={user?.full_name || ''}
                disabled
                helperText="Vinculado ao perfil autenticado."
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-[14px] text-[#0b5aa8]">
                Apresentação institucional e cultura
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Descreva a atuação da empresa, produtos, setor de mercado e cultura de trabalho..."
                className="bg-[#f8fbff] border border-[#b8d8ff] focus:border-[#5ea8ff] focus:ring-1 focus:ring-[#5ea8ff] outline-none p-4 rounded-[4px] text-[15px] text-[#0b5aa8] leading-relaxed resize-y font-sans"
              />
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-[#b8d8ff] pt-6">
            <Button
              type="submit"
              size="lg"
              showArrow
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
