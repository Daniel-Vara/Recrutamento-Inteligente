import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, CandidateProfile, Company, UserRole } from '../types';
import { 
  getCandidateProfileByUserId, 
  getCompanyByOwnerId, 
  createOrUpdateCompany 
} from '../services/api';

interface AuthContextType {
  user: Profile | null;
  candidateProfile: CandidateProfile | null;
  company: Company | null;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<Profile>;
  signup: (params: {
    fullName: string;
    email: string;
    password?: string;
    role: UserRole;
    city?: string;
    phone?: string;
    companyName?: string;
    companyCity?: string;
  }) => Promise<Profile>;
  logout: () => Promise<void>;
  updateCurrentProfile: (data: Partial<Profile>) => Promise<Profile>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'appliety_current_user_session';
const PROFILES_KEY = 'appliety_profiles';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega sessão salva no localStorage ao iniciar
  const loadSession = async () => {
    setIsLoading(true);
    try {
      const savedUserJson = localStorage.getItem(CURRENT_USER_KEY);
      if (savedUserJson) {
        const savedUser: Profile = JSON.parse(savedUserJson);
        await hydrateUser(savedUser);
      } else {
        // Inicializa com uma sessão default caso desejado (ex: Marina Costa candidata padrão do Figma)
        const marinaProfile: Profile = {
          id: 'user-marina-costa',
          full_name: 'Marina Costa',
          email: 'marina.costa@example.com',
          role: 'candidato',
          city: 'São Paulo',
          phone: '(11) 99999-2048',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const existingProfilesJson = localStorage.getItem(PROFILES_KEY);
        const existingProfiles: Profile[] = existingProfilesJson ? JSON.parse(existingProfilesJson) : [];
        if (!existingProfiles.some((p) => p.id === marinaProfile.id)) {
          existingProfiles.push(marinaProfile);
          localStorage.setItem(PROFILES_KEY, JSON.stringify(existingProfiles));
        }

        // Também cadastra Rafael da Atlas Tech como empresa padrão do Figma
        const rafaelProfile: Profile = {
          id: 'user-rafael-atlas',
          full_name: 'Rafael Oliveira',
          email: 'rafael@atlastech.example.com',
          role: 'empresa',
          city: 'São Paulo',
          phone: '(11) 98888-1234',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (!existingProfiles.some((p) => p.id === rafaelProfile.id)) {
          existingProfiles.push(rafaelProfile);
          localStorage.setItem(PROFILES_KEY, JSON.stringify(existingProfiles));
        }
      }
    } catch (err) {
      console.error('Erro ao restaurar sessão:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const hydrateUser = async (profile: Profile) => {
    setUser(profile);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));

    if (profile.role === 'candidato') {
      const cp = await getCandidateProfileByUserId(profile.id);
      setCandidateProfile(cp);
      setCompany(null);
    } else if (profile.role === 'empresa') {
      const comp = await getCompanyByOwnerId(profile.id);
      setCompany(comp);
      setCandidateProfile(null);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const login = async (email: string, expectedRole?: UserRole): Promise<Profile> => {
    setIsLoading(true);
    try {
      const profilesJson = localStorage.getItem(PROFILES_KEY);
      const profiles: Profile[] = profilesJson ? JSON.parse(profilesJson) : [];
      let found = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());

      if (!found) {
        // Se for login pela primeira vez com um e-mail novo, cria o perfil correspondente
        const role = expectedRole || 'candidato';
        const newProfile: Profile = {
          id: `user-${Date.now()}`,
          full_name: email.split('@')[0],
          email: email.trim().toLowerCase(),
          role,
          city: 'São Paulo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        profiles.push(newProfile);
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        found = newProfile;
      }

      await hydrateUser(found);
      return found;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (params: {
    fullName: string;
    email: string;
    password?: string;
    role: UserRole;
    city?: string;
    phone?: string;
    companyName?: string;
    companyCity?: string;
  }): Promise<Profile> => {
    setIsLoading(true);
    try {
      const profilesJson = localStorage.getItem(PROFILES_KEY);
      const profiles: Profile[] = profilesJson ? JSON.parse(profilesJson) : [];
      
      const existing = profiles.find((p) => p.email.toLowerCase() === params.email.trim().toLowerCase());
      if (existing) {
        throw new Error('Já existe uma conta cadastrada com este e-mail.');
      }

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

      profiles.push(newProfile);
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));

      if (params.role === 'empresa') {
        await createOrUpdateCompany(newUserId, {
          name: params.companyName?.trim() || params.fullName.trim(),
          city: params.companyCity?.trim() || params.city?.trim() || 'São Paulo',
        });
      } else {
        await getCandidateProfileByUserId(newUserId);
      }

      await hydrateUser(newProfile);
      return newProfile;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
    setCandidateProfile(null);
    setCompany(null);
  };

  const updateCurrentProfile = async (data: Partial<Profile>): Promise<Profile> => {
    if (!user) throw new Error('Usuário não autenticado.');
    
    // Regra de segurança: Não permitir alteração do próprio papel
    if (data.role && data.role !== user.role) {
      throw new Error('Não é permitido alterar o papel da conta.');
    }

    const profilesJson = localStorage.getItem(PROFILES_KEY);
    const profiles: Profile[] = profilesJson ? JSON.parse(profilesJson) : [];
    const index = profiles.findIndex((p) => p.id === user.id);

    const updated: Profile = {
      ...user,
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (index >= 0) {
      profiles[index] = updated;
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }

    await hydrateUser(updated);
    return updated;
  };

  const refreshAuth = async () => {
    if (user) {
      await hydrateUser(user);
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
