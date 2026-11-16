import { 
  Profile, 
  CandidateProfile, 
  Company, 
  Skill, 
  CandidateSkill, 
  Resume, 
  Job, 
  JobRequirement, 
  Application, 
  ApplicationHistory, 
  UserRole,
  ProficiencyLevel,
  RequirementType,
  ApplicationStatus,
  WorkMode,
  EmploymentType,
  JobStatus
} from '../types';
import { INITIAL_SKILLS, INITIAL_JOBS, ATLAS_TECH_COMPANY } from './initialData';
import { calculateCompatibility } from '../utils/compatibility';

// Chaves do localStorage para persistência de estado do MVP
const STORAGE_KEYS = {
  PROFILES: 'appliety_profiles',
  CANDIDATE_PROFILES: 'appliety_candidate_profiles',
  COMPANIES: 'appliety_companies',
  SKILLS: 'appliety_skills',
  CANDIDATE_SKILLS: 'appliety_candidate_skills',
  RESUMES: 'appliety_resumes',
  JOBS: 'appliety_jobs',
  JOB_REQUIREMENTS: 'appliety_job_requirements',
  APPLICATIONS: 'appliety_applications',
  APPLICATION_HISTORY: 'appliety_application_history',
  RESUME_FILES: 'appliety_resume_files_blob', // armazena base64/metadata dos PDFs privados
};

// Suporte seguro para ambientes de teste Node.js e navegadores
const memoryStorage: Record<string, string> = {};
const isBrowserStorage = typeof localStorage !== 'undefined';

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = isBrowserStorage ? localStorage.getItem(key) : memoryStorage[key];
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    if (isBrowserStorage) {
      localStorage.setItem(key, serialized);
    } else {
      memoryStorage[key] = serialized;
    }
  } catch (err) {
    console.error('Erro ao salvar no storage local:', err);
  }
}

export function clearMemoryStorage(): void {
  if (isBrowserStorage) {
    localStorage.clear();
  }
  for (const k of Object.keys(memoryStorage)) {
    delete memoryStorage[k];
  }
}

// Inicializa o banco local com sementes caso vazio
export function initializeLocalDatabase(): void {
  const existingSkills = isBrowserStorage ? localStorage.getItem(STORAGE_KEYS.SKILLS) : memoryStorage[STORAGE_KEYS.SKILLS];
  if (!existingSkills) {
    setStored(STORAGE_KEYS.SKILLS, INITIAL_SKILLS);
  }
  const existingCompanies = isBrowserStorage ? localStorage.getItem(STORAGE_KEYS.COMPANIES) : memoryStorage[STORAGE_KEYS.COMPANIES];
  if (!existingCompanies) {
    setStored(STORAGE_KEYS.COMPANIES, [ATLAS_TECH_COMPANY]);
  }
  const existingJobs = isBrowserStorage ? localStorage.getItem(STORAGE_KEYS.JOBS) : memoryStorage[STORAGE_KEYS.JOBS];
  if (!existingJobs) {
    setStored(STORAGE_KEYS.JOBS, INITIAL_JOBS);
  }
  const existingReqs = isBrowserStorage ? localStorage.getItem(STORAGE_KEYS.JOB_REQUIREMENTS) : memoryStorage[STORAGE_KEYS.JOB_REQUIREMENTS];
  if (!existingReqs) {
    const reqs: JobRequirement[] = [];
    INITIAL_JOBS.forEach((j) => {
      if (j.requirements) reqs.push(...j.requirements);
    });
    setStored(STORAGE_KEYS.JOB_REQUIREMENTS, reqs);
  }
}

// Executa a inicialização
initializeLocalDatabase();

// ------------------------------------------------------------------------------
// SKILLS API
// ------------------------------------------------------------------------------
export async function getSkills(): Promise<Skill[]> {
  return getStored<Skill[]>(STORAGE_KEYS.SKILLS, INITIAL_SKILLS);
}

