import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getJobById, applyToJob, getCandidateApplications, getCandidateSkills } from '../../services/api';
import { Job, Application, CandidateSkill } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { calculateCompatibility } from '../../utils/compatibility';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArchitecturalMotif } from '../../components/shared/ArchitecturalMotif';

export const DetalhesVaga: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, candidateProfile } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de candidatura
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const found = await getJobById(id);
        setJob(found);

        if (user?.role === 'candidato' && candidateProfile) {
          const [apps, skills] = await Promise.all([
            getCandidateApplications(candidateProfile.id),
            getCandidateSkills(candidateProfile.id),
          ]);
          setCandidateSkills(skills);
          const currentApp = apps.find((a) => a.job_id === id && a.status !== 'retirada');
          setExistingApplication(currentApp || null);
        }
      } catch (err) {
        console.error('Erro ao carregar detalhes da vaga:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user, candidateProfile]);

  const handleApply = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/vagas/${id}` } } });
      return;
    }
    if (user.role !== 'candidato' || !candidateProfile) {
      setApplyError('Apenas contas de candidato podem enviar candidaturas.');
      return;
    }

    setSubmitting(true);
    setApplyError(null);
    try {
      const newApp = await applyToJob(job!.id, candidateProfile.id);
      setExistingApplication(newApp);
      setApplySuccess(true);
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : 'Falha ao enviar candidatura.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-2 border-[#0b5aa8] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#5f7288] text-[15px]">Carregando informações da oportunidade...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="px-6 sm:px-[64px] py-16 text-center">
        <h2 className="text-[24px] font-medium text-[#0b5aa8]">Vaga não encontrada</h2>
        <p className="text-[#5f7288] mt-2">Esta oportunidade pode ter sido encerrada ou não existe.</p>
        <Link to="/vagas" className="inline-block mt-6">
          <Button variant="outline">Voltar para a busca de vagas</Button>
        </Link>
      </div>
    );
  }

  const comp = user?.role === 'candidato'
    ? calculateCompatibility(candidateSkills, job.requirements || [])
    : null;

  return (
    <div className="flex flex-col w-full bg-[#f2f8ff] pb-24 font-sans">
      {/* Header da vaga (Figma node 2:3386) */}
      <div className="border-b border-[#b8d8ff] px-6 sm:px-[64px] pb-[40px] pt-[30px] flex flex-col gap-6">
        <div className="flex items-center justify-between text-[14px]">
          <Link to="/vagas" className="text-[#0b5aa8] hover:underline flex items-center gap-2 font-medium">
            ← Voltar para os resultados
          </Link>
          <span className="text-[#5f7288] text-[12px] hidden sm:inline-block">
            Buscar vagas / {job.area} / Detalhes da vaga
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-[64px] items-start lg:items-center justify-between">
          <div className="flex flex-col gap-4 flex-1">
            <span className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase">
              {job.company?.name || 'EMPRESA'}
            </span>
            <h1 className="font-medium text-[#0b5aa8] text-[36px] sm:text-[48px] lg:text-[56px] leading-[1.08] tracking-[-2.2px] max-w-4xl">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[15px]">
              <span className="text-[#0b5aa8] font-medium">
                {job.city} • <span className="capitalize">{job.work_mode}</span>
              </span>
              <span className="text-[#b8d8ff]">•</span>
              <span className="text-[#5f7288] text-[13px]">
                Contratação {job.employment_type.toUpperCase()}
              </span>
              {comp && comp.score !== null && (
                <>
                  <span className="text-[#b8d8ff]">•</span>
                  <Badge variant={comp.is_compatible ? 'success' : 'warning'}>
                    Compatibilidade: {comp.score}% {comp.has_mandatory_fail && '(Não atende obrigatórios)'}
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-end gap-4 shrink-0">
            <ArchitecturalMotif />
            <div className="font-normal text-[#0b5aa8] text-[12px] tracking-[1px] text-right">
              <p>SEU TALENTO.</p>
              <p>NOVOS CAMINHOS.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal + Card Lateral */}
      <div className="px-6 sm:px-[64px] py-12 flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto w-full">
        {/* Coluna Esquerda: Descrição, Responsabilidades, Requisitos */}
        <div className="flex-1 flex flex-col gap-10">
          {/* Sobre a vaga */}
          <div className="flex flex-col gap-4">
            <h2 className="font-medium text-[#0b5aa8] text-[24px] tracking-[-0.8px]">
              Sobre a oportunidade
            </h2>
            <p className="text-[#5f7288] text-[16px] leading-[1.65] whitespace-pre-line">
              {job.description}
            </p>

            {/* Tags de competências */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3">
                {job.requirements.map((req) => (
                  <Badge key={req.id} variant="default">
                    {req.skill?.name || 'Skill'} ({req.minimum_level})
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#b8d8ff] h-px w-full" />

          {/* Critérios e Requisitos de Matching */}
          <div className="flex flex-col gap-5">
            <h2 className="font-medium text-[#0b5aa8] text-[24px] tracking-[-0.8px]">
              Requisitos e critérios de matching
            </h2>
            <div className="flex flex-col gap-3">
              {job.requirements && job.requirements.length > 0 ? (
                job.requirements.map((req) => {
                  const candidateHas = candidateSkills.find((cs) => cs.skill_id === req.skill_id);
                  return (
                    <div 
                      key={req.id}
                      className="bg-[#f8fbff] border border-[#b8d8ff] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[#0b5aa8] text-[16px]">•</span>
                        <div>
                          <p className="font-medium text-[#0b5aa8] text-[15px]">
                            {req.skill?.name}
                          </p>
                          <p className="text-[13px] text-[#5f7288]">
                            Nível mínimo: <strong className="capitalize">{req.minimum_level}</strong> • Peso: {req.weight}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={req.requirement_type === 'obrigatorio' ? 'default' : 'neutral'}>
                          {req.requirement_type === 'obrigatorio' ? 'Obrigatório' : 'Desejável'}
                        </Badge>
                        {user?.role === 'candidato' && (
                          <span className="text-[12px] font-medium text-[#5f7288] ml-2">
                            {candidateHas ? `(Você: ${candidateHas.proficiency_level})` : '(Não cadastrada)'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[#5f7288] text-[15px]">Nenhum requisito específico exigido para esta vaga.</p>
              )}
            </div>
          </div>

          <div className="bg-[#b8d8ff] h-px w-full" />

          {/* Local e modelo */}
          <div className="flex flex-col gap-3">
            <h2 className="font-medium text-[#0b5aa8] text-[24px] tracking-[-0.8px]">
              Local e modelo de trabalho
            </h2>
            <p className="text-[#5f7288] text-[16px] leading-[1.6]">
              Atuação <strong className="capitalize">{job.work_mode}</strong> em {job.city}. 
              A organização {job.company?.name} entrará em contato para alinhar detalhes de rotina, horários e etapas subsequentes.
            </p>
          </div>
        </div>

        {/* Coluna Direita: Card de Ação de Candidatura (Figma node 2:3464) */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase">
                SEU PRÓXIMO PASSO
              </span>
              <h3 className="font-medium text-[#0b5aa8] text-[26px] tracking-[-0.8px] leading-snug">
                Vamos conectar seu talento?
              </h3>
              <p className="text-[#5f7288] text-[14px]">
                Confira os detalhes e envie seu perfil para esta oportunidade.
              </p>
            </div>

            <div className="flex flex-col gap-4 text-[14px] border-y border-[#b8d8ff] py-4">
              <div>
                <span className="text-[#5f7288] text-[12px] block">Empresa</span>
                <strong className="text-[#0b5aa8] text-[15px]">{job.company?.name}</strong>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <span className="text-[#5f7288] text-[12px] block">Local</span>
                  <strong className="text-[#0b5aa8]">{job.city}</strong>
                </div>
                <div className="flex-1">
                  <span className="text-[#5f7288] text-[12px] block">Modelo</span>
                  <strong className="text-[#0b5aa8] capitalize">{job.work_mode}</strong>
                </div>
              </div>
              <div>
                <span className="text-[#5f7288] text-[12px] block">Área de atuação</span>
                <strong className="text-[#0b5aa8]">{job.area}</strong>
              </div>
            </div>

            {/* Ação de Candidatura */}
            {existingApplication ? (
              <div className="flex flex-col gap-3">
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-[2px] text-center">
                  <p className="text-emerald-800 font-bold text-[15px]">✓ Candidatura Enviada</p>
                  <p className="text-emerald-700 text-[12px] mt-1 capitalize">
                    Status atual: <strong>{existingApplication.status.replace('_', ' ')}</strong>
                  </p>
                </div>
                <Link to="/candidato/candidaturas">
                  <Button variant="outline" className="w-full">
                    Acompanhar no meu painel
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button
                  size="md"
                  showArrow
                  className="w-full"
                  onClick={() => setShowApplyModal(true)}
                >
                  Candidatar-se
                </Button>
                <p className="text-[12px] text-[#5f7288] text-center leading-relaxed">
                  {user ? 'Revise suas informações antes de confirmar.' : 'Entre ou crie sua conta para enviar a candidatura.'}
                </p>
              </div>
            )}
          </div>

          {/* Orientações sobre o processo */}
          <div className="border border-[#b8d8ff] p-6 flex flex-col gap-4 bg-[#f8fbff]">
            <span className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase">
              COMO SE CANDIDATAR
            </span>
            <div className="flex gap-4 items-start text-[14px]">
              <span className="font-medium text-[#0b5aa8] text-[13px] w-6 shrink-0">01</span>
              <div>
                <strong className="text-[#0b5aa8] block">Prepare seu perfil</strong>
                <p className="text-[#5f7288] text-[13px]">Preencha suas competências e envie seu currículo em PDF.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start text-[14px]">
              <span className="font-medium text-[#0b5aa8] text-[13px] w-6 shrink-0">02</span>
              <div>
                <strong className="text-[#0b5aa8] block">Envie sua candidatura</strong>
                <p className="text-[#5f7288] text-[13px]">Revise seus dados e confirme seu interesse nesta posição.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start text-[14px]">
              <span className="font-medium text-[#0b5aa8] text-[13px] w-6 shrink-0">03</span>
              <div>
                <strong className="text-[#0b5aa8] block">Acompanhe pelo painel</strong>
                <p className="text-[#5f7288] text-[13px]">Consulte cada etapa da análise em tempo real.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Candidatura (Figma frames 04.1 / 04.2) */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#f8fbff] border border-[#b8d8ff] max-w-lg w-full p-8 shadow-2xl flex flex-col gap-6 relative">
            <button
              onClick={() => { setShowApplyModal(false); setApplySuccess(false); setApplyError(null); }}
              className="absolute top-4 right-4 text-[#5f7288] hover:text-[#0b5aa8] text-[20px]"
            >
              ✕
            </button>

            {applySuccess ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-16 h-16 bg-[#0b5aa8] text-white flex items-center justify-center rounded-full text-[28px]">
                  ✓
                </div>
                <h3 className="font-medium text-[#0b5aa8] text-[28px] tracking-[-0.8px]">
                  Candidatura enviada com sucesso!
                </h3>
                <p className="text-[#5f7288] text-[14px] leading-relaxed max-w-sm">
                  Seu perfil e currículo foram recebidos pela equipe da <strong>{job.company?.name}</strong>. Você pode acompanhar todas as movimentações no seu painel.
                </p>
                <div className="flex gap-3 w-full mt-4">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => { setShowApplyModal(false); navigate('/candidato/candidaturas'); }}
                  >
                    Ver minhas candidaturas
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <span className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase">
                    04.1 / REVISAR E ENVIAR
                  </span>
                  <h3 className="font-medium text-[#0b5aa8] text-[26px] tracking-[-0.8px] mt-1">
                    Confirmar candidatura
                  </h3>
                  <p className="text-[#5f7288] text-[14px] mt-1">
                    Você está se candidatando para <strong>{job.title}</strong> na empresa <strong>{job.company?.name}</strong>.
                  </p>
                </div>

                {applyError && (
                  <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-[2px] text-[13px]">
                    {applyError}
                  </div>
                )}

                <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-4 text-[13px] flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-[#5f7288]">Candidato:</span>
                    <strong className="text-[#0b5aa8]">{user?.full_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f7288]">E-mail:</span>
                    <strong className="text-[#0b5aa8]">{user?.email}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f7288]">Currículo:</span>
                    <strong className="text-[#0b5aa8]">
                      {candidateProfile?.resume ? candidateProfile.resume.original_filename : 'Nenhum currículo em PDF anexado'}
                    </strong>
                  </div>
                </div>

                {!candidateProfile?.resume && (
                  <p className="text-amber-700 text-[12px] bg-amber-50 p-2 border border-amber-200">
                    Dica: Recomendamos anexar seu currículo em PDF na aba de Perfil para aumentar suas chances de aprovação.
                  </p>
                )}

                <div className="flex gap-3 justify-end mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowApplyModal(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    showArrow
                    onClick={handleApply}
                    disabled={submitting}
                  >
                    {submitting ? 'Enviando...' : 'Confirmar e Enviar'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
