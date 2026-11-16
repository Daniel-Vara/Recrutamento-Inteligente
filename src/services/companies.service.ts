/**
 * Serviço de empresas — perfil corporativo e candidatos visíveis.
 */
import { apiRequest } from './apiClient';
import type { Company } from '../types';

export async function getCompanyProfileApi(): Promise<Company> {
  return apiRequest<Company>('/companies/profile/');
}

export async function updateCompanyProfileApi(data: {
  name?: string;
  description?: string;
  city?: string;
  website?: string;
}): Promise<Company> {
  return apiRequest<Company>('/companies/profile/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export interface VisibleCandidate {
  id: string;
  user_id: string;
  profile: {
    id: string;
    full_name: string;
    email: string;
    city: string | null;
  };
  professional_summary: string | null;
  is_visible: boolean;
  skills: unknown[];
  resume: unknown | null;
  compatibility: {
    score: number | null;
    is_compatible: boolean;
    details: unknown[];
  } | null;
}

export async function getVisibleCandidatesApi(job_id?: string): Promise<VisibleCandidate[]> {
  const qs = job_id ? `?job_id=${job_id}` : '';
  return apiRequest<VisibleCandidate[]>(`/companies/candidates/${qs}`);
}
