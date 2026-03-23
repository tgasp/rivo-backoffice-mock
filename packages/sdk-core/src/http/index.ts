export interface HttpClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  onUnauthorized?: () => void;
  fetch?: typeof fetch;
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | object | null;
  query?: Record<string, QueryValue>;
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

  private getBody(body: RequestOptions["body"]): BodyInit | undefined {
    if (body === undefined || body === null) {
      return undefined;
    }

    if (
      typeof body === "string" ||
      body instanceof Blob ||
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof ArrayBuffer
    ) {
      return body;
    }

    return JSON.stringify(body);
  }

  private getHeaders(body: RequestOptions["body"], headers?: HeadersInit): Headers {
    const resolvedHeaders = new Headers(headers);
    const token = this.config.getAccessToken?.();

    if (token) {
      resolvedHeaders.set("Authorization", `Bearer ${token}`);
    }

    const hasBody = body !== undefined && body !== null;
    const isJsonBody =
      hasBody &&
      !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer) &&
      typeof body !== "string";

    if (isJsonBody && !resolvedHeaders.has("Content-Type")) {
      resolvedHeaders.set("Content-Type", "application/json");
    }

    return resolvedHeaders;
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    if (res.status === 204) {
      return undefined as T;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }

    return (await res.text()) as T;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const requestInit: RequestInit = {
      ...options,
      body: this.getBody(options.body),
      headers: this.getHeaders(options.body, options.headers),
    };
    const requestUrl = this.buildUrl(path, options.query);
    const fetchImpl = this.config.fetch ?? fetch;
    const res = await fetchImpl(requestUrl, requestInit);

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

  get<T>(path: string, options: Omit<RequestOptions, "body" | "method"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(
    path: string,
    body?: RequestOptions["body"],
    options: Omit<RequestOptions, "body" | "method"> = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  put<T>(
    path: string,
    body?: RequestOptions["body"],
    options: Omit<RequestOptions, "body" | "method"> = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  patch<T>(
    path: string,
    body?: RequestOptions["body"],
    options: Omit<RequestOptions, "body" | "method"> = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }

  delete<T>(path: string, options: Omit<RequestOptions, "body" | "method"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}
