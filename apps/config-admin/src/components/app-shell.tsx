import { useLogoutMutation, useSdkTenant } from "@backoffice/sdk-react";
import { Button } from "@backoffice/ui";
import type React from "react";
import { NavLink } from "react-router-dom";

interface AppShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const navigation = [
  { to: "/", label: "Overview" },
  { to: "/tenants", label: "Tenants" },
];

export function AppShell({ title, description, children }: AppShellProps) {
  const logoutMutation = useLogoutMutation();
  const { tenant } = useSdkTenant();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b bg-card lg:w-72 lg:border-b-0 lg:border-r">
          <div className="space-y-6 p-6">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Config Admin
              </p>
              <h1 className="text-2xl font-bold text-foreground">Master tenant console</h1>
              <p className="text-sm text-muted-foreground">
                Provision tenants, review the platform surface, and control shared settings.
              </p>
            </div>

            <nav className="flex flex-col gap-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    [
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Resolved tenant</p>
              <p className="mt-2 break-all">{tenant?.tenantId ?? "Unavailable"}</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => void logoutMutation.mutateAsync()}
            >
              Sign out
            </Button>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">{title}</h2>
              <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
