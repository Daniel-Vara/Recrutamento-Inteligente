import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicJobs, getCandidateSkills } from '../../services/api';
import { Job, CandidateSkill } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { calculateCompatibility } from '../../utils/compatibility';
import { PageHeader } from '../../components/shared/PageHeader';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const Vagas: React.FC = () => {
  const { user, candidateProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [selectedCity, setSelectedCity] = useState('Todas');
  const [selectedWorkMode, setSelectedWorkMode] = useState('Todas');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await getPublicJobs();
        setJobs(list);

        if (user?.role === 'candidato' && candidateProfile) {
          const skills = await getCandidateSkills(candidateProfile.id);
          setCandidateSkills(skills);
        }
      } catch (err) {
        console.error('Erro ao carregar vagas:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, candidateProfile]);

  const filteredJobs = jobs.filter((job) => {
    if (search.trim()) {
      const s = search.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(s);
      const matchDesc = job.description.toLowerCase().includes(s);
      const matchComp = job.company?.name.toLowerCase().includes(s);
      const matchSkill = job.requirements?.some((r) => r.skill?.name.toLowerCase().includes(s));
      if (!matchTitle && !matchDesc && !matchComp && !matchSkill) return false;
    }
    if (selectedArea !== 'Todas' && job.area !== selectedArea) return false;
    if (selectedCity !== 'Todas' && job.city !== selectedCity) return false;
    if (selectedWorkMode !== 'Todas' && job.work_mode !== selectedWorkMode) return false;
    return true;
  });

  const areas = ['Todas', ...Array.from(new Set(jobs.map((j) => j.area)))];
  const cities = ['Todas', ...Array.from(new Set(jobs.map((j) => j.city)))];

  return (
    <div className="flex flex-col w-full pb-16">
      <PageHeader
        eyebrow="OPORTUNIDADES PROFISSIONAIS"
        title="Buscar vagas"
        description="Conecte seu talento a posições abertas em empresas parceiras com requisitos transparentes e avaliação objetiva."
        contextText="Oportunidades / Busca consolidada"
        backText="Início"
        backPath="/"
      />

      <div className="px-6 sm:px-[64px] py-8 flex flex-col gap-8 w-full max-w-7xl mx-auto">
        {/* Filtros de Busca */}
        <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Input
                label="Buscar por título, empresa ou competência"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ex: React, Node.js, Especialista full-stack..."
              />
            </div>
            <div className="w-full lg:w-48">
              <label className="font-medium text-[14px] text-[#0b5aa8] mb-2 block">
                Área de atuação
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none focus:border-[#5ea8ff]"
              >
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="w-full lg:w-44">
              <label className="font-medium text-[14px] text-[#0b5aa8] mb-2 block">
                Cidade
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none focus:border-[#5ea8ff]"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="w-full lg:w-44">
              <label className="font-medium text-[14px] text-[#0b5aa8] mb-2 block">
                Modalidade
              </label>
              <select
                value={selectedWorkMode}
                onChange={(e) => setSelectedWorkMode(e.target.value)}
                className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none focus:border-[#5ea8ff]"
              >
                <option value="Todas">Todas</option>
                <option value="presencial">Presencial</option>
                <option value="hibrido">Híbrido</option>
                <option value="remoto">Remoto</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#b8d8ff]/50 text-[13px] text-[#5f7288]">
            <span>
              Exibindo <strong className="text-[#0b5aa8]">{filteredJobs.length}</strong> vagas abertas
            </span>
            {(search || selectedArea !== 'Todas' || selectedCity !== 'Todas' || selectedWorkMode !== 'Todas') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedArea('Todas');
                  setSelectedCity('Todas');
                  setSelectedWorkMode('Todas');
                }}
                className="text-[#0076ff] hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Lista de Vagas */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-[#0b5aa8] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#5f7288] text-[14px]">Carregando oportunidades...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-12 text-center flex flex-col items-center gap-4">
            <p className="font-medium text-[#0b5aa8] text-[20px]">
              Nenhuma vaga encontrada para os critérios selecionados
            </p>
            <p className="text-[#5f7288] text-[14px] max-w-md">
              Tente remover alguns filtros ou buscar por outras competências e áreas profissionais.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filteredJobs.map((job) => {
              const comp = user?.role === 'candidato'
                ? calculateCompatibility(candidateSkills, job.requirements || [])
                : null;

              return (
                <div
                  key={job.id}
                  className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[#5ea8ff] transition-colors"
                >
                  <div className="flex flex-col gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase">
                        {job.company?.name || 'EMPRESA'}
                      </span>
                      <span className="text-[#b8d8ff]">•</span>
                      <span className="text-[12px] text-[#5f7288] capitalize">
                        {job.work_mode}
                      </span>
                      <span className="text-[#b8d8ff]">•</span>
                      <span className="text-[12px] text-[#5f7288] uppercase">
                        {job.employment_type}
                      </span>
                    </div>

                    <Link 
                      to={`/vagas/${job.id}`}
                      className="font-medium text-[#0b5aa8] text-[22px] sm:text-[26px] tracking-[-0.7px] hover:underline leading-tight"
                    >
                      {job.title}
                    </Link>

                    <p className="text-[#5f7288] text-[14px] line-clamp-2 leading-relaxed max-w-3xl">
                      {job.description}
                    </p>

                    {/* Competências exigidas */}
                    {job.requirements && job.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {job.requirements.map((req) => (
                          <Badge 
                            key={req.id} 
                            variant={req.requirement_type === 'obrigatorio' ? 'default' : 'neutral'}
                          >
                            {req.skill?.name || 'Skill'} ({req.minimum_level})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lado direito: Score ou Ação */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-4 shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-[#b8d8ff]/50">
                    {comp && comp.score !== null && (
                      <div className="flex flex-col md:items-end">
                        <div className="flex items-baseline gap-1">
                          <span className="font-medium text-[32px] text-[#0b5aa8] leading-none">
                            {comp.score}%
                          </span>
                        </div>
                        <span className="text-[11px] text-[#5f7288] uppercase tracking-wider">
                          Compatibilidade
                        </span>
                      </div>
                    )}

                    <Link to={`/vagas/${job.id}`} className="w-full sm:w-auto">
                      <Button size="md" showArrow className="w-full">
                        Ver detalhes
                      </Button>
                    </Link>
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
