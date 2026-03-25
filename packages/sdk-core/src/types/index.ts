export interface OperatorLoginRequest {
  email: string;
  password: string;
}

export interface OperatorProfile {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  tenantId?: string;
  avatar?: string | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  realm?: string;
}

export interface OperatorSession {
  accessToken: string;
  expiresIn?: number;
  tokenType: string;
  operator?: OperatorProfile;
}

export interface TenantResolution {
  id: string;
  slug: string;
  name: string;
  branding: TenantBranding;
  settings: Record<string, unknown>;
}

export interface TenantConfig {
  tenantId: string;
  slug: string;
  name: string;
  branding: TenantBranding;
  features: FeatureFlags;
  locale?: string;
  registration?: Record<string, unknown>;
  support?: Record<string, unknown>;
}

export interface TenantAdminConfig {
  id: string;
  name: string;
  domain: string;
  slug: string;
  branding: TenantBranding;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantAdminConfigRequest {
  name?: string;
  branding?: TenantBranding;
  settings?: Record<string, unknown>;
  isActive?: boolean;
}

export interface TenantBranding {
  logo?: string;
  favicon?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
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
