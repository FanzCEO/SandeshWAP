import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { User, SignUpData, LoginData } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  updateOnboarding: (step: number, completed?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  
  // Fetch current user
  const { data: userData, isLoading, error } = useQuery<{ user: User }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const user = userData?.user || null;
  const isAuthenticated = !!user && !error;

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpData) => {
      const response = await apiRequest('POST', '/api/auth/signup', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.clear();
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', '/api/auth/profile', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Update onboarding mutation
  const updateOnboardingMutation = useMutation({
    mutationFn: async ({ step, completed }: { step: number; completed?: boolean }) => {
      const response = await apiRequest('PATCH', '/api/auth/onboarding', {
        onboardingStep: step,
        onboardingCompleted: completed
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  const signUp = async (data: SignUpData) => {
    await signUpMutation.mutateAsync(data);
  };

  const login = async (data: LoginData) => {
    await loginMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const updateProfile = async (data: any) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const updateOnboarding = async (step: number, completed?: boolean) => {
    await updateOnboardingMutation.mutateAsync({ step, completed });
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    signUp,
    login,
    logout,
    updateProfile,
    updateOnboarding
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}