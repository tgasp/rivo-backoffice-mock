import { create } from "zustand";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export async function loginUser(
  apiBaseUrl: string,
  credentials: LoginCredentials
): Promise<LoginResponse> {
  const res = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? "Invalid credentials");
  }
  return res.json() as Promise<LoginResponse>;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("auth_token") : null,
  isAuthenticated: typeof window !== "undefined" ? !!localStorage.getItem("auth_token") : false,
  setToken: (token) => {
    localStorage.setItem("auth_token", token);
    set({ token, isAuthenticated: true });
  },
  clearToken: () => {
    localStorage.removeItem("auth_token");
    set({ token: null, isAuthenticated: false });
  },
}));

export function getToken(): string | null {
  return useAuthStore.getState().token;
}
