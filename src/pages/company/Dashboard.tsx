import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCompanyJobs } from '../../services/api';
import { Job } from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { NoticeBanner } from '../../components/shared/NoticeBanner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const CompanyDashboard: React.FC = () => {
  const { user, company } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!company) return;
      setLoading(true);
      try {
        const list = await getCompanyJobs(company.id);
        setJobs(list);
      } catch (err) {
        console.error('Erro ao carregar painel da empresa:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [company]);

  const publishedJobs = jobs.filter((j) => j.status === 'publicada');
  const draftJobs = jobs.filter((j) => j.status === 'rascunho');
  const closedJobs = jobs.filter((j) => j.status === 'encerrada');
  const totalApplications = jobs.reduce((acc, curr) => acc + (curr.applications_count || 0), 0);

  return (
    <div className="flex flex-col w-full pb-20 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow={`${company?.name || 'EMPRESA'} / VISÃO GERAL`}
        title="Abra espaço para novos talentos."
        description={`Olá, ${user?.full_name?.split(' ')[0]}. Organize suas oportunidades e acompanhe cada processo seletivo em um só lugar.`}
        contextText="Área da empresa / Abra espaço para novos talentos."
        rightAction={
          <Link to="/empresa/vagas/nova">
            <Button size="sm" showArrow>
              Publicar Nova Vaga
            </Button>
          </Link>
        }
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-7xl mx-auto w-full flex flex-col gap-10">
        <NoticeBanner
          title={`Organização ${company?.name || 'Empresa'} configurada`}
          description="Publique oportunidades com requisitos e pesos definidos para receber candidatos pré-classificados com nosso sistema de matching."
        />

        {/* Resumo da Empresa / KPIs (Figma node 2:2884) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(publishedJobs.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Vagas publicadas ativas</span>
          </div>

          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(draftJobs.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Rascunhos em edição</span>
          </div>

          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(closedJobs.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Vagas encerradas</span>
          </div>

          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(totalApplications).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Candidaturas recebidas</span>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Link
            to="/empresa/vagas/nova"
            className="bg-[#f8fbff] border border-[#b8d8ff] hover:border-[#5ea8ff] p-6 flex flex-col gap-2 rounded-[2px] transition-colors"
          >
            <strong className="text-[#0b5aa8] text-[18px]">Publicar Nova Vaga ↗</strong>
            <p className="text-[#5f7288] text-[13px]">
              Defina título, escopo, modalidade e adicione critérios com pesos ponderados.
            </p>
          </Link>

          <Link
            to="/empresa/candidatos"
            className="bg-[#f8fbff] border border-[#b8d8ff] hover:border-[#5ea8ff] p-6 flex flex-col gap-2 rounded-[2px] transition-colors"
          >
            <strong className="text-[#0b5aa8] text-[18px]">Matching & Ranking ↗</strong>
            <p className="text-[#5f7288] text-[13px]">
              Consulte candidatos classificados do maior para o menor score de compatibilidade.
            </p>
          </Link>

          <Link
            to="/empresa/candidaturas"
            className="bg-[#f8fbff] border border-[#b8d8ff] hover:border-[#5ea8ff] p-6 flex flex-col gap-2 rounded-[2px] transition-colors"
          >
            <strong className="text-[#0b5aa8] text-[18px]">Gerenciar Candidaturas ↗</strong>
            <p className="text-[#5f7288] text-[13px]">
              Altere status (Em análise, Aprovada, Rejeitada) e acesse currículos privados.
            </p>
          </Link>
        </div>

        {/* Vagas Cadastradas (Figma node 2:2897) */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between pb-2 border-b border-[#b8d8ff]">
            <h2 className="font-medium text-[#0b5aa8] text-[24px] tracking-[-0.7px]">
              Suas vagas cadastradas
            </h2>
            <Link to="/empresa/vagas" className="text-[#0076ff] text-[14px] hover:underline font-medium">
              Ver todas no painel de vagas ↗
            </Link>
          </div>

          {loading ? (
            <p className="text-[#5f7288] text-[14px]">Carregando vagas...</p>
          ) : jobs.length === 0 ? (
            <div className="bg-[#f8fbff] border border-[#b8d8ff] p-12 text-center flex flex-col items-center gap-4">
              <p className="font-medium text-[#0b5aa8] text-[18px]">Sua empresa ainda não publicou vagas</p>
              <Link to="/empresa/vagas/nova">
                <Button size="md" showArrow>Criar Primeira Oportunidade</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {jobs.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  className="bg-[#f8fbff] border border-[#b8d8ff] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          job.status === 'publicada'
                            ? 'success'
                            : job.status === 'rascunho'
                            ? 'warning'
                            : 'neutral'
                        }
                        className="capitalize"
                      >
                        {job.status}
                      </Badge>
                      <span className="text-[#5f7288] text-[12px]">
                        {job.city} • <span className="capitalize">{job.work_mode}</span>
                      </span>
                    </div>

                    <Link
                      to={`/empresa/vagas/${job.id}`}
                      className="font-medium text-[#0b5aa8] text-[20px] hover:underline truncate"
                    >
                      {job.title}
                    </Link>

                    <span className="text-[#5f7288] text-[13px]">
                      {job.applications_count || 0} candidaturas recebidas
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link to={`/empresa/candidatos?vaga=${job.id}`}>
                      <Button variant="outline" size="sm">
                        Ver Ranking
                      </Button>
                    </Link>
                    <Link to={`/empresa/vagas/${job.id}`}>
                      <Button variant="secondary" size="sm">
                        Editar
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
  );
};
