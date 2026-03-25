import { loginOperator, logoutOperator, refreshOperatorSession } from "../auth/index.js";
import { HttpClient, type HttpTransport } from "../http/index.js";
import {
  createTenant,
  deleteTenant,
  getTenant,
  getCurrentTenantConfig,
  getTenantConfig,
  listTenants,
  resolveTenant,
  updateTenant,
  updateCurrentTenantConfig,
} from "../tenant/index.js";
import type {
  CreateTenantRequest,
  OperatorLoginRequest,
  OperatorSession,
  TenantAdminConfig,
  TenantConfig,
  TenantRecord,
  TenantResolution,
  UpdateTenantRequest,
  UpdateTenantAdminConfigRequest,
} from "../types/index.js";

export interface SdkClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  getTenantId?: () => string | null | undefined;
  onUnauthorized?: () => void;
  transport?: HttpTransport;
}

export interface SdkClientRequestOptions {
  signal?: unknown;
}

export class SdkClient {
  readonly http: HttpClient;
  private readonly config: SdkClientConfig;

  constructor(config: SdkClientConfig) {
    this.config = config;
    this.http = new HttpClient(config);
  }

  loginOperator(
    credentials: OperatorLoginRequest,
    options: SdkClientRequestOptions = {}
  ): Promise<OperatorSession> {
    return loginOperator(this.config.baseUrl, credentials, {
      signal: options.signal,
      tenantId: this.config.getTenantId?.() ?? undefined,
      transport: this.config.transport,
    });
  }

  logoutOperator(
    accessToken: string,
    userId: string,
    options: SdkClientRequestOptions = {}
  ): Promise<void> {
    return logoutOperator(
      this.config.baseUrl,
      accessToken,
      { userId },
      {
        signal: options.signal,
        tenantId: this.config.getTenantId?.() ?? undefined,
        transport: this.config.transport,
      }
    );
  }

  refreshOperatorSession(options: SdkClientRequestOptions = {}): Promise<OperatorSession> {
    return refreshOperatorSession(
      this.config.baseUrl,
      {
        signal: options.signal,
        tenantId: this.config.getTenantId?.() ?? undefined,
        transport: this.config.transport,
      }
    );
  }

  resolveTenant(options: { domain: string; signal?: unknown }): Promise<TenantResolution> {
    return resolveTenant(this.config.baseUrl, {
      domain: options.domain,
      signal: options.signal,
      transport: this.config.transport,
    });
  }

  getTenantConfig(options: { signal?: unknown } = {}): Promise<TenantConfig> {
    return getTenantConfig(this.config.baseUrl, {
      accessToken: this.config.getAccessToken?.() ?? undefined,
      signal: options.signal,
      tenantId: this.config.getTenantId?.() ?? undefined,
      transport: this.config.transport,
    });
  }

  getCurrentTenantConfig(options: { signal?: unknown } = {}): Promise<TenantAdminConfig> {
    return getCurrentTenantConfig(this.config.baseUrl, {
      accessToken: this.config.getAccessToken?.() ?? undefined,
      signal: options.signal,
      tenantId: this.config.getTenantId?.() ?? undefined,
      transport: this.config.transport,
    });
  }

  updateCurrentTenantConfig(
    request: UpdateTenantAdminConfigRequest,
    options: { signal?: unknown } = {}
  ): Promise<TenantAdminConfig> {
    return updateCurrentTenantConfig(this.config.baseUrl, request, {
      accessToken: this.config.getAccessToken?.() ?? undefined,
      signal: options.signal,
      tenantId: this.config.getTenantId?.() ?? undefined,
      transport: this.config.transport,
    });
  }

  listTenants(options: { signal?: unknown } = {}): Promise<TenantRecord[]> {
    return listTenants(this.config.baseUrl, {
      accessToken: this.config.getAccessToken?.() ?? undefined,
      signal: options.signal,
      tenantId: this.config.getTenantId?.() ?? undefined,
      transport: this.config.transport,
    });
  }

  getTenant(id: string, options: { signal?: unknown } = {}): Promise<TenantRecord> {
    return getTenant(this.config.baseUrl, {
      accessToken: this.config.getAccessToken?.() ?? undefined,
      id,
      signal: options.signal,
      tenantId: this.config.getTenantId?.() ?? undefined,
      transport: this.config.transport,
    });
  }

  createTenant(request: CreateTenantRequest, options: { signal?: unknown } = {}): Promise<TenantRecord> {
    return createTenant(this.config.baseUrl, request, {
      accessToken: this.config.getAccessToken?.() ?? undefined,
      signal: options.signal,
      tenantId: this.config.getTenantId?.() ?? undefined,
      transport: this.config.transport,
    });
  }

  updateTenant(
    id: string,
    request: UpdateTenantRequest,
    options: { signal?: unknown } = {}
  ): Promise<TenantRecord> {
    return updateTenant(this.config.baseUrl, request, {
      accessToken: this.config.getAccessToken?.() ?? undefined,
      id,
      signal: options.signal,
      tenantId: this.config.getTenantId?.() ?? undefined,
      transport: this.config.transport,
    });
  }

  deleteTenant(id: string, options: { signal?: unknown } = {}): Promise<void> {
    return deleteTenant(this.config.baseUrl, {
      accessToken: this.config.getAccessToken?.() ?? undefined,
      id,
      signal: options.signal,
      tenantId: this.config.getTenantId?.() ?? undefined,
      transport: this.config.transport,
    });
  }
}

export function createSdkClient(config: SdkClientConfig): SdkClient {
  return new SdkClient(config);
}
