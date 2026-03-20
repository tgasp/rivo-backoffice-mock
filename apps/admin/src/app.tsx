import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { resolveTenant, useTenantStore } from "@backoffice/sdk-core/meta";
import { getConfig } from "@backoffice/sdk-core/config";
import { useAuthStore } from "@backoffice/sdk-core/auth";
import { DashboardPage } from "./pages/dashboard";
import { LoginPage } from "./pages/login";
import { ProtectedRoute } from "./components/protected-route";

export function App() {
  const { setTenant, setLoading, setError } = useTenantStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const { apiBaseUrl } = getConfig();
    setLoading(true);
    resolveTenant(apiBaseUrl)
      .then(setTenant)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to resolve tenant");
      });
  }, [setTenant, setLoading, setError]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
