import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, CandidateProfile, Company, UserRole } from '../types';
import {
  loginApi,
  registerApi,
  logoutApi,
  getMeApi,
  updateMeApi,
  RegisterParams,
} from '../services/auth.service';
import { getCandidateProfileApi } from '../services/candidates.service';
import { getCompanyProfileApi } from '../services/companies.service';
import { getRefreshToken, clearTokens } from '../services/apiClient';
import {
  getCandidateProfileByUserId,
  getCompanyByOwnerId,
  createOrUpdateCompany,
} from '../services/api';

const LOCAL_USER_KEY = 'appliety_current_user_session';

interface AuthContextType {
  user: Profile | null;
  candidateProfile: CandidateProfile | null;
  company: Company | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  signup: (params: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
    city?: string;
    phone?: string;
    companyName?: string;
  }) => Promise<Profile>;
  logout: () => Promise<void>;
  updateCurrentProfile: (data: Partial<Profile>) => Promise<Profile>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateRole = useCallback(async (profile: Profile) => {
    if (profile.role === 'candidato') {
      try {
        const cp = await getCandidateProfileApi();
        setCandidateProfile(cp);
      } catch {
        setCandidateProfile(null);
      }
      setCompany(null);
    } else if (profile.role === 'empresa') {
      try {
        const comp = await getCompanyProfileApi();
        setCompany(comp as unknown as Company);
      } catch {
        setCompany(null);
      }
      setCandidateProfile(null);
    }
  }, []);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const refresh = getRefreshToken();
      if (refresh) {
        const profile = await getMeApi();
        setUser(profile as Profile);
        await hydrateRole(profile as Profile);
        return;
      }

      // Fallback local se houver sessão salva offline
      const savedUserJson = localStorage.getItem(LOCAL_USER_KEY);
      if (savedUserJson) {
        const localUser: Profile = JSON.parse(savedUserJson);
        setUser(localUser);
        if (localUser.role === 'candidato') {
          const cp = await getCandidateProfileByUserId(localUser.id);
          setCandidateProfile(cp);
          setCompany(null);
        } else {
          const comp = await getCompanyByOwnerId(localUser.id);
          setCompany(comp);
          setCandidateProfile(null);
        }
      }
    } catch {
      clearTokens();
      setUser(null);
      setCandidateProfile(null);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  }, [hydrateRole]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email: string, password: string): Promise<Profile> => {
    setIsLoading(true);
    try {
      const { user: profile } = await loginApi(email, password);
      setUser(profile as Profile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      await hydrateRole(profile as Profile);
      return profile as Profile;
    } catch (err: unknown) {
      // Fallback caso a API backend esteja offline (desenvolvimento / demo)
      const isNetworkError =
        err instanceof TypeError ||
        (err as { message?: string })?.message?.includes('fetch') ||
        (err as { status?: number })?.status === 0;

      if (isNetworkError) {
        const isCompany = email.includes('atlas') || email.includes('empresa') || email.includes('rafael');
        const role: UserRole = isCompany ? 'empresa' : 'candidato';
        const fallbackUser: Profile = {
          id: isCompany ? 'user-rafael-atlas' : 'user-marina-costa',
          full_name: isCompany ? 'Rafael Oliveira' : (email === 'marina.costa@example.com' ? 'Marina Costa' : email.split('@')[0]),
          email: email.trim().toLowerCase(),
          role,
          city: 'São Paulo',
          phone: isCompany ? '(11) 98888-1234' : '(11) 99999-2048',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(fallbackUser);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(fallbackUser));
        if (role === 'candidato') {
          const cp = await getCandidateProfileByUserId(fallbackUser.id);
          setCandidateProfile(cp);
          setCompany(null);
        } else {
          const comp = await getCompanyByOwnerId(fallbackUser.id);
          setCompany(comp);
          setCandidateProfile(null);
        }
        return fallbackUser;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (params: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
    city?: string;
    phone?: string;
    companyName?: string;
  }): Promise<Profile> => {
    setIsLoading(true);
    try {
      const payload: RegisterParams = {
        email: params.email,
        password: params.password,
        full_name: params.fullName,
        role: params.role,
        city: params.city,
        phone: params.phone,
        company_name: params.companyName,
      };
      const { user: profile } = await registerApi(payload);
      setUser(profile as Profile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      await hydrateRole(profile as Profile);
      return profile as Profile;
    } catch (err: unknown) {
      const isNetworkError =
        err instanceof TypeError ||
        (err as { message?: string })?.message?.includes('fetch') ||
        (err as { status?: number })?.status === 0;

      if (isNetworkError) {
        const newUserId = `user-${Date.now()}`;
        const newProfile: Profile = {
          id: newUserId,
          full_name: params.fullName.trim(),
          email: params.email.trim().toLowerCase(),
          role: params.role,
          city: params.city?.trim() || 'São Paulo',
          phone: params.phone?.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(newProfile);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newProfile));

        if (params.role === 'empresa') {
          const comp = await createOrUpdateCompany(newUserId, {
            name: params.companyName?.trim() || params.fullName.trim(),
            city: params.city?.trim() || 'São Paulo',
          });
          setCompany(comp);
          setCandidateProfile(null);
        } else {
          const cp = await getCandidateProfileByUserId(newUserId);
          setCandidateProfile(cp);
          setCompany(null);
        }
        return newProfile;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    const refresh = getRefreshToken() ?? '';
    try {
      if (refresh) {
        await logoutApi(refresh);
      }
    } catch {
      // silencioso
    } finally {
      clearTokens();
      localStorage.removeItem(LOCAL_USER_KEY);
      setUser(null);
      setCandidateProfile(null);
      setCompany(null);
    }
  };

  const updateCurrentProfile = async (data: Partial<Profile>): Promise<Profile> => {
    if (!user) throw new Error('Usuário não autenticado.');
    const updated = await updateMeApi({
      full_name: data.full_name,
      city: data.city ?? undefined,
      phone: data.phone ?? undefined,
    });
    const profile = updated as Profile;
    setUser(profile);
    await hydrateRole(profile);
    return profile;
  };

  const refreshAuth = async () => {
    if (!user) return;
    try {
      const profile = await getMeApi();
      setUser(profile as Profile);
      await hydrateRole(profile as Profile);
    } catch {
      // silencioso
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        candidateProfile,
        company,
        isLoading,
        login,
        signup,
        logout,
        updateCurrentProfile,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
