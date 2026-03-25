export interface HttpClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  getTenantId?: () => string | null | undefined;
  onUnauthorized?: () => void;
  transport?: HttpTransport;
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

export interface ResponseHeaders {
  get(name: string): string | null;
}

export interface TransportResponse {
  status: number;
  ok: boolean;
  statusText: string;
  headers: ResponseHeaders;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface TransportRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | ArrayBuffer | Uint8Array;
  credentials?: "include" | "omit" | "same-origin";
  signal?: unknown;
}

export interface HttpTransport {
  request(request: TransportRequest): Promise<TransportResponse>;
}

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | ArrayBuffer | Uint8Array;
    credentials?: "include" | "omit" | "same-origin";
    signal?: unknown;
  }
) => Promise<TransportResponse>;

export interface CreateFetchTransportOptions {
  fetch?: FetchLike;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | Uint8Array | object | null;
  credentials?: "include" | "omit" | "same-origin";
  query?: Record<string, QueryValue>;
  signal?: unknown;
}

interface InternalRequestOptions extends RequestOptions {
  method?: string;
}

function getGlobalFetch(): FetchLike {
  const maybeFetch = (globalThis as { fetch?: FetchLike }).fetch;
  if (!maybeFetch) {
    throw new Error(
      "No fetch implementation is available. Pass a transport or createFetchTransport({ fetch })."
    );
  }

  return maybeFetch;
}

export function createFetchTransport(options: CreateFetchTransportOptions = {}): HttpTransport {
  const fetchImplementation = options.fetch ?? getGlobalFetch();

  return {
    request(request) {
      return fetchImplementation(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        credentials: request.credentials,
        signal: request.signal,
      });
    },
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor({
    status,
    code,
    message,
    details,
  }: {
    status: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class HttpClient {
  private config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.config = config;
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(path, this.config.baseUrl);

    if (!query) {
      return url.toString();
    }

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }

  private getBody(
    body: InternalRequestOptions["body"]
  ): string | ArrayBuffer | Uint8Array | undefined {
    if (body === undefined || body === null) {
      return undefined;
    }

    if (typeof body === "string" || body instanceof ArrayBuffer || body instanceof Uint8Array) {
      return body;
    }

    return JSON.stringify(body);
  }

  private getHeaders(
    body: InternalRequestOptions["body"],
    headers?: Record<string, string>
  ): Record<string, string> {
    const resolvedHeaders = { ...(headers ?? {}) };
    const token = this.config.getAccessToken?.();

    if (token) {
      resolvedHeaders.Authorization = `Bearer ${token}`;
    }

    const tenantId = this.config.getTenantId?.();
    if (tenantId) {
      resolvedHeaders["X-Tenant-ID"] = tenantId;
    }

    const hasBody = body !== undefined && body !== null;
    const isJsonBody =
      hasBody &&
      !(body instanceof ArrayBuffer) &&
      !(body instanceof Uint8Array) &&
      typeof body !== "string";

    if (isJsonBody && !resolvedHeaders["Content-Type"]) {
      resolvedHeaders["Content-Type"] = "application/json";
    }

    return resolvedHeaders;
  }

  private async parseResponse<T>(res: TransportResponse): Promise<T> {
    if (res.status === 204) {
      return undefined as T;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }

    return (await res.text()) as T;
  }

  private async request<T>(path: string, options: InternalRequestOptions = {}): Promise<T> {
    const requestUrl = this.buildUrl(path, options.query);
    const transport = this.config.transport ?? createFetchTransport();
    const res = await transport.request({
      url: requestUrl,
      method: options.method ?? "GET",
      body: this.getBody(options.body),
      credentials: options.credentials,
      headers: this.getHeaders(options.body, options.headers),
      signal: options.signal,
    });

    if (res.status === 401) {
      this.config.onUnauthorized?.();
      throw new ApiError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    if (!res.ok) {
      const payload = await this.parseResponse<
        | {
            code?: string;
            message?: string;
            details?: Record<string, unknown>;
          }
        | string
      >(res).catch(() => undefined);
      const fallbackMessage = res.statusText || "Request failed";
      const message = typeof payload === "string" ? payload : (payload?.message ?? fallbackMessage);
      const code =
        typeof payload === "string"
          ? `HTTP_${res.status}`
          : (payload?.code ?? `HTTP_${res.status}`);

      throw new ApiError({
        status: res.status,
        code,
        message,
        details: typeof payload === "string" ? undefined : payload?.details,
      });
    }

    return this.parseResponse<T>(res);
  }

  get<T>(path: string, options: Omit<RequestOptions, "body"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(
    path: string,
    body?: RequestOptions["body"],
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  put<T>(
    path: string,
    body?: RequestOptions["body"],
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  patch<T>(
    path: string,
    body?: RequestOptions["body"],
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }

  delete<T>(path: string, options: Omit<RequestOptions, "body"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}
