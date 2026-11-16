/**
 * Serviço de vagas — listagem pública, gestão da empresa.
 */
import { apiRequest } from './apiClient';
import type { Job, WorkMode, EmploymentType, JobStatus, ProficiencyLevel, RequirementType } from '../types';

export interface JobFilters {
  search?: string;
  area?: string;
  city?: string;
  work_mode?: string;
}

export async function getPublicJobsApi(filters?: JobFilters): Promise<Job[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.area) params.set('area', filters.area);
  if (filters?.city) params.set('city', filters.city);
  if (filters?.work_mode) params.set('work_mode', filters.work_mode);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<Job[]>(`/jobs/${qs}`, { skipAuth: true });
}

export async function getPublicJobByIdApi(id: string): Promise<Job> {
  return apiRequest<Job>(`/jobs/${id}/`, { skipAuth: true });
}

export async function getMyJobsApi(): Promise<Job[]> {
  return apiRequest<Job[]>('/jobs/my-jobs/');
}

export async function getMyJobByIdApi(id: string): Promise<Job> {
  return apiRequest<Job>(`/jobs/my-jobs/${id}/`);
}

export interface SaveJobData {
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

export async function createJobApi(data: SaveJobData): Promise<Job> {
  return apiRequest<Job>('/jobs/my-jobs/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateJobApi(id: string, data: Partial<SaveJobData>): Promise<Job> {
  return apiRequest<Job>(`/jobs/my-jobs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteJobApi(id: string): Promise<void> {
  return apiRequest<void>(`/jobs/my-jobs/${id}/`, { method: 'DELETE' });
}
