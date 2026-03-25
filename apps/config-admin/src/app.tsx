import { useSdkAuth, useSdkInitialization } from "@backoffice/sdk-react";
import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/protected-route";
import { ConfigDashboardPage } from "./pages/config-dashboard";
import { LoginPage } from "./pages/login";
import { TenantsPage } from "./pages/tenants";

export function App() {
  const { isAuthenticated } = useSdkAuth();
  const { isInitializing, tenantError } = useSdkInitialization();

  if (isInitializing) {
    return <div className="min-h-screen bg-background p-8 text-muted-foreground">Loading...</div>;
  }

  if (tenantError) {
    return (
      <div className="min-h-screen bg-background p-8 text-destructive">{tenantError.message}</div>
    );
  }

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
              <ConfigDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenants"
          element={
            <ProtectedRoute>
              <TenantsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
