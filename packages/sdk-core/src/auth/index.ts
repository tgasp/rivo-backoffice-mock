import { HttpClient, type HttpTransport } from "../http/index.js";
import type { OperatorLoginRequest, OperatorSession } from "../types/index.js";

interface RawOperatorSession {
  access_token?: string;
  refresh_token?: string | null;
  expires_in?: number;
  token_type?: string;
  operator?: {
    id: string;
    email: string;
    role: string;
    roles?: string[];
    tenant_id?: string;
    realm?: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar?: string | null;
    is_email_verified?: boolean;
    is_phone_verified?: boolean;
  };
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
  };
}

export interface LogoutOperatorRequest {
  userId: string;
}

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  realm?: string;
  tenantId?: string;
  tenant_id?: string;
}

function decodeBase64Url(input: string): string | null {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const maybeAtob = (globalThis as { atob?: (value: string) => string }).atob;

  if (maybeAtob) {
    return maybeAtob(padded);
  }

  const maybeBuffer = (
    globalThis as {
      Buffer?: {
        from(value: string, encoding: string): { toString(encoding: string): string };
      };
    }
  ).Buffer;

  if (!maybeBuffer) {
    return null;
  }

  return maybeBuffer.from(padded, "base64").toString("utf8");
}

function getJwtPayload(accessToken: string): JwtPayload | null {
  const [, payload] = accessToken.split(".");
  if (!payload) {
    return null;
  }

  const decoded = decodeBase64Url(payload);
  if (!decoded) {
    return null;
  }

  try {
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export interface AuthRequestOptions {
  signal?: unknown;
  tenantId?: string;
  transport?: HttpTransport;
}

function normalizeOperatorSession(payload: RawOperatorSession): OperatorSession {
  const accessToken = payload.access_token;
  if (!accessToken) {
    throw new Error("Operator login response did not include an access token");
  }

  const jwtPayload = getJwtPayload(accessToken);

  const operator = payload.operator
    ? {
        id: payload.operator.id,
        email: payload.operator.email,
        role: payload.operator.role,
        roles: payload.operator.roles ?? [payload.operator.role],
        tenantId: payload.operator.tenant_id,
        realm: payload.operator.realm,
        firstName: payload.operator.first_name ?? undefined,
        lastName: payload.operator.last_name ?? undefined,
        avatar: payload.operator.avatar ?? undefined,
        isEmailVerified: payload.operator.is_email_verified,
        isPhoneVerified: payload.operator.is_phone_verified,
      }
    : payload.user
      ? {
          id: payload.user.id,
          email: payload.user.email,
          role: payload.user.role,
          roles: [payload.user.role],
          tenantId: payload.user.tenantId,
          firstName: payload.user.firstName ?? undefined,
          lastName: payload.user.lastName ?? undefined,
          avatar: payload.user.avatar ?? undefined,
          isEmailVerified: payload.user.isEmailVerified,
          isPhoneVerified: payload.user.isPhoneVerified,
        }
      : jwtPayload
        ? {
            id: jwtPayload.sub ?? "",
            email: jwtPayload.email ?? "",
            role: jwtPayload.role ?? "operator",
            roles: jwtPayload.roles ?? (jwtPayload.role ? [jwtPayload.role] : ["operator"]),
            tenantId: jwtPayload.tenantId ?? jwtPayload.tenant_id,
            realm: jwtPayload.realm,
          }
      : undefined;

  return {
    accessToken,
    expiresIn: payload.expires_in,
    tokenType: payload.token_type ?? "Bearer",
    operator,
  };
}

export async function loginOperator(
  apiBaseUrl: string,
  credentials: OperatorLoginRequest,
  options: AuthRequestOptions = {}
): Promise<OperatorSession> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  const response = await http.post<RawOperatorSession>("/api/v1/auth/operator", credentials, {
    signal: options.signal,
  });

  return normalizeOperatorSession(response);
}

export async function logoutOperator(
  apiBaseUrl: string,
  accessToken: string,
  request: LogoutOperatorRequest,
  options: AuthRequestOptions = {}
): Promise<void> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => accessToken,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });

  await http.post<void>(
    "/api/v1/auth/logout",
    { user_id: request.userId },
    { signal: options.signal }
  );
}

export async function refreshOperatorSession(
  apiBaseUrl: string,
  options: AuthRequestOptions = {}
): Promise<OperatorSession> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getTenantId: () => options.tenantId,
    transport: options.transport,
  });
  const response = await http.post<RawOperatorSession>("/api/v1/auth/refresh", undefined, {
    signal: options.signal,
  });

  return normalizeOperatorSession(response);
}
