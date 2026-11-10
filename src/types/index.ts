export type UserRole = 'candidato' | 'empresa';

export type WorkMode = 'presencial' | 'hibrido' | 'remoto';

export type EmploymentType = 'clt' | 'pj' | 'estagio' | 'temporario' | 'freelancer';

export type JobStatus = 'rascunho' | 'publicada' | 'encerrada' | 'arquivada';

export type ProficiencyLevel = 'iniciante' | 'basico' | 'intermediario' | 'avancado' | 'especialista';

export type RequirementType = 'obrigatorio' | 'desejavel';

export type ApplicationStatus = 'pendente' | 'em_analise' | 'aprovada' | 'rejeitada' | 'retirada';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  city?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  professional_summary?: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  skills?: CandidateSkill[];
  resume?: Resume | null;
}

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  city: string;
  website?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: Profile;
}

export interface Skill {
  id: string;
  name: string;
  normalized_name: string;
  created_at?: string;
}

export interface CandidateSkill {
  id: string;
  candidate_id: string;
  skill_id: string;
  proficiency_level: ProficiencyLevel;
  created_at: string;
  updated_at: string;
  skill?: Skill;
}

export interface Resume {
  id: string;
  candidate_id: string;
  storage_path: string;
  original_filename: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  city: string;
  area: string;
  work_mode: WorkMode;
  employment_type: EmploymentType;
  status: JobStatus;
  published_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  company?: Company;
  requirements?: JobRequirement[];
  applications_count?: number;
}

export interface JobRequirement {
  id: string;
  job_id: string;
  skill_id: string;
  requirement_type: RequirementType;
  minimum_level: ProficiencyLevel;
  weight: number;
  created_at: string;
  // Joined fields
  skill?: Skill;
}

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  applied_at: string;
  withdrawn_at?: string | null;
  updated_at: string;
  // Joined fields
  job?: Job;
  candidate?: CandidateProfile;
  history?: ApplicationHistory[];
}

export interface ApplicationHistory {
  id: string;
  application_id: string;
  previous_status?: string | null;
  new_status: string;
  changed_by: string;
  created_at: string;
  changer_profile?: Profile;
}

export interface CompatibilityResult {
  score: number | null;
  is_compatible: boolean;
  has_mandatory_fail: boolean;
  total_requirements: number;
  met_weight: number;
  total_weight: number;
  details?: {
    skill_name: string;
    requirement_type: RequirementType;
    minimum_level: ProficiencyLevel;
    candidate_level?: ProficiencyLevel | null;
    is_met: boolean;
    weight: number;
  }[];
}
