import { useSdkAuth, useSdkTenant } from "@backoffice/sdk-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@backoffice/ui";
import type React from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/app-shell";

const quickActions = [
  "Create and activate tenants",
  "Configure platform-wide settings",
  "Review master tenant metadata",
];

export function ConfigDashboardPage() {
  const { session } = useSdkAuth();
  const { tenant, tenantError } = useSdkTenant();

  return (
    <AppShell
      title="Overview"
      description="Manage the master tenant, provision partner tenants, and control shared platform configuration."
    >
      {tenantError && <p className="text-sm text-destructive">{tenantError.message}</p>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
              <Button asChild>
                <Link to="/tenants">Open tenant workspace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Operator:</span>{" "}
              {session?.operator?.email ?? "Not available"}
            </p>
            <p>
              <span className="font-medium text-foreground">Role:</span>{" "}
              {session?.operator?.role ?? "Unknown"}
            </p>
            <p>
              <span className="font-medium text-foreground">Master tenant:</span>{" "}
              {tenant?.tenantId ?? "Unavailable"}
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
