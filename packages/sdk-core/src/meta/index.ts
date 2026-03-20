import type { Tenant } from "../types/index.js";
import { create } from "zustand";

export interface TenantState {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  setTenant: (tenant: Tenant) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  isLoading: false,
  error: null,
  setTenant: (tenant) => set({ tenant, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));

export async function resolveTenant(
  apiBaseUrl: string,
  domain = window.location.hostname
): Promise<Tenant> {
  const res = await fetch(`${apiBaseUrl}/meta/tenant?domain=${domain}`);
  if (!res.ok) throw new Error("Failed to resolve tenant");
  return res.json() as Promise<Tenant>;
}
