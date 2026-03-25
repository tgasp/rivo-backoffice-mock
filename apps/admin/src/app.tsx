import { useSdkAuth, useSdkInitialization } from "@backoffice/sdk-react";
import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/protected-route";
import { DashboardPage } from "./pages/dashboard";
import { LoginPage } from "./pages/login";

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
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
