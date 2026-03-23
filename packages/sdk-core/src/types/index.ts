export interface OperatorLoginRequest {
  email: string;
  password: string;
  otpCode?: string;
}

export interface OperatorProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  tenantId?: string;
}

export interface OperatorSession {
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number;
  tokenType: string;
  operator?: OperatorProfile;
}

export interface TenantConfig {
  tenantId: string;
  domain: string;
  branding: TenantBranding;
  features: FeatureFlags;
  locale?: string;
  registration?: Record<string, unknown>;
  support?: Record<string, unknown>;
}

export interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl: string;
}

export interface FeatureFlags {
  [key: string]: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
