/**
 * Serviço de candidatos — perfil, competências e currículo.
 */
import { apiRequest } from './apiClient';
import type { CandidateProfile, CandidateSkill, Resume, Skill, ProficiencyLevel } from '../types';

// --- Perfil ---

export async function getCandidateProfileApi(): Promise<CandidateProfile> {
  return apiRequest<CandidateProfile>('/candidates/profile/');
}

export async function updateCandidateProfileApi(data: {
  professional_summary?: string;
  is_visible?: boolean;
}): Promise<CandidateProfile> {
  return apiRequest<CandidateProfile>('/candidates/profile/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// --- Competências ---

export async function getCandidateSkillsApi(): Promise<CandidateSkill[]> {
  return apiRequest<CandidateSkill[]>('/candidates/skills/');
}

export async function addCandidateSkillApi(
  skill_id: string,
  proficiency_level: ProficiencyLevel,
): Promise<CandidateSkill> {
  return apiRequest<CandidateSkill>('/candidates/skills/', {
    method: 'POST',
    body: JSON.stringify({ skill_id, proficiency_level }),
  });
}

export async function updateCandidateSkillApi(
  id: string,
  proficiency_level: ProficiencyLevel,
): Promise<CandidateSkill> {
  return apiRequest<CandidateSkill>(`/candidates/skills/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ proficiency_level }),
  });
}

export async function removeCandidateSkillApi(id: string): Promise<void> {
  return apiRequest<void>(`/candidates/skills/${id}/`, { method: 'DELETE' });
}

// --- Currículo ---

export async function getResumeApi(): Promise<Resume | null> {
  const result = await apiRequest<Resume | null>('/candidates/resume/');
  return result ?? null;
}

export async function uploadResumeApi(file: File): Promise<Resume> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<Resume>('/candidates/resume/', {
    method: 'POST',
    body: formData,
    isFormData: true,
  });
}

// --- Catálogo global de skills ---

export async function getSkillsApi(search?: string): Promise<Skill[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<Skill[]>(`/skills/${qs}`);
}

export async function createSkillApi(name: string): Promise<Skill> {
  return apiRequest<Skill>('/skills/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
