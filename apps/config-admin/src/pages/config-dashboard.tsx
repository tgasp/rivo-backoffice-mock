import { useLogoutMutation, useSdkTenant } from "@backoffice/sdk-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@backoffice/ui";
import React from "react";

const quickActions = [
  "Create and activate tenants",
  "Configure platform-wide settings",
  "Review master tenant metadata",
];

export function ConfigDashboardPage() {
  const logoutMutation = useLogoutMutation();
  const { tenant, tenantError } = useSdkTenant();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Config Admin</h1>
          <p className="text-muted-foreground">
            Manage the master tenant, provision partner tenants, and control shared platform
            configuration.
          </p>
          {tenantError && <p className="text-sm text-destructive">{tenantError.message}</p>}
          {tenant && (
            <p className="text-sm text-muted-foreground">Resolved tenant: {tenant.tenantId}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {quickActions.map((action) => (
                <div
                  key={action}
                  className="rounded-lg border bg-card p-4 text-sm text-card-foreground"
                >
                  {action}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button>Start configuring</Button>
              <Button onClick={() => void logoutMutation.mutateAsync()}>Sign out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
