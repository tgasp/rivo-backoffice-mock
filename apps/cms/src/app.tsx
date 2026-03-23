import { logoutOperator } from "@backoffice/sdk-core/auth";
import { getTenantConfig } from "@backoffice/sdk-core/tenant";
import type { OperatorSession, TenantConfig } from "@backoffice/sdk-core/types";
import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/protected-route";
import { getAppConfig } from "./lib/app-config";
import {
  clearStoredOperatorSession,
  getStoredOperatorSession,
  storeOperatorSession,
} from "./lib/operator-session";
import { ContentPage } from "./pages/content";
import { LoginPage } from "./pages/login";

export function App() {
  const [session, setSession] = useState<OperatorSession | null>(() => getStoredOperatorSession());
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [isTenantLoading, setIsTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const isAuthenticated = Boolean(session?.accessToken);

  useEffect(() => {
    const controller = new AbortController();
    const { apiBaseUrl } = getAppConfig();

    setIsTenantLoading(true);
    getTenantConfig(apiBaseUrl, { signal: controller.signal })
      .then((resolvedTenant) => {
        setTenant(resolvedTenant);
        setTenantError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setTenantError(err instanceof Error ? err.message : "Failed to resolve tenant");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsTenantLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  function handleLogin(nextSession: OperatorSession) {
    storeOperatorSession(nextSession);
    setSession(nextSession);
  }

  async function handleLogout() {
    const currentSession = session;
    clearStoredOperatorSession();
    setSession(null);

    if (!currentSession?.accessToken) {
      return;
    }

    const { apiBaseUrl } = getAppConfig();
    try {
      await logoutOperator(apiBaseUrl, currentSession.accessToken, {
        refreshToken: currentSession.refreshToken ?? undefined,
      });
    } catch {
      // Local session removal is the source of truth for the SPA logout flow.
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ContentPage
                isTenantLoading={isTenantLoading}
                onLogout={handleLogout}
                tenant={tenant}
                tenantError={tenantError}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
