import { refreshOperatorSession } from "@backoffice/sdk-core/auth";
import { type SdkClient, createSdkClient } from "@backoffice/sdk-core/client";
import { type HttpTransport, createFetchTransport } from "@backoffice/sdk-core/http";
import type {
  OperatorLoginRequest,
  OperatorSession,
  TenantAdminConfig,
  TenantConfig,
  TenantResolution,
  UpdateTenantAdminConfigRequest,
} from "@backoffice/sdk-core/types";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface SdkContextValue {
  client: SdkClient;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (credentials: OperatorLoginRequest) => Promise<OperatorSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<OperatorSession | null>;
  session: OperatorSession | null;
  tenantResolution: TenantResolution | null;
  tenant: TenantConfig | null;
  tenantError: Error | null;
}

interface SdkProviderProps {
  apiBaseUrl: string;
  children: React.ReactNode;
  domain?: string;
  queryClient?: QueryClient;
}

const tenantQueryKey = (domain: string) => ["sdk-react", "tenant", domain] as const;
const tenantConfigQueryKey = (tenantId: string) =>
  ["sdk-react", "tenant-config", tenantId] as const;
const tenantAdminConfigQueryKey = (tenantId: string) =>
  ["sdk-react", "tenant-admin-config", tenantId] as const;

const SdkContext = createContext<SdkContextValue | null>(null);

function getBrowserBody(
  body: string | ArrayBuffer | Uint8Array | undefined
): BodyInit | null | undefined {
  return body as BodyInit | null | undefined;
}

function getDefaultDomain(): string {
  if (typeof window === "undefined") {
    return "localhost";
  }

  return window.location.hostname;
}

function createBrowserTransport(): HttpTransport {
  return createFetchTransport({
    fetch: async (input, init) =>
      fetch(input, {
        method: init?.method,
        headers: init?.headers,
        body: getBrowserBody(init?.body),
        credentials: init?.credentials ?? "include",
        signal: init?.signal as AbortSignal | null | undefined,
      }),
  });
}

