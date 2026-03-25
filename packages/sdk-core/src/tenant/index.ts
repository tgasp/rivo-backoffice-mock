import { HttpClient, type HttpTransport } from "../http/index.js";
import type {
  CreateTenantRequest,
  FeatureFlags,
  TenantAdminConfig,
  TenantBranding,
  TenantConfig,
  TenantRecord,
  TenantResolution,
  UpdateTenantRequest,
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
  domainAliases?: string[];
  slug?: string;
  branding?: TenantBranding;
  settings?: Record<string, unknown>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type RawTenantRecord = RawTenantAdminConfig;

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

export interface TenantCollectionOptions extends TenantAdminConfigOptions {
  id?: string;
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
    domainAliases: payload.domainAliases ?? [],
    slug: payload.slug,
    branding: payload.branding ?? {},
    settings: payload.settings ?? {},
    isActive: payload.isActive ?? false,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}

function normalizeTenantRecord(payload: RawTenantRecord): TenantRecord {
  return normalizeTenantAdminConfig(payload);
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

export async function listTenants(
  apiBaseUrl: string,
  options: TenantCollectionOptions = {}
): Promise<TenantRecord[]> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => options.accessToken,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  const response = await http.get<RawTenantRecord[]>("/api/v1/tenants", {
    signal: options.signal,
  });

  return response.map(normalizeTenantRecord);
}

export async function getTenant(
  apiBaseUrl: string,
  options: TenantCollectionOptions
): Promise<TenantRecord> {
  if (!options.id) {
    throw new Error("Tenant id is required");
  }

  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => options.accessToken,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  const response = await http.get<RawTenantRecord>(`/api/v1/tenants/${options.id}`, {
    signal: options.signal,
  });

  return normalizeTenantRecord(response);
}

export async function createTenant(
  apiBaseUrl: string,
  request: CreateTenantRequest,
  options: TenantCollectionOptions = {}
): Promise<TenantRecord> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => options.accessToken,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  const response = await http.post<RawTenantRecord>("/api/v1/tenants", request, {
    signal: options.signal,
  });

  return normalizeTenantRecord(response);
}

export async function updateTenant(
  apiBaseUrl: string,
  request: UpdateTenantRequest,
  options: TenantCollectionOptions
): Promise<TenantRecord> {
  if (!options.id) {
    throw new Error("Tenant id is required");
  }

  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => options.accessToken,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  const response = await http.put<RawTenantRecord>(`/api/v1/tenants/${options.id}`, request, {
    signal: options.signal,
  });

  return normalizeTenantRecord(response);
}

export async function deleteTenant(
  apiBaseUrl: string,
  options: TenantCollectionOptions
): Promise<void> {
  if (!options.id) {
    throw new Error("Tenant id is required");
  }

  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => options.accessToken,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  await http.delete<void>(`/api/v1/tenants/${options.id}`, {
    signal: options.signal,
  });
}
