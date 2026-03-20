import React from "react";
import { Button } from "@backoffice/ui";
import { useTenantStore } from "@backoffice/sdk-core/meta";

export function DashboardPage() {
  const { tenant } = useTenantStore();

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">Admin Dashboard</h1>
      {tenant && (
        <p className="text-muted-foreground mb-6">Tenant: {tenant.id}</p>
      )}
      <Button>Get Started</Button>
    </div>
  );
}