function SdkProviderInner({
  apiBaseUrl,
  children,
  domain = getDefaultDomain(),
}: Omit<SdkProviderProps, "queryClient">) {
  const [session, setSession] = useState<OperatorSession | null>(null);
  const refreshPromiseRef = useRef<Promise<OperatorSession | null> | null>(null);
  const sessionRef = useRef<OperatorSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const baseTransport = useMemo(() => createBrowserTransport(), []);

  const tenantQuery = useQuery({
    queryKey: tenantQueryKey(domain),
    queryFn: async () => {
      const client = createSdkClient({
        baseUrl: apiBaseUrl,
        transport: baseTransport,
      });

      return client.resolveTenant({ domain });
    },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const tenantResolution = tenantQuery.data ?? null;
  const tenantId = tenantResolution?.id ?? null;

  const sessionBootstrapQuery = useQuery({
    queryKey: ["sdk-react", "session-bootstrap", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      try {
        return await refreshOperatorSession(apiBaseUrl, {
          tenantId: tenantId ?? undefined,
          transport: baseTransport,
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          error.status === 401
        ) {
          return null;
        }

        throw error;
      }
    },
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!sessionBootstrapQuery.data?.accessToken) {
      return;
    }

    setSession((currentSession) => currentSession ?? sessionBootstrapQuery.data);
  }, [sessionBootstrapQuery.data]);

  const tenantConfigQuery = useQuery({
    queryKey: tenantConfigQueryKey(tenantId ?? "unresolved"),
    enabled: Boolean(tenantId && session?.accessToken),
    queryFn: () => client.getTenantConfig(),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const tenant = tenantConfigQuery.data ?? null;

  const refreshSession = useCallback(async (): Promise<OperatorSession | null> => {
    if (!tenantId) {
      return null;
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = refreshOperatorSession(apiBaseUrl, {
        tenantId,
        transport: baseTransport,
      })
        .then((nextSession) => {
          setSession(nextSession);
          return nextSession;
        })
        .catch((error) => {
          setSession(null);
          throw error;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }

    return refreshPromiseRef.current;
  }, [apiBaseUrl, baseTransport, tenantId]);

  const authenticatedTransport = useMemo<HttpTransport>(
    () => ({
      request: async (request) => {
        const response = await baseTransport.request(request);
        const isRefreshRequest = request.url.includes("/api/v1/auth/refresh");
        const hasAccessToken = Boolean(request.headers.Authorization);

        if (response.status !== 401 || isRefreshRequest || !hasAccessToken || !tenantId) {
          return response;
        }

        try {
          const nextSession = await refreshSession();
          if (!nextSession?.accessToken) {
            return response;
          }

          return baseTransport.request({
            ...request,
            headers: {
              ...request.headers,
              Authorization: `Bearer ${nextSession.accessToken}`,
            },
          });
        } catch {
          return response;
        }
      },
    }),
    [baseTransport, refreshSession, tenantId]
  );

  const client = useMemo(
    () =>
      createSdkClient({
        baseUrl: apiBaseUrl,
        getAccessToken: () => session?.accessToken ?? sessionRef.current?.accessToken,
        getTenantId: () => tenantId,
        transport: authenticatedTransport,
      }),
    [apiBaseUrl, authenticatedTransport, session?.accessToken, tenantId]
  );

  const login = useCallback(
    async (credentials: OperatorLoginRequest) => {
      if (!tenantId) {
        throw new Error("Tenant must be resolved before logging in");
      }

      const nextSession = await client.loginOperator(credentials);
      setSession(nextSession);
      return nextSession;
    },
    [client, tenantId]
  );

  const logout = useCallback(async () => {
    const currentSession = sessionRef.current;
    setSession(null);

    if (!currentSession?.accessToken) {
      return;
    }

    try {
      if (!currentSession.operator?.id) {
        return;
      }

      await client.logoutOperator(currentSession.accessToken, currentSession.operator.id);
    } catch {
      // Local memory state is the source of truth for the wrapper logout flow.
    }
  }, [client]);

  const value = useMemo<SdkContextValue>(
    () => ({
      client,
      isAuthenticated: Boolean(session?.accessToken),
      isInitializing: tenantQuery.isPending || sessionBootstrapQuery.isPending,
      login,
      logout,
      refreshSession,
      session,
      tenantResolution,
      tenant,
      tenantError: (tenantQuery.error as Error | null) ?? null,
    }),
    [
      client,
      login,
      logout,
      refreshSession,
      session,
      sessionBootstrapQuery.isPending,
      tenantResolution,
      tenant,
      tenantQuery.error,
      tenantQuery.isPending,
    ]
  );

  return <SdkContext.Provider value={value}>{children}</SdkContext.Provider>;
}

export function SdkProvider({ apiBaseUrl, children, domain, queryClient }: SdkProviderProps) {
  const [internalQueryClient] = useState(
    () =>
      queryClient ??
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={internalQueryClient}>
      <SdkProviderInner apiBaseUrl={apiBaseUrl} domain={domain}>
        {children}
      </SdkProviderInner>
    </QueryClientProvider>
  );
}

export function useSdk(): SdkContextValue {
  const context = useContext(SdkContext);
  if (!context) {
    throw new Error("useSdk must be used within SdkProvider");
  }

  return context;
}

export function useSdkClient(): SdkClient {
  return useSdk().client;
}

export function useSdkTenant() {
  const { tenant, tenantError, tenantResolution } = useSdk();
  return {
    tenantResolution,
    tenant,
    tenantError,
  };
}

export function useSdkAuth() {
  const { isAuthenticated, login, logout, refreshSession, session } = useSdk();
  return {
    isAuthenticated,
    login,
    logout,
    refreshSession,
    session,
  };
}

export function useSdkInitialization() {
  const { isInitializing, tenant, tenantError } = useSdk();
  return {
    isInitializing,
    tenant,
    tenantError,
  };
}

export function useLoginMutation() {
  const { login } = useSdkAuth();

  return useMutation({
    mutationFn: login,
  });
}

export function useLogoutMutation() {
  const { logout } = useSdkAuth();

  return useMutation({
    mutationFn: logout,
  });
}

export function useRefreshSessionMutation() {
  const { refreshSession } = useSdkAuth();

  return useMutation({
    mutationFn: refreshSession,
  });
}

export function useTenantAdminConfigQuery() {
  const { client, isAuthenticated, tenant } = useSdk();
  const tenantId = tenant?.tenantId ?? "unresolved";

  return useQuery({
    queryKey: tenantAdminConfigQueryKey(tenantId),
    enabled: isAuthenticated && Boolean(tenant?.tenantId),
    queryFn: () => client.getCurrentTenantConfig(),
  });
}

export function useUpdateTenantAdminConfigMutation() {
  const { client, tenant } = useSdk();
  const queryClient = useQueryClient();
  const tenantId = tenant?.tenantId ?? null;

  return useMutation({
    mutationFn: (request: UpdateTenantAdminConfigRequest) =>
      client.updateCurrentTenantConfig(request),
    onSuccess: async (nextConfig: TenantAdminConfig) => {
      if (!tenantId) {
        return;
      }

      queryClient.setQueryData(tenantAdminConfigQueryKey(tenantId), nextConfig);
      await queryClient.invalidateQueries({
        queryKey: tenantConfigQueryKey(tenantId),
      });
    },
  });
}
