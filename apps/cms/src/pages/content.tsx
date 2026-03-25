import {
  useLogoutMutation,
  useSdkAuth,
  useSdkTenant,
  useTenantAdminConfigQuery,
  useUpdateTenantAdminConfigMutation,
} from "@backoffice/sdk-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@backoffice/ui";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

function formatJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

export function ContentPage() {
  const { session } = useSdkAuth();
  const logoutMutation = useLogoutMutation();
  const { tenant, tenantError } = useSdkTenant();
  const tenantAdminConfigQuery = useTenantAdminConfigQuery();
  const updateTenantAdminConfigMutation = useUpdateTenantAdminConfigMutation();
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [logo, setLogo] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [settingsText, setSettingsText] = useState("{}");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tenantAdminConfig = tenantAdminConfigQuery.data ?? null;

  useEffect(() => {
    if (!tenantAdminConfig) {
      return;
    }

    setName(tenantAdminConfig.name);
    setIsActive(tenantAdminConfig.isActive);
    setLogo(tenantAdminConfig.branding.logo ?? "");
    setFaviconUrl(
      tenantAdminConfig.branding.faviconUrl ?? tenantAdminConfig.branding.favicon ?? ""
    );
    setPrimaryColor(
      tenantAdminConfig.branding.primaryColor ?? tenantAdminConfig.branding.colors?.primary ?? ""
    );
    setSecondaryColor(
      tenantAdminConfig.branding.secondaryColor ??
        tenantAdminConfig.branding.colors?.secondary ??
        ""
    );
    setSettingsText(formatJson(tenantAdminConfig.settings));
  }, [tenantAdminConfig]);

  const operatorName = useMemo(() => {
    const operator = session?.operator;
    if (!operator) {
      return "Tenant admin";
    }

    const fullName = [operator.firstName, operator.lastName].filter(Boolean).join(" ").trim();
    return fullName || operator.email;
  }, [session]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    let parsedSettings: Record<string, unknown>;
    try {
      parsedSettings = JSON.parse(settingsText) as Record<string, unknown>;
    } catch {
      setFormError("Settings must be valid JSON before they can be saved.");
      return;
    }

    try {
      await updateTenantAdminConfigMutation.mutateAsync({
        name,
        isActive,
        branding: {
          logo: logo || undefined,
          faviconUrl: faviconUrl || undefined,
          primaryColor: primaryColor || undefined,
          secondaryColor: secondaryColor || undefined,
        },
        settings: parsedSettings,
      });
      setSuccessMessage("Tenant configuration saved.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save tenant configuration.");
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              CMS Workspace
            </p>
            <h1 className="text-3xl font-bold text-foreground">Tenant configuration</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Review the resolved tenant, confirm the active operator session, and update the
              public-facing configuration that powers the tenant experience.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => tenantAdminConfigQuery.refetch()}>
              Refresh data
            </Button>
            <Button onClick={() => void logoutMutation.mutateAsync()}>Sign out</Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Resolved tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Tenant ID:</span>{" "}
                {tenant?.tenantId ?? "Unavailable"}
              </p>
              <p>
                <span className="font-medium text-foreground">Slug:</span> {tenant?.slug ?? "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Locale:</span>{" "}
                {tenant?.locale ?? "Not set"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operator session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Signed in as:</span> {operatorName}
              </p>
              <p>
                <span className="font-medium text-foreground">Role:</span>{" "}
                {session?.operator?.role ?? "Unknown"}
              </p>
              <p>
                <span className="font-medium text-foreground">Realm:</span>{" "}
                {session?.operator?.realm ?? "Not provided"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Tenant admin API:</span>{" "}
                {tenantAdminConfigQuery.isPending
                  ? "Loading"
                  : tenantAdminConfigQuery.isError
                    ? "Unavailable"
                    : "Ready"}
              </p>
              <p>
                <span className="font-medium text-foreground">Last updated:</span>{" "}
                {tenantAdminConfig?.updatedAt ?? "Unknown"}
              </p>
              <p>
                <span className="font-medium text-foreground">Public config loaded:</span>{" "}
                {tenant ? "Yes" : "No"}
              </p>
            </CardContent>
          </Card>
        </div>

        {(tenantError || tenantAdminConfigQuery.error || formError || successMessage) && (
          <div className="space-y-2">
            {tenantError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {tenantError.message}
              </div>
            )}
            {tenantAdminConfigQuery.error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {tenantAdminConfigQuery.error.message}
              </div>
            )}
            {formError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}
            {successMessage && (
              <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tenant admin config</CardTitle>
          </CardHeader>
          <CardContent>
            {tenantAdminConfigQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading tenant configuration…</p>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tenant-name">Tenant name</Label>
                    <Input
                      id="tenant-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Brand X"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenant-domain">Domain</Label>
                    <Input
                      id="tenant-domain"
                      value={tenantAdminConfig?.domain ?? ""}
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenant-slug">Slug</Label>
                    <Input
                      id="tenant-slug"
                      value={tenantAdminConfig?.slug ?? ""}
                      disabled
                      readOnly
                    />
                  </div>

                  <label
                    htmlFor="tenant-active"
                    className="flex items-center gap-3 rounded-lg border px-4 py-3"
                  >
                    <input
                      id="tenant-active"
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                    />
                    <span className="text-sm text-foreground">Tenant is active</span>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tenant-logo">Logo URL</Label>
                    <Input
                      id="tenant-logo"
                      value={logo}
                      onChange={(event) => setLogo(event.target.value)}
                      placeholder="https://cdn.brand-x.com/logo.png"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenant-favicon">Favicon URL</Label>
                    <Input
                      id="tenant-favicon"
                      value={faviconUrl}
                      onChange={(event) => setFaviconUrl(event.target.value)}
                      placeholder="https://cdn.brand-x.com/favicon.ico"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenant-primary-color">Primary color</Label>
                    <Input
                      id="tenant-primary-color"
                      value={primaryColor}
                      onChange={(event) => setPrimaryColor(event.target.value)}
                      placeholder="#FF5733"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenant-secondary-color">Secondary color</Label>
                    <Input
                      id="tenant-secondary-color"
                      value={secondaryColor}
                      onChange={(event) => setSecondaryColor(event.target.value)}
                      placeholder="#C70039"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-settings">Runtime settings JSON</Label>
                  <textarea
                    id="tenant-settings"
                    className="min-h-64 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    value={settingsText}
                    onChange={(event) => setSettingsText(event.target.value)}
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    This maps directly to the tenant settings object returned by the backend.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={updateTenantAdminConfigMutation.isPending}>
                    {updateTenantAdminConfigMutation.isPending ? "Saving…" : "Save configuration"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!tenantAdminConfig) {
                        return;
                      }

                      setName(tenantAdminConfig.name);
                      setIsActive(tenantAdminConfig.isActive);
                      setLogo(tenantAdminConfig.branding.logo ?? "");
                      setFaviconUrl(
                        tenantAdminConfig.branding.faviconUrl ??
                          tenantAdminConfig.branding.favicon ??
                          ""
                      );
                      setPrimaryColor(
                        tenantAdminConfig.branding.primaryColor ??
                          tenantAdminConfig.branding.colors?.primary ??
                          ""
                      );
                      setSecondaryColor(
                        tenantAdminConfig.branding.secondaryColor ??
                          tenantAdminConfig.branding.colors?.secondary ??
                          ""
                      );
                      setSettingsText(formatJson(tenantAdminConfig.settings));
                      setFormError(null);
                      setSuccessMessage(null);
                    }}
                  >
                    Reset form
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
