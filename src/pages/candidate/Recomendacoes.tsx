import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRecommendedJobsForCandidate } from '../../services/api';
import { Job, CompatibilityResult } from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { NoticeBanner } from '../../components/shared/NoticeBanner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const CandidateRecomendacoes: React.FC = () => {
  const { candidateProfile } = useAuth();
  const [recommendations, setRecommendations] = useState<{
    job: Job;
    compatibility: CompatibilityResult;
    applied: boolean;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!candidateProfile) return;
      setLoading(true);
      try {
        const recs = await getRecommendedJobsForCandidate(candidateProfile.id);
        setRecommendations(recs);
      } catch (err) {
        console.error('Erro ao calcular recomendações:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [candidateProfile]);

  return (
    <div className="flex flex-col w-full pb-24 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow="MARINA COSTA / RECOMENDAÇÕES"
        title="Vagas para o seu perfil"
        description="Nosso algoritmo determinístico compara suas competências e níveis de domínio com os requisitos reais cadastrados pelas empresas parceiras."
        contextText="Área do candidato / Recomendações"
        backPath="/candidato/dashboard"
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
        <NoticeBanner
          title="Compatibilidade é apoio à decisão profissional"
          description="A pontuação reflete a aderência entre seus conhecimentos declarados e os pesos definidos pelos recrutadores. Ela não representa probabilidade de contratação."
        />

        {loading ? (
          <div className="text-center py-20 text-[#5f7288]">
            <div className="w-8 h-8 border-2 border-[#0b5aa8] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Calculando índices de compatibilidade com as vagas abertas...
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-12 text-center flex flex-col items-center gap-4">
            <p className="font-medium text-[#0b5aa8] text-[18px]">
              Nenhuma vaga disponível no momento
            </p>
            <p className="text-[#5f7288] text-[14px]">
              Tente cadastrar mais competências no seu perfil para ampliar os resultados.
            </p>
            <Link to="/candidato/perfil">
              <Button size="md">Editar Minhas Competências</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {recommendations.map(({ job, compatibility, applied }) => (
              <div
                key={job.id}
                className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col md:flex-row gap-6 hover:border-[#5ea8ff] transition-colors"
              >
                {/* Score de Compatibilidade em Destaque */}
                <div className="flex md:flex-col items-baseline md:items-center justify-center p-4 bg-[#e5f0fd] border border-[#b8d8ff] shrink-0 w-full md:w-[140px] text-center gap-2 md:gap-1">
                  <span className="font-medium text-[#0b5aa8] text-[40px] sm:text-[46px] leading-none tracking-[-1.5px]">
                    {compatibility.score !== null ? `${compatibility.score}%` : '—'}
                  </span>
                  <span className="text-[12px] text-[#5f7288] uppercase tracking-wider block">
                    {compatibility.score !== null ? 'Compatibilidade' : 'Sem requisitos'}
                  </span>
                  {compatibility.has_mandatory_fail && (
                    <span className="text-[10px] text-red-600 font-medium block mt-1">
                      Falta requisito obrigatório
                    </span>
                  )}
                </div>

                {/* Dados da Vaga e Detalhamento de Requisitos */}
                <div className="flex flex-col gap-4 flex-1 min-w-0">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase">
                      {job.company?.name || 'EMPRESA'}
                    </span>
                    <Link
                      to={`/vagas/${job.id}`}
                      className="font-medium text-[#0b5aa8] text-[22px] sm:text-[26px] tracking-[-0.7px] hover:underline leading-tight"
                    >
                      {job.title}
                    </Link>
                    <p className="text-[#5f7288] text-[13px]">
                      {job.city} • <span className="capitalize">{job.work_mode}</span> • Contratação {job.employment_type.toUpperCase()}
                    </p>
                  </div>

                  {/* Checklist de Requisitos Atendidos */}
                  {compatibility.details && compatibility.details.length > 0 && (
                    <div className="bg-white border border-[#b8d8ff]/70 p-4 rounded-[2px] flex flex-col gap-2">
                      <strong className="text-[#0b5aa8] text-[13px] block">
                        Detalhamento do Matching:
                      </strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                        {compatibility.details.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className={d.is_met ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                              {d.is_met ? '✓' : '✕'}
                            </span>
                            <span className="text-[#0b5aa8] font-medium">{d.skill_name}:</span>
                            <span className="text-[#5f7288]">
                              exige {d.minimum_level} ({d.requirement_type}) {d.candidate_level ? `• você tem ${d.candidate_level}` : '• não possui'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#b8d8ff]/40">
                    <span className="text-[13px] text-[#5f7288]">
                      {applied ? '✓ Você já se candidatou a esta oportunidade' : 'Vaga pronta para candidatura'}
                    </span>
                    <Link to={`/vagas/${job.id}`}>
                      <Button size="sm" showArrow variant={applied ? 'secondary' : 'primary'}>
                        {applied ? 'Ver candidatura' : 'Candidatar-se'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