export async function addCustomSkill(name: string): Promise<Skill> {
  const skills = await getSkills();
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const existing = skills.find((s) => s.normalized_name === normalized);
  if (existing) return existing;

  const newSkill: Skill = {
    id: `skill-${Date.now()}`,
    name: name.trim(),
    normalized_name: normalized,
    created_at: new Date().toISOString(),
  };

  const updated = [...skills, newSkill];
  setStored(STORAGE_KEYS.SKILLS, updated);
  return newSkill;
}

// ------------------------------------------------------------------------------
// CANDIDATE PROFILE API
// ------------------------------------------------------------------------------
export async function getCandidateProfileByUserId(userId: string): Promise<CandidateProfile | null> {
  const candidateProfiles = getStored<CandidateProfile[]>(STORAGE_KEYS.CANDIDATE_PROFILES, []);
  let cp = candidateProfiles.find((c) => c.user_id === userId);
  
  if (!cp) {
    // Cria automaticamente caso não exista ainda
    cp = {
      id: `cp-${userId}`,
      user_id: userId,
      professional_summary: '',
      is_visible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    candidateProfiles.push(cp);
    setStored(STORAGE_KEYS.CANDIDATE_PROFILES, candidateProfiles);
  }

  // Preenche dados associados
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const profile = profiles.find((p) => p.id === userId);
  const skills = await getCandidateSkills(cp.id);
  const resume = await getCandidateResume(cp.id);

  return {
    ...cp,
    profile,
    skills,
    resume,
  };
}

export async function updateCandidateProfile(
  candidateId: string, 
  data: { professional_summary?: string; is_visible?: boolean }
): Promise<CandidateProfile> {
  const candidateProfiles = getStored<CandidateProfile[]>(STORAGE_KEYS.CANDIDATE_PROFILES, []);
  const index = candidateProfiles.findIndex((c) => c.id === candidateId);
  
  if (index === -1) {
    throw new Error('Perfil de candidato não encontrado.');
  }

  const updated: CandidateProfile = {
    ...candidateProfiles[index],
    ...data,
    updated_at: new Date().toISOString(),
  };

  candidateProfiles[index] = updated;
  setStored(STORAGE_KEYS.CANDIDATE_PROFILES, candidateProfiles);
  return updated;
}

// ------------------------------------------------------------------------------
// CANDIDATE SKILLS API
// ------------------------------------------------------------------------------
export async function getCandidateSkills(candidateId: string): Promise<CandidateSkill[]> {
  const candidateSkills = getStored<CandidateSkill[]>(STORAGE_KEYS.CANDIDATE_SKILLS, []);
  const allSkills = await getSkills();
  
  return candidateSkills
    .filter((cs) => cs.candidate_id === candidateId)
    .map((cs) => ({
      ...cs,
      skill: allSkills.find((s) => s.id === cs.skill_id),
    }));
}

export async function addCandidateSkill(
  candidateId: string, 
  skillId: string, 
  proficiencyLevel: ProficiencyLevel
): Promise<CandidateSkill> {
  const candidateSkills = getStored<CandidateSkill[]>(STORAGE_KEYS.CANDIDATE_SKILLS, []);
  
  // Impede duplicidade de competência no perfil
  const existing = candidateSkills.find(
    (cs) => cs.candidate_id === candidateId && cs.skill_id === skillId
  );
  if (existing) {
    // Atualiza nível caso já exista
    return updateCandidateSkill(existing.id, proficiencyLevel);
  }

  const newCandidateSkill: CandidateSkill = {
    id: `cs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    candidate_id: candidateId,
    skill_id: skillId,
    proficiency_level: proficiencyLevel,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  candidateSkills.push(newCandidateSkill);
  setStored(STORAGE_KEYS.CANDIDATE_SKILLS, candidateSkills);

  const allSkills = await getSkills();
  newCandidateSkill.skill = allSkills.find((s) => s.id === skillId);
  return newCandidateSkill;
}

export async function updateCandidateSkill(
  candidateSkillId: string, 
  proficiencyLevel: ProficiencyLevel
): Promise<CandidateSkill> {
  const candidateSkills = getStored<CandidateSkill[]>(STORAGE_KEYS.CANDIDATE_SKILLS, []);
  const index = candidateSkills.findIndex((cs) => cs.id === candidateSkillId);
  
  if (index === -1) {
    throw new Error('Competência não encontrada no perfil.');
  }

  const updated: CandidateSkill = {
    ...candidateSkills[index],
    proficiency_level: proficiencyLevel,
    updated_at: new Date().toISOString(),
  };

  candidateSkills[index] = updated;
  setStored(STORAGE_KEYS.CANDIDATE_SKILLS, candidateSkills);

  const allSkills = await getSkills();
  updated.skill = allSkills.find((s) => s.id === updated.skill_id);
  return updated;
}

export async function removeCandidateSkill(candidateSkillId: string): Promise<void> {
  const candidateSkills = getStored<CandidateSkill[]>(STORAGE_KEYS.CANDIDATE_SKILLS, []);
  const filtered = candidateSkills.filter((cs) => cs.id !== candidateSkillId);
  setStored(STORAGE_KEYS.CANDIDATE_SKILLS, filtered);
}

// ------------------------------------------------------------------------------
// RESUME STORAGE API (BUCKET PRIVADO, MAX 5MB, APENAS PDF)
// ------------------------------------------------------------------------------
export async function getCandidateResume(candidateId: string): Promise<Resume | null> {
  const resumes = getStored<Resume[]>(STORAGE_KEYS.RESUMES, []);
  return resumes.find((r) => r.candidate_id === candidateId) || null;
}

export async function uploadCandidateResume(
  candidateId: string, 
  file: File
): Promise<Resume> {
  // 1. Validação de tipo
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Apenas arquivos em formato PDF são permitidos.');
  }

  // 2. Validação de tamanho (máx 5MB = 5 * 1024 * 1024 bytes)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('O arquivo excede o limite máximo permitido de 5 MB.');
  }

  // 3. Lê o arquivo como base64 para o storage privado simulado
  let base64Data = '';
  if (typeof FileReader !== 'undefined') {
    base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } else if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    base64Data = `data:application/pdf;base64,${Buffer.from(buffer).toString('base64')}`;
  } else {
    base64Data = 'data:application/pdf;base64,mock';
  }

  const storagePath = `resumes/${candidateId}/${Date.now()}_${file.name}`;
  
  // Salva no storage de arquivos
  const fileVault = getStored<Record<string, { base64: string; name: string }>>(
    STORAGE_KEYS.RESUME_FILES, 
    {}
  );
  fileVault[storagePath] = { base64: base64Data, name: file.name };
  setStored(STORAGE_KEYS.RESUME_FILES, fileVault);

  // 4. Salva ou substitui registro no banco
  const resumes = getStored<Resume[]>(STORAGE_KEYS.RESUMES, []);
  const existingIndex = resumes.findIndex((r) => r.candidate_id === candidateId);

  const newResume: Resume = {
    id: existingIndex >= 0 ? resumes[existingIndex].id : `res-${Date.now()}`,
    candidate_id: candidateId,
    storage_path: storagePath,
    original_filename: file.name,
    file_size: file.size,
    created_at: existingIndex >= 0 ? resumes[existingIndex].created_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    resumes[existingIndex] = newResume;
  } else {
    resumes.push(newResume);
  }

  setStored(STORAGE_KEYS.RESUMES, resumes);
  return newResume;
}

export async function getResumeSecureUrl(
  storagePath: string, 
  requestingUserId: string
): Promise<{ url: string; filename: string }> {
  // Verificação de autorização (RLS):
  // 1. Próprio candidato?
  const candidateProfiles = getStored<CandidateProfile[]>(STORAGE_KEYS.CANDIDATE_PROFILES, []);
  const candidate = candidateProfiles.find((c) => c.user_id === requestingUserId);
  const resumes = getStored<Resume[]>(STORAGE_KEYS.RESUMES, []);
  const resume = resumes.find((r) => r.storage_path === storagePath);

  if (!resume) {
    throw new Error('Currículo não encontrado.');
  }

  const isOwner = candidate && candidate.id === resume.candidate_id;

  // 2. Empresa com candidatura ativa?
  let isAuthorizedCompany = false;
  const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, []);
  const company = companies.find((c) => c.owner_id === requestingUserId);

  if (company) {
    const jobs = getStored<Job[]>(STORAGE_KEYS.JOBS, []);
    const companyJobIds = jobs.filter((j) => j.company_id === company.id).map((j) => j.id);
    const applications = getStored<Application[]>(STORAGE_KEYS.APPLICATIONS, []);
    
    isAuthorizedCompany = applications.some(
      (app) => companyJobIds.includes(app.job_id) && 
               app.candidate_id === resume.candidate_id && 
               app.status !== 'retirada'
    );
  }

  if (!isOwner && !isAuthorizedCompany) {
    throw new Error('Acesso negado. Apenas o candidato ou empresas com candidatura ativa podem acessar este currículo.');
  }

  const fileVault = getStored<Record<string, { base64: string; name: string }>>(
    STORAGE_KEYS.RESUME_FILES, 
    {}
  );
  const fileEntry = fileVault[storagePath];
  if (!fileEntry) {
    throw new Error('Arquivo de currículo não encontrado no storage.');
  }

  return {
    url: fileEntry.base64,
    filename: resume.original_filename,
  };
}

// ------------------------------------------------------------------------------
// COMPANY API
// ------------------------------------------------------------------------------
export async function getCompanyByOwnerId(ownerId: string): Promise<Company | null> {
  const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, [ATLAS_TECH_COMPANY]);
  let comp = companies.find((c) => c.owner_id === ownerId);
  return comp || null;
}

export async function createOrUpdateCompany(
  ownerId: string, 
  data: { name: string; description?: string; city: string; website?: string }
): Promise<Company> {
  const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, [ATLAS_TECH_COMPANY]);
  const existingIndex = companies.findIndex((c) => c.owner_id === ownerId);

  const updatedCompany: Company = {
    id: existingIndex >= 0 ? companies[existingIndex].id : `comp-${Date.now()}`,
    owner_id: ownerId,
    name: data.name,
    description: data.description || null,
    city: data.city,
    website: data.website || null,
    created_at: existingIndex >= 0 ? companies[existingIndex].created_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    companies[existingIndex] = updatedCompany;
  } else {
    companies.push(updatedCompany);
  }

  setStored(STORAGE_KEYS.COMPANIES, companies);
  return updatedCompany;
}

// ------------------------------------------------------------------------------
// JOBS API
// ------------------------------------------------------------------------------
export async function getPublicJobs(filters?: {
  search?: string;
  area?: string;
  city?: string;
  workMode?: string;
  skillId?: string;
}): Promise<Job[]> {
  const jobs = getStored<Job[]>(STORAGE_KEYS.JOBS, INITIAL_JOBS);
  const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, [ATLAS_TECH_COMPANY]);
  const reqs = getStored<JobRequirement[]>(STORAGE_KEYS.JOB_REQUIREMENTS, []);
  const skills = await getSkills();

  // Apenas vagas publicadas
  let list = jobs.filter((j) => j.status === 'publicada');

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter((j) => 
      j.title.toLowerCase().includes(s) || 
      j.description.toLowerCase().includes(s) ||
      companies.find((c) => c.id === j.company_id)?.name.toLowerCase().includes(s)
    );
  }

  if (filters?.area && filters.area !== 'Todas') {
    list = list.filter((j) => j.area.toLowerCase() === filters.area?.toLowerCase());
  }

  if (filters?.city && filters.city !== 'Todas') {
    list = list.filter((j) => j.city.toLowerCase() === filters.city?.toLowerCase());
  }

  if (filters?.workMode && filters.workMode !== 'Todas') {
    list = list.filter((j) => j.work_mode === filters.workMode);
  }

  return list.map((job) => {
    const jobReqs = reqs.filter((r) => r.job_id === job.id).map((r) => ({
      ...r,
      skill: skills.find((s) => s.id === r.skill_id),
    }));
    return {
      ...job,
      company: companies.find((c) => c.id === job.company_id),
      requirements: jobReqs,
    };
  });
}

export async function getJobById(jobId: string): Promise<Job | null> {
  const jobs = getStored<Job[]>(STORAGE_KEYS.JOBS, INITIAL_JOBS);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return null;

  const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, [ATLAS_TECH_COMPANY]);
  const reqs = getStored<JobRequirement[]>(STORAGE_KEYS.JOB_REQUIREMENTS, []);
  const skills = await getSkills();

  const jobReqs = reqs.filter((r) => r.job_id === job.id).map((r) => ({
    ...r,
    skill: skills.find((s) => s.id === r.skill_id),
  }));

  return {
    ...job,
    company: companies.find((c) => c.id === job.company_id),
    requirements: jobReqs,
  };
}

export async function getCompanyJobs(companyId: string): Promise<Job[]> {
  const jobs = getStored<Job[]>(STORAGE_KEYS.JOBS, INITIAL_JOBS);
  const companyJobs = jobs.filter((j) => j.company_id === companyId);
  const applications = getStored<Application[]>(STORAGE_KEYS.APPLICATIONS, []);
  const reqs = getStored<JobRequirement[]>(STORAGE_KEYS.JOB_REQUIREMENTS, []);
  const skills = await getSkills();

  return companyJobs.map((j) => ({
    ...j,
    applications_count: applications.filter((a) => a.job_id === j.id && a.status !== 'retirada').length,
    requirements: reqs.filter((r) => r.job_id === j.id).map((r) => ({
      ...r,
      skill: skills.find((s) => s.id === r.skill_id),
    })),
  }));
}

export async function saveJob(
  companyId: string, 
  jobData: {
    id?: string;
    title: string;
    description: string;
    city: string;
    area: string;
    work_mode: WorkMode;
    employment_type: EmploymentType;
    status: JobStatus;
    requirements: {
      skill_id: string;
      requirement_type: RequirementType;
      minimum_level: ProficiencyLevel;
      weight: number;
    }[];
  }
): Promise<Job> {
  const jobs = getStored<Job[]>(STORAGE_KEYS.JOBS, INITIAL_JOBS);
  const allReqs = getStored<JobRequirement[]>(STORAGE_KEYS.JOB_REQUIREMENTS, []);
  
  const isEditing = Boolean(jobData.id);
  const jobId = jobData.id || `job-${Date.now()}`;

  const newJob: Job = {
    id: jobId,
    company_id: companyId,
    title: jobData.title,
    description: jobData.description,
    city: jobData.city,
    area: jobData.area,
    work_mode: jobData.work_mode,
    employment_type: jobData.employment_type,
    status: jobData.status,
    published_at: jobData.status === 'publicada' ? (isEditing ? jobs.find((j) => j.id === jobId)?.published_at || new Date().toISOString() : new Date().toISOString()) : null,
    created_at: isEditing ? jobs.find((j) => j.id === jobId)?.created_at || new Date().toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isEditing) {
    const idx = jobs.findIndex((j) => j.id === jobId);
    if (idx >= 0) jobs[idx] = newJob;
  } else {
    jobs.unshift(newJob);
  }
  setStored(STORAGE_KEYS.JOBS, jobs);

  // Atualiza requisitos
  const filteredReqs = allReqs.filter((r) => r.job_id !== jobId);
  const newReqs: JobRequirement[] = jobData.requirements.map((r, i) => ({
    id: `req-${jobId}-${i}-${Date.now()}`,
    job_id: jobId,
    skill_id: r.skill_id,
    requirement_type: r.requirement_type,
    minimum_level: r.minimum_level,
    weight: r.weight,
    created_at: new Date().toISOString(),
  }));

  setStored(STORAGE_KEYS.JOB_REQUIREMENTS, [...filteredReqs, ...newReqs]);
  return newJob;
}

// ------------------------------------------------------------------------------
// APPLICATIONS API
// ------------------------------------------------------------------------------
export async function applyToJob(jobId: string, candidateId: string): Promise<Application> {
  const applications = getStored<Application[]>(STORAGE_KEYS.APPLICATIONS, []);
  
  // 1. Verificação de candidatura duplicada ativa
  const existingActive = applications.find(
    (a) => a.job_id === jobId && a.candidate_id === candidateId && a.status !== 'retirada'
  );
  if (existingActive) {
    throw new Error('Você já possui uma candidatura ativa para esta vaga.');
  }

  // 2. Verifica se a vaga está publicada
  const jobs = getStored<Job[]>(STORAGE_KEYS.JOBS, INITIAL_JOBS);
  const job = jobs.find((j) => j.id === jobId);
  if (!job || job.status !== 'publicada') {
    throw new Error('Esta vaga não está recebendo candidaturas no momento.');
  }

  // 3. Registra nova candidatura
  const newApp: Application = {
    id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    job_id: jobId,
    candidate_id: candidateId,
    status: 'pendente',
    applied_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  applications.push(newApp);
  setStored(STORAGE_KEYS.APPLICATIONS, applications);

  // Registra no histórico
  recordHistory(newApp.id, null, 'pendente', candidateId);

  return newApp;
}

export async function withdrawApplication(applicationId: string, candidateId: string): Promise<void> {
  const applications = getStored<Application[]>(STORAGE_KEYS.APPLICATIONS, []);
  const app = applications.find((a) => a.id === applicationId);

  if (!app) throw new Error('Candidatura não encontrada.');
  if (app.candidate_id !== candidateId) throw new Error('Ação não autorizada.');

  const prevStatus = app.status;
  app.status = 'retirada';
  app.withdrawn_at = new Date().toISOString();
  app.updated_at = new Date().toISOString();

  setStored(STORAGE_KEYS.APPLICATIONS, applications);
  recordHistory(applicationId, prevStatus, 'retirada', candidateId);
}

export async function updateApplicationStatus(
  applicationId: string, 
  newStatus: ApplicationStatus, 
  changedByUserId: string
): Promise<Application> {
  const applications = getStored<Application[]>(STORAGE_KEYS.APPLICATIONS, []);
  const app = applications.find((a) => a.id === applicationId);

  if (!app) throw new Error('Candidatura não encontrada.');

  const prevStatus = app.status;
  app.status = newStatus;
  app.updated_at = new Date().toISOString();

  setStored(STORAGE_KEYS.APPLICATIONS, applications);
  recordHistory(applicationId, prevStatus, newStatus, changedByUserId);

  return app;
}

function recordHistory(
  applicationId: string, 
  previousStatus: string | null, 
  newStatus: string, 
  changedBy: string
) {
  const history = getStored<ApplicationHistory[]>(STORAGE_KEYS.APPLICATION_HISTORY, []);
  const entry: ApplicationHistory = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    application_id: applicationId,
    previous_status: previousStatus,
    new_status: newStatus,
    changed_by: changedBy,
    created_at: new Date().toISOString(),
  };
  history.push(entry);
  setStored(STORAGE_KEYS.APPLICATION_HISTORY, history);
}

export async function getCandidateApplications(candidateId: string): Promise<Application[]> {
  const applications = getStored<Application[]>(STORAGE_KEYS.APPLICATIONS, []);
  const candidateApps = applications.filter((a) => a.candidate_id === candidateId);
  const jobs = getStored<Job[]>(STORAGE_KEYS.JOBS, INITIAL_JOBS);
  const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, [ATLAS_TECH_COMPANY]);
  const history = getStored<ApplicationHistory[]>(STORAGE_KEYS.APPLICATION_HISTORY, []);

  return candidateApps.map((a) => {
    const job = jobs.find((j) => j.id === a.job_id);
    return {
      ...a,
      job: job ? { ...job, company: companies.find((c) => c.id === job.company_id) } : undefined,
      history: history.filter((h) => h.application_id === a.id),
    };
  });
}

export async function getJobCandidatesRanking(jobId: string) {
  const job = await getJobById(jobId);
  if (!job) return [];

  const applications = getStored<Application[]>(STORAGE_KEYS.APPLICATIONS, []);
  const jobApps = applications.filter((a) => a.job_id === jobId && a.status !== 'retirada');
  
  const candidateProfiles = getStored<CandidateProfile[]>(STORAGE_KEYS.CANDIDATE_PROFILES, []);
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const resumes = getStored<Resume[]>(STORAGE_KEYS.RESUMES, []);
  const history = getStored<ApplicationHistory[]>(STORAGE_KEYS.APPLICATION_HISTORY, []);

  const ranking = await Promise.all(
    jobApps.map(async (app) => {
      const candidate = candidateProfiles.find((c) => c.id === app.candidate_id);
      const profile = candidate ? profiles.find((p) => p.id === candidate.user_id) : null;
      const skills = candidate ? await getCandidateSkills(candidate.id) : [];
      const resume = candidate ? resumes.find((r) => r.candidate_id === candidate.id) : null;
      const appHistory = history.filter((h) => h.application_id === app.id);

      const compatibility = calculateCompatibility(skills, job.requirements || []);

      return {
        application: app,
        candidate,
        profile,
        skills,
        resume,
        compatibility,
        history: appHistory,
      };
    })
  );

  // Ordena por maior compatibilidade (compatíveis primeiro, maior score primeiro, data mais antiga primeiro)
  return ranking.sort((a, b) => {
    if (a.compatibility.is_compatible !== b.compatibility.is_compatible) {
      return a.compatibility.is_compatible ? -1 : 1;
    }
    const scoreA = a.compatibility.score ?? -1;
    const scoreB = b.compatibility.score ?? -1;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return new Date(a.application.applied_at).getTime() - new Date(b.application.applied_at).getTime();
  });
}

// ------------------------------------------------------------------------------
// CANDIDATE RECOMMENDED JOBS API
// ------------------------------------------------------------------------------
export async function getRecommendedJobsForCandidate(candidateId: string): Promise<{
  job: Job;
  compatibility: ReturnType<typeof calculateCompatibility>;
  applied: boolean;
}[]> {
  const publicJobs = await getPublicJobs();
  const candidateSkills = await getCandidateSkills(candidateId);
  const applications = getStored<Application[]>(STORAGE_KEYS.APPLICATIONS, []);

  const results = publicJobs.map((job) => {
    const compatibility = calculateCompatibility(candidateSkills, job.requirements || []);
    const applied = applications.some(
      (a) => a.job_id === job.id && a.candidate_id === candidateId && a.status !== 'retirada'
    );
    return {
      job,
      compatibility,
      applied,
    };
  });

  return results.sort((a, b) => {
    if (a.compatibility.is_compatible !== b.compatibility.is_compatible) {
      return a.compatibility.is_compatible ? -1 : 1;
    }
    const scoreA = a.compatibility.score ?? -1;
    const scoreB = b.compatibility.score ?? -1;
    return scoreB - scoreA;
  });
}
