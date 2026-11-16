import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getCompanyJobs, 
  getJobCandidatesRanking, 
  getResumeSecureUrl,
  updateApplicationStatus 
} from '../../services/api';
import { ApplicationStatus } from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const CompanyCandidaturas: React.FC = () => {
  const { user, company } = useAuth();
  const [items, setItems] = useState<Array<{
    jobTitle: string;
    jobId: string;
    rankingItem: Awaited<ReturnType<typeof getJobCandidatesRanking>>[number];
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todas');
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadAll = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const jobs = await getCompanyJobs(company.id);
      const all: typeof items = [];

      for (const j of jobs) {
        const ranking = await getJobCandidatesRanking(j.id);
        ranking.forEach((r) => {
          all.push({
            jobTitle: j.title,
            jobId: j.id,
            rankingItem: r,
          });
        });
      }
      setItems(all);
    } catch (err) {
      console.error('Erro ao carregar candidaturas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [company]);

  const handleDownload = async (storagePath: string) => {
    if (!user) return;
    setDownloadingPath(storagePath);
    try {
      const { url, filename } = await getResumeSecureUrl(storagePath, user.id);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro no download:', err);
    } finally {
      setDownloadingPath(null);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    if (!user) return;
    try {
      await updateApplicationStatus(appId, newStatus, user.id);
      setSuccessMsg(`Status atualizado para "${newStatus}".`);
      await loadAll();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const filtered = items.filter((i) => {
    if (statusFilter === 'todas') return true;
    return i.rankingItem.application.status === statusFilter;
  });

  return (
    <div className="flex flex-col w-full pb-24 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow={`${company?.name || 'EMPRESA'} / GESTÃO DE CANDIDATURAS`}
        title="Controle unificado de inscritos."
        description="Acompanhe todas as candidaturas recebidas nas suas vagas, consulte currículos privados e atualize etapas de avaliação."
        contextText="Área da empresa / Candidaturas recebidas"
        backPath="/empresa/dashboard"
        rightAction={
          <Link to="/empresa/candidatos">
            <Button size="sm" showArrow>
              Ver Ranking por Vaga
            </Button>
          </Link>
        }
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-[2px] text-[14px]">
            {successMsg}
          </div>
        )}

        {/* Filtros de Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#f8fbff] border border-[#b8d8ff] p-4">
          <div className="flex flex-wrap gap-2">
            {['todas', 'pendente', 'em_analise', 'aprovada', 'rejeitada'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="cursor-pointer"
              >
                <Badge variant={statusFilter === s ? 'active' : 'default'} className="capitalize">
                  {s === 'todas' ? `Todas (${items.length})` : s.replace('_', ' ')}
                </Badge>
              </button>
            ))}
          </div>

          <span className="text-[13px] text-[#5f7288]">
            {filtered.length} candidaturas listadas
          </span>
        </div>

        {/* Tabela de Candidaturas */}
        {loading ? (
          <div className="text-center py-20 text-[#5f7288]">Carregando candidaturas...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-12 text-center text-[#5f7288]">
            Nenhuma candidatura encontrada nesta categoria.
          </div>
        ) : (
          <div className="bg-[#f8fbff] border border-[#b8d8ff] overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-[#e5f0fd] border-b border-[#b8d8ff] text-[#0b5aa8] font-medium text-[13px]">
                <tr>
                  <th className="p-4">Candidato</th>
                  <th className="p-4">Vaga</th>
                  <th className="p-4 text-center">Score</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Currículo</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b8d8ff]/40">
                {filtered.map(({ jobTitle, jobId, rankingItem }) => {
                  const { application, profile, resume, compatibility } = rankingItem;

                  return (
                    <tr key={application.id} className="hover:bg-white/60 transition-colors">
                      <td className="p-4">
                        <strong className="text-[#0b5aa8] block">
                          {profile?.full_name}
                        </strong>
                        <span className="text-[12px] text-[#5f7288]">
                          {profile?.city} • {profile?.email}
                        </span>
                      </td>

                      <td className="p-4">
                        <Link to={`/empresa/vagas/${jobId}`} className="text-[#0b5aa8] hover:underline font-medium">
                          {jobTitle}
                        </Link>
                      </td>

                      <td className="p-4 text-center">
                        <span className="font-bold text-[#0b5aa8] text-[16px]">
                          {compatibility.score !== null ? `${compatibility.score}%` : '—'}
                        </span>
                      </td>

                      <td className="p-4 text-[#5f7288] text-[13px]">
                        {new Date(application.applied_at).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="p-4">
                        {resume ? (
                          <button
                            onClick={() => handleDownload(resume.storage_path)}
                            disabled={downloadingPath === resume.storage_path}
                            className="text-[#0076ff] hover:underline font-medium text-[13px] flex items-center gap-1 cursor-pointer"
                          >
                            📄 {downloadingPath === resume.storage_path ? 'Baixando...' : 'PDF ↗'}
                          </button>
                        ) : (
                          <span className="text-[#5f7288] text-[12px] italic">Não anexado</span>
                        )}
                      </td>

                      <td className="p-4">
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
                      </td>

                      <td className="p-4 text-right">
                        <select
                          value={application.status}
                          onChange={(e) => handleStatusChange(application.id, e.target.value as ApplicationStatus)}
                          className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[12px] font-medium h-[32px] px-2 rounded-[2px] focus:outline-none"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_analise">Em análise</option>
                          <option value="aprovada">Aprovada</option>
                          <option value="rejeitada">Rejeitada</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
