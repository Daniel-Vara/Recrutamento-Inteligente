/**
 * Cliente HTTP centralizado para consumo da API Django REST.
 * Gerencia tokens JWT, refresh automático e tratamento de erros.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

const TOKEN_KEYS = {
  ACCESS: 'appliety_access_token',
  REFRESH: 'appliety_refresh_token',
};

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.REFRESH);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEYS.ACCESS, access);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    localStorage.setItem(TOKEN_KEYS.ACCESS, data.access);
    if (data.refresh) {
      localStorage.setItem(TOKEN_KEYS.REFRESH, data.refresh);
    }
    return data.access;
  } catch {
    clearTokens();
    return null;
  }
}

export interface ApiError {
  status: number;
  message: string;
  detail?: unknown;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; isFormData?: boolean } = {},
): Promise<T> {
  const { skipAuth = false, isFormData = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    let token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  let response = await fetch(url, {
    ...fetchOptions,
    headers: { ...headers, ...(fetchOptions.headers as Record<string, string> ?? {}) },
  });

  // Tenta refresh automático em caso de 401
  if (response.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...fetchOptions,
        headers: { ...headers, ...(fetchOptions.headers as Record<string, string> ?? {}) },
      });
    }
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }

    const errorMessage =
      (typeof detail === 'object' && detail !== null && 'detail' in detail)
        ? String((detail as Record<string, unknown>).detail)
        : response.statusText;

    const err: ApiError = {
      status: response.status,
      message: errorMessage,
      detail,
    };
    throw err;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
