import { useLogoutMutation, useSdkTenant } from "@backoffice/sdk-react";
import { Button } from "@backoffice/ui";
import React from "react";

export function DashboardPage() {
  const logoutMutation = useLogoutMutation();
  const { tenant, tenantError } = useSdkTenant();

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">Admin Dashboard</h1>
      {tenantError && <p className="text-destructive mb-6">{tenantError.message}</p>}
      {tenant && <p className="text-muted-foreground mb-6">Tenant: {tenant.tenantId}</p>}
      <Button>Get Started</Button>
      <Button className="ml-3" onClick={() => void logoutMutation.mutateAsync()}>
        Sign out
      </Button>
    </div>
  );
}
