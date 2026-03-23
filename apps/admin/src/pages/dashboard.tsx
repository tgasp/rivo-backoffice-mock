import type { TenantConfig } from "@backoffice/sdk-core/types";
import { Button } from "@backoffice/ui";
import React from "react";

interface DashboardPageProps {
  isTenantLoading: boolean;
  onLogout: () => Promise<void> | void;
  tenant: TenantConfig | null;
  tenantError: string | null;
}

export function DashboardPage({
  isTenantLoading,
  onLogout,
  tenant,
  tenantError,
}: DashboardPageProps) {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">Admin Dashboard</h1>
      {isTenantLoading && <p className="text-muted-foreground mb-6">Loading tenant...</p>}
      {tenantError && <p className="text-destructive mb-6">{tenantError}</p>}
      {tenant && <p className="text-muted-foreground mb-6">Tenant: {tenant.tenantId}</p>}
      <Button>Get Started</Button>
      <Button className="ml-3" onClick={() => void onLogout()}>
        Sign out
      </Button>
    </div>
  );
}
