"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  apiFetch,
  clearToken,
  dropReadableToken,
  getToken,
  type AuthUser,
  type TokenResponse,
} from "@/lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (fullName: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiFetch<AuthUser>("/auth/me");
      if (getToken()) dropReadableToken();
      setUser(me);
    } catch {
      await clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await refreshUser();
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const data = await apiFetch<TokenResponse>("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ full_name: fullName, email, password }),
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
