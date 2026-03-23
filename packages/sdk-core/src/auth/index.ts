import { HttpClient } from "../http/index.js";
import type { OperatorLoginRequest, OperatorSession } from "../types/index.js";

interface RawOperatorSession {
  token?: string;
  accessToken?: string;
  refreshToken?: string | null;
  expiresIn?: number;
  tokenType?: string;
  operator?: OperatorSession["operator"];
}

export interface LogoutOperatorRequest {
  refreshToken?: string | null;
}

function normalizeOperatorSession(payload: RawOperatorSession): OperatorSession {
  const accessToken = payload.accessToken ?? payload.token;
  if (!accessToken) {
    throw new Error("Operator login response did not include an access token");
  }

  return {
    accessToken,
    refreshToken: payload.refreshToken ?? null,
    expiresIn: payload.expiresIn,
    tokenType: payload.tokenType ?? "Bearer",
    operator: payload.operator,
  };
}

export async function loginOperator(
  apiBaseUrl: string,
  credentials: OperatorLoginRequest,
  signal?: AbortSignal
): Promise<OperatorSession> {
  const http = new HttpClient({ baseUrl: apiBaseUrl });
  const response = await http.post<RawOperatorSession>("/api/v1/auth/operator", credentials, {
    signal,
  });

  return normalizeOperatorSession(response);
}

export async function logoutOperator(
  apiBaseUrl: string,
  accessToken: string,
  request: LogoutOperatorRequest = {},
  signal?: AbortSignal
): Promise<void> {
  const http = new HttpClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => accessToken,
  });

  await http.post<void>("/api/v1/auth/operator/logout", request, { signal });
}
