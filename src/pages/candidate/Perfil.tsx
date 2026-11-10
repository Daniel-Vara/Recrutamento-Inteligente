import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  updateCandidateProfile, 
  getCandidateSkills, 
  addCandidateSkill, 
  removeCandidateSkill, 
  updateCandidateSkill,
  getSkills,
  addCustomSkill
} from '../../services/api';
import { Skill, CandidateSkill, ProficiencyLevel } from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { NoticeBanner } from '../../components/shared/NoticeBanner';
import { PROFICIENCY_LABELS } from '../../utils/compatibility';

export const CandidatePerfil: React.FC = () => {
  const { user, candidateProfile, updateCurrentProfile, refreshAuth } = useAuth();

  // Basic Profile Info
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [summary, setSummary] = useState(candidateProfile?.professional_summary || '');
  const [isVisible, setIsVisible] = useState(candidateProfile?.is_visible ?? true);

  // Skills
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [customSkillName, setCustomSkillName] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel>('intermediario');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!candidateProfile) return;
      try {
        const [cSkills, sCatalog] = await Promise.all([
          getCandidateSkills(candidateProfile.id),
          getSkills(),
        ]);
        setCandidateSkills(cSkills);
        setAllSkills(sCatalog);
        if (sCatalog.length > 0) {
          setSelectedSkillId(sCatalog[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do perfil:', err);
      }
    };
    load();
  }, [candidateProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateProfile) return;
    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      await updateCurrentProfile({
        full_name: fullName,
        phone,
        city,
      });

      await updateCandidateProfile(candidateProfile.id, {
        professional_summary: summary,
        is_visible: isVisible,
      });

      await refreshAuth();
      setFeedback('Perfil e preferências atualizados com sucesso!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async () => {
    if (!candidateProfile) return;
    let skillIdToAdd = selectedSkillId;

    if (customSkillName.trim()) {
      const created = await addCustomSkill(customSkillName.trim());
      skillIdToAdd = created.id;
      setCustomSkillName('');
      setAllSkills(await getSkills());
    }

    if (!skillIdToAdd) return;

    try {
      const added = await addCandidateSkill(candidateProfile.id, skillIdToAdd, selectedLevel);
      // Atualiza lista local
      setCandidateSkills((prev) => {
        const filtered = prev.filter((s) => s.skill_id !== skillIdToAdd);
        return [...filtered, added];
      });
      setFeedback('Competência adicionada ao perfil!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar competência.');
    }
  };

  const handleRemoveSkill = async (csId: string) => {
    try {
      await removeCandidateSkill(csId);
      setCandidateSkills((prev) => prev.filter((s) => s.id !== csId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao remover competência.');
    }
  };

  const handleUpdateSkillLevel = async (csId: string, newLevel: ProficiencyLevel) => {
    try {
      const updated = await updateCandidateSkill(csId, newLevel);
      setCandidateSkills((prev) => prev.map((s) => (s.id === csId ? updated : s)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar nível.');
    }
  };

  return (
    <div className="flex flex-col w-full pb-24 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow="MARINA COSTA / PERFIL PROFISSIONAL"
        title="Editar perfil e preferências"
        description="Mantenha seus dados cadastrais, resumo profissional e competências alinhados com suas ambições de carreira."
        contextText="Área do candidato / Perfil e preferências"
        backPath="/candidato/dashboard"
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-5xl mx-auto w-full flex flex-col gap-8">
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

        {/* Formulário Principal */}
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-10">
          {/* Seção 1: Dados Pessoais (Figma node 2:31) */}
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-6">
            <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.6px] border-b border-[#b8d8ff]/50 pb-3">
              Dados pessoais e contato
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                requiredAsterisk
                required
              />
              <Input
                label="E-mail (acesso da conta)"
                value={user?.email || ''}
                disabled
                helperText="O e-mail da conta é gerenciado com segurança pelo Supabase Auth."
              />
              <Input
                label="Celular"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-2048"
              />
              <Input
                label="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
              />
            </div>
          </div>

          {/* Seção 2: Resumo Profissional (Figma node 2:51) */}
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-5">
            <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.6px] border-b border-[#b8d8ff]/50 pb-3">
              Resumo profissional
            </h2>
            <div className="flex flex-col gap-2">
              <label className="font-medium text-[14px] text-[#0b5aa8]">
                Apresentação e trajetória
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                placeholder="Descreva suas experiências mais marcantes, foco de carreira e principais tecnologias com as quais atua..."
                className="bg-[#f8fbff] border border-[#b8d8ff] focus:border-[#5ea8ff] focus:ring-1 focus:ring-[#5ea8ff] outline-none p-4 rounded-[4px] text-[15px] text-[#0b5aa8] leading-relaxed resize-y font-sans"
              />
              <p className="text-[12px] text-[#5f7288]">
                Este resumo será visualizado pelas empresas quando você se candidatar a uma oportunidade.
              </p>
            </div>
          </div>

          {/* Seção 3: Competências e Níveis de Domínio (Figma node 2:78) */}
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-6">
            <div className="border-b border-[#b8d8ff]/50 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.6px]">
                  Competências e níveis de domínio
                </h2>
                <p className="text-[#5f7288] text-[13px]">
                  Utilizadas para calcular o índice determinístico de compatibilidade com as vagas.
                </p>
              </div>
              <Badge variant="default">
                {candidateSkills.length} cadastradas
              </Badge>
            </div>

            {/* Adicionar nova competência */}
            <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-5 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="font-medium text-[13px] text-[#0b5aa8] mb-1 block">
                  Selecionar do catálogo
                </label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => { setSelectedSkillId(e.target.value); setCustomSkillName(''); }}
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none focus:border-[#5ea8ff]"
                >
                  {allSkills.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 w-full">
                <label className="font-medium text-[13px] text-[#0b5aa8] mb-1 block">
                  Ou cadastrar nova competência
                </label>
                <input
                  type="text"
                  value={customSkillName}
                  onChange={(e) => setCustomSkillName(e.target.value)}
                  placeholder="Ex: Kubernetes, GraphQL..."
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none focus:border-[#5ea8ff]"
                />
              </div>

              <div className="w-full md:w-44">
                <label className="font-medium text-[13px] text-[#0b5aa8] mb-1 block">
                  Nível de domínio
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value as ProficiencyLevel)}
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none focus:border-[#5ea8ff] capitalize"
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="basico">Básico</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                  <option value="especialista">Especialista</option>
                </select>
              </div>

              <Button
                type="button"
                onClick={handleAddSkill}
                className="w-full md:w-auto h-[50px] shrink-0"
              >
                + Adicionar
              </Button>
            </div>

            {/* Lista de competências cadastradas */}
            <div className="flex flex-col gap-3">
              {candidateSkills.length === 0 ? (
                <p className="text-[#5f7288] text-[14px] py-4 text-center">
                  Nenhuma competência adicionada ainda. Adicione acima para calcular o matching com as vagas.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {candidateSkills.map((cs) => (
                    <div
                      key={cs.id}
                      className="border border-[#b8d8ff] bg-white p-4 flex items-center justify-between gap-3 rounded-[2px]"
                    >
                      <div className="min-w-0">
                        <strong className="text-[#0b5aa8] text-[15px] block truncate">
                          {cs.skill?.name || 'Competência'}
                        </strong>
                        <span className="text-[12px] text-[#5f7288]">
                          {PROFICIENCY_LABELS[cs.proficiency_level]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={cs.proficiency_level}
                          onChange={(e) => handleUpdateSkillLevel(cs.id, e.target.value as ProficiencyLevel)}
                          className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[12px] h-[34px] px-2 rounded-[2px] focus:outline-none"
                        >
                          <option value="iniciante">Iniciante</option>
                          <option value="basico">Básico</option>
                          <option value="intermediario">Intermediário</option>
                          <option value="avancado">Avançado</option>
                          <option value="especialista">Especialista</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(cs.id)}
                          className="text-red-600 hover:text-red-800 text-[18px] px-2"
                          title="Remover competência"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Seção 4: Visibilidade e Privacidade (Figma node 2:131) */}
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-4">
            <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.6px] border-b border-[#b8d8ff]/50 pb-3">
              Preferências de visibilidade
            </h2>
            <div className="flex items-start gap-4">
              <input
                id="visibility"
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                className="mt-1 h-5 w-5 rounded-[2px] border-[#b8d8ff] text-[#0b5aa8] focus:ring-[#5ea8ff] cursor-pointer"
              />
              <label htmlFor="visibility" className="text-[14px] text-[#5f7288] leading-relaxed cursor-pointer select-none">
                <strong className="text-[#0b5aa8] block">Permitir visibilidade em rankings e recomendações empresariais</strong>
                Quando ativado, seu perfil poderá ser sugerido para empresas que buscam profissionais com suas competências. Se desativado, apenas as vagas para as quais você enviar candidatura terão acesso aos seus dados.
              </label>
            </div>
          </div>

          {/* Ações de Formulário (Figma node 2:135) */}
          <div className="flex items-center justify-between border-t border-[#b8d8ff] pt-6">
            <Button
              type="submit"
              size="lg"
              showArrow
              disabled={saving}
              className="ml-auto"
            >
              {saving ? 'Salvando alterações...' : 'Salvar e confirmar perfil'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
