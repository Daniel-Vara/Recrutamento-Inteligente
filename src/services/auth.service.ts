/**
 * Serviço de autenticação — login, registro, logout, me, recuperação de senha.
 */
import { apiRequest, setTokens, clearTokens } from './apiClient';
import type { Profile } from '../types';

export interface AuthTokens {
  access: string;
  refresh: string;
  user: Profile;
}

export async function loginApi(email: string, password: string): Promise<AuthTokens> {
  const data = await apiRequest<AuthTokens>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
  setTokens(data.access, data.refresh);
  return data;
}

export interface RegisterParams {
  email: string;
  password: string;
  full_name: string;
  role: 'candidato' | 'empresa';
  city?: string;
  phone?: string;
  company_name?: string;
}

export async function registerApi(params: RegisterParams): Promise<AuthTokens> {
  const data = await apiRequest<AuthTokens>('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(params),
    skipAuth: true,
  });
  setTokens(data.access, data.refresh);
  return data;
}

export async function logoutApi(refresh: string): Promise<void> {
  try {
    await apiRequest('/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    });
  } finally {
    clearTokens();
  }
}

export async function getMeApi(): Promise<Profile> {
  return apiRequest<Profile>('/auth/me/');
}

export async function updateMeApi(data: { full_name?: string; city?: string; phone?: string }): Promise<Profile> {
  return apiRequest<Profile>('/auth/me/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function requestPasswordResetApi(email: string): Promise<{ detail: string }> {
  return apiRequest('/auth/password-reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
}

export async function confirmPasswordResetApi(uid: string, token: string, new_password: string): Promise<{ detail: string }> {
  return apiRequest('/auth/password-reset/confirm/', {
    method: 'POST',
    body: JSON.stringify({ uid, token, new_password }),
    skipAuth: true,
  });
}
