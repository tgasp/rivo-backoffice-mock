import { HttpClient, type HttpTransport } from "../http/index.js";
import type {
  FeatureFlags,
  TenantAdminConfig,
  TenantBranding,
  TenantConfig,
  TenantResolution,
  UpdateTenantAdminConfigRequest,
} from "../types/index.js";

interface RawTenantResolution {
  id: string;
  slug: string;
  name: string;
  branding?: TenantBranding;
  settings?: Record<string, unknown>;
}

interface RawTenantConfig {
  tenant_id?: string;
  branding?: TenantBranding;
  slug?: string;
  name?: string;
  features?: FeatureFlags;
  locale?: string;
  registration?: Record<string, unknown>;
  support?: Record<string, unknown>;
}

interface RawTenantAdminConfig {
  id?: string;
  name?: string;
  domain?: string;
  slug?: string;
  branding?: TenantBranding;
  settings?: Record<string, unknown>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResolveTenantOptions {
  domain: string;
  signal?: unknown;
  transport?: HttpTransport;
}

export interface GetTenantConfigOptions {
  accessToken?: string;
  signal?: unknown;
  tenantId?: string;
  transport?: HttpTransport;
}

export interface TenantAdminConfigOptions {
  accessToken?: string;
  signal?: unknown;
  tenantId?: string;
  transport?: HttpTransport;
}

function normalizeTenantResolution(payload: RawTenantResolution): TenantResolution {
  return {
    id: payload.id,
    slug: payload.slug,
    name: payload.name,
    branding: payload.branding ?? {},
    settings: payload.settings ?? {},
  };
}

function normalizeTenantConfig(payload: RawTenantConfig): TenantConfig {
  const tenantId = payload.tenant_id;

  if (!tenantId) {
    throw new Error("Tenant config response did not include tenantId");
  }

  return {
    tenantId,
    slug: payload.slug ?? "",
    name: payload.name ?? "",
    branding: payload.branding ?? {},
    features: payload.features ?? {},
    locale: payload.locale,
    registration: payload.registration,
    support: payload.support,
  };
}

function normalizeTenantAdminConfig(payload: RawTenantAdminConfig): TenantAdminConfig {
  if (!payload.id || !payload.name || !payload.domain || !payload.slug) {
    throw new Error("Tenant admin config response was missing required tenant fields");
  }

  if (!payload.createdAt || !payload.updatedAt) {
    throw new Error("Tenant admin config response was missing timestamps");
  }

  return {
    id: payload.id,
    name: payload.name,
    domain: payload.domain,
    slug: payload.slug,
    branding: payload.branding ?? {},
    settings: payload.settings ?? {},
    isActive: payload.isActive ?? false,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}

export async function resolveTenant(
  apiBaseUrl: string,
  options: ResolveTenantOptions
): Promise<TenantResolution> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    transport: options.transport,
  });
  const response = await http.get<RawTenantResolution>("/api/v1/tenants/resolve", {
    query: { domain: options.domain },
    signal: options.signal,
  });

  return normalizeTenantResolution(response);
}

export async function getTenantConfig(
  apiBaseUrl: string,
  options: GetTenantConfigOptions = {}
): Promise<TenantConfig> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => options.accessToken,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  const response = await http.get<RawTenantConfig>("/api/v1/tenants/config", {
    signal: options.signal,
  });

  return normalizeTenantConfig(response);
}

export async function getCurrentTenantConfig(
  apiBaseUrl: string,
  options: TenantAdminConfigOptions = {}
): Promise<TenantAdminConfig> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => options.accessToken,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  const response = await http.get<RawTenantAdminConfig>("/api/v1/tenants/config/current", {
    signal: options.signal,
  });

  return normalizeTenantAdminConfig(response);
}

export async function updateCurrentTenantConfig(
  apiBaseUrl: string,
  request: UpdateTenantAdminConfigRequest,
  options: TenantAdminConfigOptions = {}
): Promise<TenantAdminConfig> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => options.accessToken,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  const response = await http.put<RawTenantAdminConfig>("/api/v1/tenants/config/current", request, {
    signal: options.signal,
  });

  return normalizeTenantAdminConfig(response);
}
