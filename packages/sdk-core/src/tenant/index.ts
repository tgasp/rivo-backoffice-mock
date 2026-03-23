import { HttpClient } from "../http/index.js";
import type { FeatureFlags, TenantBranding, TenantConfig } from "../types/index.js";

interface RawTenantConfig {
  tenant_id?: string;
  tenantId?: string;
  domain?: string;
  branding?: TenantBranding;
  features?: FeatureFlags;
  locale?: string;
  registration?: Record<string, unknown>;
  support?: Record<string, unknown>;
}

export interface GetTenantConfigOptions {
  domain?: string;
  signal?: AbortSignal;
}

function normalizeTenantConfig(payload: RawTenantConfig): TenantConfig {
  const tenantId = payload.tenantId ?? payload.tenant_id;

  if (!tenantId) {
    throw new Error("Tenant config response did not include tenantId");
  }

  return {
    tenantId,
    domain: payload.domain ?? "",
    branding: payload.branding ?? {
      primaryColor: "",
      secondaryColor: "",
      fontFamily: "",
      logoUrl: "",
    },
    features: payload.features ?? {},
    locale: payload.locale,
    registration: payload.registration,
    support: payload.support,
  };
}

export async function getTenantConfig(
  apiBaseUrl: string,
  options: GetTenantConfigOptions = {}
): Promise<TenantConfig> {
  const http = new HttpClient({ baseUrl: apiBaseUrl });
  const response = await http.get<RawTenantConfig>("/api/v1/tenant/config", {
    query: options.domain ? { domain: options.domain } : undefined,
    signal: options.signal,
  });

  return normalizeTenantConfig(response);
}
