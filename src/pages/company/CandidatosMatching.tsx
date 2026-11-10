import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getCompanyJobs, 
  getJobCandidatesRanking, 
  getResumeSecureUrl,
  updateApplicationStatus 
} from '../../services/api';
import { Job, ApplicationStatus } from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { NoticeBanner } from '../../components/shared/NoticeBanner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const CompanyCandidatosMatching: React.FC = () => {
  const { user, company } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialJobId = searchParams.get('vaga') || '';

  const [companyJobs, setCompanyJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);
  const [ranking, setRanking] = useState<Awaited<ReturnType<typeof getJobCandidatesRanking>>>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Carrega vagas da empresa
  useEffect(() => {
    const loadJobs = async () => {
      if (!company) return;
      try {
        const jobs = await getCompanyJobs(company.id);
        setCompanyJobs(jobs);
        if (!selectedJobId && jobs.length > 0) {
          setSelectedJobId(jobs[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar vagas:', err);
      }
    };
    loadJobs();
  }, [company]);

  // Carrega ranking da vaga selecionada
  const loadRanking = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    try {
      const candidatesRanking = await getJobCandidatesRanking(selectedJobId);
      setRanking(candidatesRanking);
    } catch (err) {
      console.error('Erro ao calcular ranking de candidatos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRanking();
  }, [selectedJobId]);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    setSearchParams({ vaga: jobId });
  };

  const handleDownloadResume = async (storagePath: string) => {
    if (!user) return;
    setDownloadingPath(storagePath);
    setActionError(null);
    try {
      const { url, filename } = await getResumeSecureUrl(storagePath, user.id);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao baixar currículo.');
    } finally {
      setDownloadingPath(null);
    }
  };

  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
    if (!user) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateApplicationStatus(applicationId, newStatus, user.id);
      setActionSuccess(`Status da candidatura atualizado para "${newStatus}".`);
      await loadRanking();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao atualizar status.');
    }
  };

  const selectedJob = companyJobs.find((j) => j.id === selectedJobId);

  return (
    <div className="flex flex-col w-full pb-24 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow={`${company?.name || 'EMPRESA'} / MATCHING POR VAGA`}
        title="Talentos em perspectiva."
        description="Compare evidências profissionais e priorize a leitura dos currículos com o ranking determinístico. A decisão continua com a sua equipe."
        contextText="Área da empresa / Talentos em perspectiva."
        backPath="/empresa/dashboard"
        rightAction={
          <Link to="/empresa/candidaturas">
            <Button size="sm" variant="outline">
              Ver Todas Candidaturas
            </Button>
          </Link>
        }
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Seleção de Vaga (Figma node 2:1967) */}
        <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex-1 w-full sm:max-w-xl">
            <label className="font-medium text-[14px] text-[#0b5aa8] mb-2 block">
              Vaga selecionada para análise de matching:
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => handleJobSelect(e.target.value)}
              className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[15px] font-medium h-[50px] px-4 rounded-[4px] w-full focus:outline-none focus:border-[#5ea8ff]"
            >
              {companyJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.city} - {j.status})
                </option>
              ))}
            </select>
          </div>

          <Badge variant="default" className="text-[12px] px-3 py-1">
            {ranking.length} candidaturas recebidas
          </Badge>
        </div>

        {/* Aviso Editorial (Figma node 2:1975) */}
        <NoticeBanner
          title="Compatibilidade é apoio à análise humana"
          description="Scores calculados com base em critérios profissionais e requisitos ponderados. Não há rejeição ou aprovação automática; a equipe humana tem sempre a palavra final."
        />

        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-[2px] text-[14px]">
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-[2px] text-[14px]">
            {actionError}
          </div>
        )}

        {/* Ranking de Candidatos (Figma node 2:1981) */}
        <div className="flex items-center justify-between text-[13px] text-[#5f7288] border-b border-[#b8d8ff]/50 pb-2">
          <span className="font-medium text-[#0b5aa8] uppercase tracking-wider text-[12px]">
            {ranking.length} CANDIDATURAS ANALISADAS
          </span>
          <span>Maior compatibilidade primeiro ↓</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#5f7288]">
            <div className="w-8 h-8 border-2 border-[#0b5aa8] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Processando pontuações dos candidatos...
          </div>
        ) : ranking.length === 0 ? (
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-12 text-center flex flex-col items-center gap-4">
            <p className="font-medium text-[#0b5aa8] text-[18px]">
              Nenhum candidato inscrito nesta vaga ainda
            </p>
            <p className="text-[#5f7288] text-[14px] max-w-md">
              Assim que os profissionais enviarem suas candidaturas para <strong>{selectedJob?.title}</strong>, eles aparecerão ordenados por compatibilidade aqui.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {ranking.map((item) => {
              const { application, profile, candidate, skills, resume, compatibility } = item;

              return (
                <div
                  key={application.id}
                  className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col lg:flex-row gap-6 hover:border-[#5ea8ff] transition-colors"
                >
                  {/* Bloco de Score (Figma node 2:2001) */}
                  <div className="flex lg:flex-col items-baseline lg:items-center justify-center p-5 bg-[#e5f0fd] border border-[#b8d8ff] shrink-0 w-full lg:w-[130px] text-center gap-2 lg:gap-1">
                    <span className="font-medium text-[#0b5aa8] text-[40px] lg:text-[48px] leading-none tracking-[-1.5px]">
                      {compatibility.score !== null ? compatibility.score : '—'}
                    </span>
                    <span className="text-[12px] text-[#5f7288] leading-tight block">
                      de 100 pontos
                    </span>
                    <span className="text-[11px] text-[#0b5aa8] font-medium uppercase tracking-wider block mt-1">
                      Compatibilidade
                    </span>
                    {compatibility.has_mandatory_fail && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1">
                        Não atende obrigatório
                      </span>
                    )}
                  </div>

                  {/* Dados do Candidato e Competências */}
                  <div className="flex flex-col gap-4 flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-[#0b5aa8] text-[24px] tracking-[-0.7px]">
                          {profile?.full_name || 'Candidato'}
                        </h3>
                        <p className="text-[#5f7288] text-[13px]">
                          {profile?.city || 'Brasil'} • Inscrito em {new Date(application.applied_at).toLocaleDateString('pt-BR')} • {profile?.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start">
                        <Badge
                          variant={
                            application.status === 'aprovada'
                              ? 'success'
                              : application.status === 'rejeitada'
                              ? 'warning'
                              : 'default'
                          }
                          className="capitalize"
                        >
                          {application.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {candidate?.professional_summary && (
                      <p className="text-[#5f7288] text-[14px] leading-relaxed line-clamp-2">
                        {candidate.professional_summary}
                      </p>
                    )}

                    {/* Competências declaradas */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {skills.map((cs) => (
                        <Badge key={cs.id} variant="neutral">
                          {cs.skill?.name || 'Skill'}: {cs.proficiency_level}
                        </Badge>
                      ))}
                    </div>

                    {/* Detalhamento dos Critérios da Vaga */}
                    {compatibility.details && compatibility.details.length > 0 && (
                      <div className="bg-white border border-[#b8d8ff]/60 p-3 rounded-[2px] text-[12px] flex flex-col gap-1">
                        <strong className="text-[#0b5aa8]">Critérios avaliados pelo algoritmo:</strong>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {compatibility.details.map((d, idx) => (
                            <span key={idx} className="flex items-center gap-1.5">
                              <span className={d.is_met ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                                {d.is_met ? '✓' : '✕'}
                              </span>
                              <span className="text-[#0b5aa8]">{d.skill_name}:</span>
                              <span className="text-[#5f7288]">
                                {d.candidate_level ? `tem ${d.candidate_level}` : 'não possui'} (exige {d.minimum_level})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ações da Empresa na Candidatura */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#b8d8ff]/40">
                      {/* Download de Currículo Privado */}
                      {resume ? (
                        <button
                          onClick={() => handleDownloadResume(resume.storage_path)}
                          disabled={downloadingPath === resume.storage_path}
                          className="text-[#0076ff] hover:underline text-[13px] font-medium flex items-center gap-1 cursor-pointer"
                        >
                          📄 {downloadingPath === resume.storage_path ? 'Obtendo link seguro...' : `Baixar currículo (${resume.original_filename}) ↗`}
                        </button>
                      ) : (
                        <span className="text-[#5f7288] text-[12px] italic">
                          Candidato não anexou arquivo PDF
                        </span>
                      )}

                      {/* Atualizador de Status */}
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#5f7288]">Mudar status:</span>
                        <select
                          value={application.status}
                          onChange={(e) => handleStatusChange(application.id, e.target.value as ApplicationStatus)}
                          className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[12px] font-medium h-[34px] px-2 rounded-[2px] focus:outline-none"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_analise">Em análise</option>
                          <option value="aprovada">Aprovada</option>
                          <option value="rejeitada">Rejeitada</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
