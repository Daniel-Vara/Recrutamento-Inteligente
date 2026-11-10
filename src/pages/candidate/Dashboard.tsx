import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCandidateApplications, getRecommendedJobsForCandidate } from '../../services/api';
import { Application, Job } from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { NoticeBanner } from '../../components/shared/NoticeBanner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const CandidateDashboard: React.FC = () => {
  const { user, candidateProfile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<{
    job: Job;
    compatibility: { score: number | null; is_compatible: boolean };
    applied: boolean;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!candidateProfile) return;
      setLoading(true);
      try {
        const [apps, recs] = await Promise.all([
          getCandidateApplications(candidateProfile.id),
          getRecommendedJobsForCandidate(candidateProfile.id),
        ]);
        setApplications(apps);
        setRecommendedJobs(recs.slice(0, 3)); // Top 3
      } catch (err) {
        console.error('Erro ao carregar dashboard do candidato:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [candidateProfile]);

  const activeApps = applications.filter((a) => a.status !== 'retirada');
  const pendingApps = activeApps.filter((a) => a.status === 'pendente');
  const inReviewApps = activeApps.filter((a) => a.status === 'em_analise');
  const approvedApps = activeApps.filter((a) => a.status === 'aprovada');

  return (
    <div className="flex flex-col w-full pb-20 font-sans">
      <PageHeader
        eyebrow={`${user?.full_name} / PAINEL DO CANDIDATO`}
        title="Cada passo da sua trajetória."
        description={`Olá, ${user?.full_name?.split(' ')[0]}. Acompanhe suas candidaturas e descubra oportunidades alinhadas com as suas competências.`}
        contextText="Área do candidato / Visão geral"
        rightAction={
          <div className="flex gap-3">
            <Link to="/candidato/perfil">
              <Button variant="outline" size="sm">
                Editar Perfil
              </Button>
            </Link>
            <Link to="/vagas">
              <Button size="sm" showArrow>
                Buscar Vagas
              </Button>
            </Link>
          </div>
        }
      />

      <div className="px-6 sm:px-[64px] py-10 flex flex-col gap-10 max-w-7xl mx-auto w-full">
        {/* Banner de status do perfil */}
        <NoticeBanner
          title="Perfil profissional ativo"
          description="Mantenha suas competências atualizadas e anexe seu currículo em PDF para potencializar o matching com as empresas parceiras."
        />

        {/* Indicadores / KPIs (Figma node 2:2161) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(activeApps.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Total de candidaturas</span>
          </div>

          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(pendingApps.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Candidaturas pendentes</span>
          </div>

          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(inReviewApps.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Em análise pela empresa</span>
          </div>

          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(approvedApps.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Candidaturas aprovadas</span>
          </div>
        </div>

        {/* Seção dupla: Candidaturas Recentes + Vagas Recomendadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Candidaturas Recentes */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#b8d8ff]">
              <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.7px]">
                Candidaturas recentes
              </h2>
              <Link to="/candidato/candidaturas" className="text-[#0076ff] text-[13px] hover:underline font-medium">
                Ver todas ({activeApps.length}) ↗
              </Link>
            </div>

            {loading ? (
              <p className="text-[#5f7288] text-[14px]">Carregando...</p>
            ) : activeApps.length === 0 ? (
              <div className="bg-[#f8fbff] border border-[#b8d8ff] p-8 text-center flex flex-col items-center gap-3">
                <p className="text-[#5f7288] text-[14px]">Você ainda não enviou candidaturas.</p>
                <Link to="/vagas">
                  <Button size="sm">Explorar Vagas</Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeApps.slice(0, 3).map((app) => (
                  <div
                    key={app.id}
                    className="bg-[#f8fbff] border border-[#b8d8ff] p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-medium text-[#0b5aa8] text-[11px] tracking-[1px] uppercase">
                        {app.job?.company?.name || 'EMPRESA'}
                      </span>
                      <Link 
                        to={`/vagas/${app.job_id}`}
                        className="font-medium text-[#0b5aa8] text-[16px] hover:underline truncate"
                      >
                        {app.job?.title}
                      </Link>
                      <span className="text-[#5f7288] text-[12px]">
                        Enviada em {new Date(app.applied_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <Badge
                      variant={
                        app.status === 'aprovada'
                          ? 'success'
                          : app.status === 'rejeitada'
                          ? 'warning'
                          : 'default'
                      }
                      className="capitalize shrink-0"
                    >
                      {app.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vagas Recomendadas para o Perfil */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#b8d8ff]">
              <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.7px]">
                Vagas recomendadas para você
              </h2>
              <Link to="/candidato/recomendacoes" className="text-[#0076ff] text-[13px] hover:underline font-medium">
                Ver ranking completo ↗
              </Link>
            </div>

            {loading ? (
              <p className="text-[#5f7288] text-[14px]">Calculando compatibilidade...</p>
            ) : recommendedJobs.length === 0 ? (
              <div className="bg-[#f8fbff] border border-[#b8d8ff] p-8 text-center flex flex-col items-center gap-3">
                <p className="text-[#5f7288] text-[14px]">Adicione competências ao seu perfil para ver recomendações personalizadas.</p>
                <Link to="/candidato/perfil">
                  <Button size="sm">Cadastrar Competências</Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recommendedJobs.map(({ job, compatibility, applied }) => (
                  <div
                    key={job.id}
                    className="bg-[#f8fbff] border border-[#b8d8ff] p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-medium text-[#0b5aa8] text-[11px] tracking-[1px] uppercase">
                        {job.company?.name || 'EMPRESA'}
                      </span>
                      <Link 
                        to={`/vagas/${job.id}`}
                        className="font-medium text-[#0b5aa8] text-[16px] hover:underline truncate"
                      >
                        {job.title}
                      </Link>
                      <span className="text-[#5f7288] text-[12px]">
                        {job.city} • <span className="capitalize">{job.work_mode}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {compatibility.score !== null && (
                        <div className="text-right">
                          <span className="font-medium text-[#0b5aa8] text-[20px] block leading-none">
                            {compatibility.score}%
                          </span>
                          <span className="text-[10px] text-[#5f7288] uppercase">Match</span>
                        </div>
                      )}
                      <Link to={`/vagas/${job.id}`}>
                        <Button size="sm" variant={applied ? 'secondary' : 'primary'}>
                          {applied ? 'Inscrito' : 'Ver vaga'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
