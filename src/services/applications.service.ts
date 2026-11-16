/**
 * Serviço de candidaturas — aplicar, retirar, listar, atualizar status.
 */
import { apiRequest } from './apiClient';
import type { Application, ApplicationStatus } from '../types';

// --- Candidato ---

export async function getMyApplicationsApi(): Promise<Application[]> {
  return apiRequest<Application[]>('/applications/');
}

export async function applyToJobApi(job_id: string): Promise<Application> {
  return apiRequest<Application>(`/applications/apply/${job_id}/`, {
    method: 'POST',
  });
}

export async function withdrawApplicationApi(id: string): Promise<{ detail: string }> {
  return apiRequest(`/applications/${id}/withdraw/`, { method: 'POST' });
}

// --- Empresa ---

export async function getCompanyApplicationsApi(): Promise<Application[]> {
  return apiRequest<Application[]>('/companies/applications/');
}

export async function updateApplicationStatusApi(
  id: string,
  status: 'em_analise' | 'aprovada' | 'rejeitada',
): Promise<Application> {
  return apiRequest<Application>(`/applications/${id}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getJobCandidatesRankingApi(job_id: string): Promise<unknown[]> {
  return apiRequest<unknown[]>(`/companies/jobs/${job_id}/candidates/`);
}

// --- Recomendações e dashboards ---

export async function getRecommendedJobsApi(): Promise<unknown[]> {
  return apiRequest<unknown[]>('/recommendations/');
}

export async function getCandidateDashboardApi(): Promise<unknown> {
  return apiRequest('/dashboards/candidate/');
}

export async function getCompanyDashboardApi(): Promise<unknown> {
  return apiRequest('/dashboards/company/');
}
