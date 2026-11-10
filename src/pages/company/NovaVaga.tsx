import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getJobById, saveJob, getSkills, addCustomSkill } from '../../services/api';
import { 
  Skill, 
  ProficiencyLevel, 
  RequirementType, 
  WorkMode, 
  EmploymentType, 
  JobStatus 
} from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { NoticeBanner } from '../../components/shared/NoticeBanner';

interface RequirementDraft {
  skill_id: string;
  skill_name: string;
  requirement_type: RequirementType;
  minimum_level: ProficiencyLevel;
  weight: number;
}

export const CompanyNovaVaga: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { company } = useAuth();
  const navigate = useNavigate();

  // Basic job fields
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('Tecnologia da Informação');
  const [city, setCity] = useState(company?.city || 'São Paulo');
  const [workMode, setWorkMode] = useState<WorkMode>('presencial');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('clt');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<JobStatus>('publicada');

  // Requirements
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [requirements, setRequirements] = useState<RequirementDraft[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [reqType, setReqType] = useState<RequirementType>('obrigatorio');
  const [minLevel, setMinLevel] = useState<ProficiencyLevel>('intermediario');
  const [weight, setWeight] = useState(3);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const skillsList = await getSkills();
        setAllSkills(skillsList);
        if (skillsList.length > 0) {
          setSelectedSkillId(skillsList[0].id);
        }

        if (id) {
          const existingJob = await getJobById(id);
          if (existingJob) {
            setTitle(existingJob.title);
            setArea(existingJob.area);
            setCity(existingJob.city);
            setWorkMode(existingJob.work_mode);
            setEmploymentType(existingJob.employment_type);
            setDescription(existingJob.description);
            setStatus(existingJob.status);
            if (existingJob.requirements) {
              setRequirements(
                existingJob.requirements.map((r) => ({
                  skill_id: r.skill_id,
                  skill_name: r.skill?.name || 'Competência',
                  requirement_type: r.requirement_type,
                  minimum_level: r.minimum_level,
                  weight: r.weight,
                }))
              );
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAddRequirement = async () => {
    let skillIdToAdd = selectedSkillId;
    let skillNameToAdd = allSkills.find((s) => s.id === selectedSkillId)?.name || '';

    if (customSkillName.trim()) {
      const created = await addCustomSkill(customSkillName.trim());
      skillIdToAdd = created.id;
      skillNameToAdd = created.name;
      setCustomSkillName('');
      setAllSkills(await getSkills());
    }

    if (!skillIdToAdd) return;

    // Impede adicionar o mesmo requisito duas vezes
    if (requirements.some((r) => r.skill_id === skillIdToAdd)) {
      setError('Esta competência já foi adicionada aos requisitos desta vaga.');
      return;
    }

    setRequirements([
      ...requirements,
      {
        skill_id: skillIdToAdd,
        skill_name: skillNameToAdd,
        requirement_type: reqType,
        minimum_level: minLevel,
        weight,
      },
    ]);
    setError(null);
  };

  const handleRemoveRequirement = (skillId: string) => {
    setRequirements(requirements.filter((r) => r.skill_id !== skillId));
  };

  const handleSave = async (chosenStatus?: JobStatus) => {
    if (!company) return;
    if (!title.trim()) {
      setError('Por favor, informe o título da vaga.');
      return;
    }
    if (!description.trim()) {
      setError('Por favor, descreva as responsabilidades e requisitos da vaga.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const targetStatus = chosenStatus || status;
      await saveJob(company.id, {
        id: id || undefined,
        title,
        description,
        city,
        area,
        work_mode: workMode,
        employment_type: employmentType,
        status: targetStatus,
        requirements: requirements.map((r) => ({
          skill_id: r.skill_id,
          requirement_type: r.requirement_type,
          minimum_level: r.minimum_level,
          weight: r.weight,
        })),
      });

      navigate('/empresa/vagas');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar a oportunidade.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#5f7288]">Carregando dados da vaga...</div>;
  }

  return (
    <div className="flex flex-col w-full pb-24 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow={`${company?.name || 'EMPRESA'} / ${isEditing ? 'EDITAR VAGA' : 'NOVA VAGA'}`}
        title={isEditing ? 'Editar detalhes da vaga' : 'Publicar nova vaga'}
        description="Defina informações claras e critérios ponderados para atrair talentos qualificados através de matching determinístico."
        contextText={`Área da empresa / ${isEditing ? 'Editar oportunidade' : 'Publicação de oportunidade'}`}
        backPath="/empresa/vagas"
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-5xl mx-auto w-full flex flex-col gap-8">
        <NoticeBanner
          title="Transparência nos Requisitos de Matching"
          description="Requisitos 'Obrigatórios' eliminam candidatos que não atingem o nível exigido. Requisitos 'Desejáveis' agregam peso proporcional ao score de compatibilidade."
        />

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-[2px] text-[14px]">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-col gap-8">
          {/* Seção 1: Dados e Descrição (Figma node 2:2734) */}
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-6">
            <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.6px] border-b border-[#b8d8ff]/50 pb-3">
              Informações da oportunidade
            </h2>

            <Input
              label="Título da vaga *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Especialista em desenvolvimento full-stack"
              requiredAsterisk
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="font-medium text-[14px] text-[#0b5aa8] mb-2 block">
                  Área profissional *
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none"
                >
                  <option value="Tecnologia da Informação">Tecnologia da Informação</option>
                  <option value="Engenharia de Software">Engenharia de Software</option>
                  <option value="Design & UX">Design & UX</option>
                  <option value="Produto">Produto</option>
                  <option value="Dados e Analytics">Dados e Analytics</option>
                </select>
              </div>

              <Input
                label="Cidade *"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                requiredAsterisk
                required
              />

              <div>
                <label className="font-medium text-[14px] text-[#0b5aa8] mb-2 block">
                  Modalidade *
                </label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none capitalize"
                >
                  <option value="presencial">Presencial</option>
                  <option value="hibrido">Híbrido</option>
                  <option value="remoto">Remoto</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[14px] text-[#0b5aa8] mb-2 block">
                  Tipo de contratação *
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none uppercase"
                >
                  <option value="clt">CLT</option>
                  <option value="pj">PJ</option>
                  <option value="estagio">Estágio</option>
                  <option value="temporario">Temporário</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-[14px] text-[#0b5aa8]">
                Descrição detalhada da vaga e desafios *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Descreva as principais responsabilidades, desafios técnicos da squad e o ambiente de trabalho..."
                className="bg-[#f8fbff] border border-[#b8d8ff] focus:border-[#5ea8ff] focus:ring-1 focus:ring-[#5ea8ff] outline-none p-4 rounded-[4px] text-[15px] text-[#0b5aa8] leading-relaxed resize-y font-sans"
                required
              />
            </div>
          </div>

          {/* Seção 2: Requisitos e Critérios de Matching (Figma node 2:2602) */}
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-6">
            <div className="border-b border-[#b8d8ff]/50 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.6px]">
                  Requisitos e critérios de matching
                </h2>
                <p className="text-[#5f7288] text-[13px]">
                  Fórmula determinística: Score = (Soma dos pesos atendidos / Soma total dos pesos) × 100.
                </p>
              </div>
              <Badge variant="default">{requirements.length} critérios adicionados</Badge>
            </div>

            {/* Inserir Requisito */}
            <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-5 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="font-medium text-[13px] text-[#0b5aa8] mb-1 block">
                  Competência do catálogo
                </label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => { setSelectedSkillId(e.target.value); setCustomSkillName(''); }}
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none"
                >
                  {allSkills.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 w-full">
                <label className="font-medium text-[13px] text-[#0b5aa8] mb-1 block">
                  Ou nova competência
                </label>
                <input
                  type="text"
                  value={customSkillName}
                  onChange={(e) => setCustomSkillName(e.target.value)}
                  placeholder="Ex: GraphQL..."
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none"
                />
              </div>

              <div className="w-full md:w-36">
                <label className="font-medium text-[13px] text-[#0b5aa8] mb-1 block">
                  Tipo
                </label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value as RequirementType)}
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none capitalize"
                >
                  <option value="obrigatorio">Obrigatório</option>
                  <option value="desejavel">Desejável</option>
                </select>
              </div>

              <div className="w-full md:w-40">
                <label className="font-medium text-[13px] text-[#0b5aa8] mb-1 block">
                  Nível mínimo
                </label>
                <select
                  value={minLevel}
                  onChange={(e) => setMinLevel(e.target.value as ProficiencyLevel)}
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none capitalize"
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="basico">Básico</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                  <option value="especialista">Especialista</option>
                </select>
              </div>

              <div className="w-full md:w-28">
                <label className="font-medium text-[13px] text-[#0b5aa8] mb-1 block">
                  Peso (1 a 10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="bg-[#f8fbff] border border-[#b8d8ff] text-[#0b5aa8] text-[14px] h-[50px] px-3 rounded-[4px] w-full focus:outline-none"
                />
              </div>

              <Button
                type="button"
                onClick={handleAddRequirement}
                className="w-full md:w-auto h-[50px] shrink-0"
              >
                + Adicionar
              </Button>
            </div>

            {/* Lista de Requisitos */}
            <div className="flex flex-col gap-3">
              {requirements.length === 0 ? (
                <p className="text-[#5f7288] text-[14px] py-4 text-center">
                  Nenhum critério adicionado ainda. Adicione acima para que o sistema de compatibilidade avalie os candidatos.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {requirements.map((req) => (
                    <div
                      key={req.skill_id}
                      className="border border-[#b8d8ff] bg-white p-4 flex items-center justify-between gap-4 rounded-[2px]"
                    >
                      <div className="flex items-center gap-3">
                        <strong className="text-[#0b5aa8] text-[15px]">
                          {req.skill_name}
                        </strong>
                        <Badge variant={req.requirement_type === 'obrigatorio' ? 'default' : 'neutral'}>
                          {req.requirement_type === 'obrigatorio' ? 'Obrigatório' : 'Desejável'}
                        </Badge>
                        <span className="text-[13px] text-[#5f7288]">
                          Exige: <span className="capitalize">{req.minimum_level}</span>
                        </span>
                        <span className="text-[13px] text-[#5f7288]">
                          Peso: {req.weight}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(req.skill_id)}
                        className="text-red-600 hover:text-red-800 text-[18px] px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Barra de Ações (Figma node 2:2490) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#b8d8ff] pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => handleSave('rascunho')}
            >
              Salvar como Rascunho
            </Button>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Button
                type="button"
                variant="primary"
                size="lg"
                showArrow
                disabled={saving}
                onClick={() => handleSave('publicada')}
                className="w-full sm:w-auto"
              >
                {saving ? 'Publicando...' : isEditing ? 'Salvar e Atualizar Vaga' : 'Publicar Vaga ↗'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
