/**
 * Authentication Context
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  vehicle?: {
    number: string;
    model?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // API 호출 (실제 구현 시)
    const mockUser: User = {
      id: 'user_123',
      email,
      name: '테스트 사용자',
      vehicle: {
        number: '12가3456',
        model: '현대 아반떼',
      },
    };
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  const register = async (email: string, password: string, name: string) => {
    // 회원가입 로직
    const mockUser: User = {
      id: 'user_new',
      email,
      name,
    };
    setUser(mockUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        register,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
