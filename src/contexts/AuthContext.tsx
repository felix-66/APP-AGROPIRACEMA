import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authenticateUser, getUserById } from '../database/database';
import { getItem, setItem, deleteItem } from '../utils/storage';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const SESSION_KEY = 'agrocontrol_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const sessionData = await getItem(SESSION_KEY);
      if (!sessionData) {
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(sessionData) as { userId: number };
      const restored = await getUserById(parsed.userId);

      if (restored) {
        setUser(restored);
      } else {
        await deleteItem(SESSION_KEY);
      }
    } catch {
      await deleteItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(async (username: string, password: string) => {
    try {
      const authenticatedUser = await authenticateUser(username, password);
      if (!authenticatedUser) {
        return { success: false, error: 'Usuário ou senha incorretos' };
      }

      await setItem(
        SESSION_KEY,
        JSON.stringify({ userId: authenticatedUser.id })
      );
      setUser(authenticatedUser);
      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await deleteItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
