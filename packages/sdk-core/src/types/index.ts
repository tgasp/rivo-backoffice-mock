export interface Tenant {
  id: string;
  domain: string;
  branding: TenantBranding;
  features: FeatureFlags;
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
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
