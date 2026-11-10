import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCompanyJobs, saveJob } from '../../services/api';
import { Job, JobStatus } from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

export const CompanyVagas: React.FC = () => {
  const { company } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const loadJobs = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const list = await getCompanyJobs(company.id);
      setJobs(list);
    } catch (err) {
      console.error('Erro ao listar vagas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [company]);

  const handleToggleStatus = async (job: Job, newStatus: JobStatus) => {
    if (!company) return;
    try {
      await saveJob(company.id, {
        id: job.id,
        title: job.title,
        description: job.description,
        city: job.city,
        area: job.area,
        work_mode: job.work_mode,
        employment_type: job.employment_type,
        status: newStatus,
        requirements: (job.requirements || []).map((r) => ({
          skill_id: r.skill_id,
          requirement_type: r.requirement_type,
          minimum_level: r.minimum_level,
          weight: r.weight,
        })),
      });
      await loadJobs();
    } catch (err) {
      console.error('Erro ao atualizar status da vaga:', err);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!j.title.toLowerCase().includes(s) && !j.city.toLowerCase().includes(s)) return false;
    }
    if (statusFilter !== 'todos' && j.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-24 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow={`${company?.name || 'EMPRESA'} / PAINEL DE VAGAS`}
        title="Abra espaço para novos talentos."
        description="Gerencie suas vagas ativas, rascunhos em preparação e encerre processos com facilidade."
        contextText="Área da empresa / Painel de vagas"
        backPath="/empresa/dashboard"
        rightAction={
          <Link to="/empresa/vagas/nova">
            <Button size="sm" showArrow>
              Publicar Nova Vaga
            </Button>
          </Link>
        }
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Barra de Filtros (Figma node 2:2902) */}
        <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input
              label="Buscar por título ou cidade"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex: Desenvolvedor, São Paulo..."
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="font-medium text-[14px] text-[#0b5aa8] mb-2 block">
              Status da vaga
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none"
            >
              <option value="todos">Todos os status</option>
              <option value="publicada">Publicada</option>
              <option value="rascunho">Rascunho</option>
              <option value="encerrada">Encerrada</option>
              <option value="arquivada">Arquivada</option>
            </select>
          </div>
        </div>

        {/* Lista de Vagas da Empresa (Figma node 2:2915) */}
        {loading ? (
          <div className="text-center py-16 text-[#5f7288]">Carregando oportunidades da empresa...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-12 text-center flex flex-col items-center gap-4">
            <p className="font-medium text-[#0b5aa8] text-[18px]">
              Nenhuma vaga encontrada com os filtros aplicados
            </p>
            <Link to="/empresa/vagas/nova">
              <Button size="md" showArrow>Publicar Nova Vaga</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:border-[#5ea8ff] transition-colors"
              >
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
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
                    <span className="text-[#5f7288] text-[13px]">
                      {job.city} • <span className="capitalize">{job.work_mode}</span> • Contratação {job.employment_type.toUpperCase()}
                    </span>
                  </div>

                  <Link
                    to={`/empresa/vagas/${job.id}`}
                    className="font-medium text-[#0b5aa8] text-[22px] sm:text-[24px] tracking-[-0.7px] hover:underline"
                  >
                    {job.title}
                  </Link>

                  <div className="flex items-center gap-4 text-[13px] text-[#5f7288] pt-1">
                    <strong className="text-[#0b5aa8]">
                      {job.applications_count || 0} candidaturas recebidas
                    </strong>
                    <span>•</span>
                    <span>
                      {job.requirements?.length || 0} critérios cadastrados
                    </span>
                    <span>•</span>
                    <span>
                      Criada em {new Date(job.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-[#b8d8ff]/40">
                  <Link to={`/empresa/candidatos?vaga=${job.id}`}>
                    <Button variant="primary" size="sm" showArrow>
                      Ver Ranking ({job.applications_count || 0})
                    </Button>
                  </Link>
                  <Link to={`/empresa/vagas/${job.id}`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>

                  {job.status === 'publicada' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleStatus(job, 'encerrada')}
                    >
                      Encerrar
                    </Button>
                  ) : job.status === 'encerrada' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleStatus(job, 'publicada')}
                    >
                      Republicar
                    </Button>
                  ) : job.status === 'rascunho' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleToggleStatus(job, 'publicada')}
                    >
                      Publicar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
