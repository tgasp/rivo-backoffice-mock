import type {
  CreateTenantRequest,
  TenantRecord,
  UpdateTenantRequest,
} from "@backoffice/sdk-core/types";
import { useSdkClient } from "@backoffice/sdk-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@backoffice/ui";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/app-shell";

interface TenantFormState {
  name: string;
  domain: string;
  domainAliasesText: string;
  slug: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  faviconUrl: string;
  adminEmail: string;
  adminPassword: string;
  settingsText: string;
  isActive: boolean;
}

const emptyForm: TenantFormState = {
  name: "",
  domain: "",
  domainAliasesText: "",
  slug: "",
  logo: "",
  primaryColor: "",
  secondaryColor: "",
  faviconUrl: "",
  adminEmail: "",
  adminPassword: "",
  settingsText: "{}",
  isActive: true,
};

function getTenantFormState(tenant: TenantRecord | null): TenantFormState {
  if (!tenant) {
    return emptyForm;
  }

  return {
    name: tenant.name,
    domain: tenant.domain,
    domainAliasesText: tenant.domainAliases.join("\n"),
    slug: tenant.slug,
    logo: tenant.branding.logo ?? "",
    primaryColor: tenant.branding.primaryColor ?? tenant.branding.colors?.primary ?? "",
    secondaryColor: tenant.branding.secondaryColor ?? tenant.branding.colors?.secondary ?? "",
    faviconUrl: tenant.branding.faviconUrl ?? tenant.branding.favicon ?? "",
    adminEmail: "",
    adminPassword: "",
    settingsText: JSON.stringify(tenant.settings ?? {}, null, 2),
    isActive: tenant.isActive,
  };
}

export function TenantsPage() {
  const client = useSdkClient();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TenantFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTenants() {
      setIsLoading(true);
      setError(null);

      try {
        const nextTenants = await client.listTenants();
        if (cancelled) {
          return;
        }

        setTenants(nextTenants);
        setSelectedTenantId((currentTenantId) =>
          currentTenantId && nextTenants.some((tenant) => tenant.id === currentTenantId)
            ? currentTenantId
            : (nextTenants[0]?.id ?? null)
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load tenants.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTenants();

    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    setFormState(getTenantFormState(selectedTenant));
    setSuccessMessage(null);
    setError(null);
  }, [selectedTenant]);

  function updateForm<K extends keyof TenantFormState>(key: K, value: TenantFormState[K]) {
    setFormState((currentState) => ({
      ...currentState,
      [key]: value,
    }));
  }

  function startCreateFlow() {
    setSelectedTenantId(null);
    setFormState(emptyForm);
    setError(null);
    setSuccessMessage(null);
  }

  async function refreshTenants(nextSelectedTenantId?: string | null) {
    const nextTenants = await client.listTenants();
    setTenants(nextTenants);

    if (nextSelectedTenantId === null) {
      setSelectedTenantId(null);
      return;
    }

    const targetId = nextSelectedTenantId ?? selectedTenantId ?? nextTenants[0]?.id ?? null;

    setSelectedTenantId(
      targetId && nextTenants.some((tenant) => tenant.id === targetId)
        ? targetId
        : (nextTenants[0]?.id ?? null)
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    let settings: Record<string, unknown>;
    const domainAliases = formState.domainAliasesText
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
    try {
      settings = JSON.parse(formState.settingsText) as Record<string, unknown>;
    } catch {
      setError("Settings must be valid JSON.");
      setIsSaving(false);
      return;
    }

    try {
      if (selectedTenant) {
        const request: UpdateTenantRequest = {
          name: formState.name,
          domain: formState.domain,
          domainAliases,
          slug: formState.slug,
          branding: {
            logo: formState.logo || undefined,
            primaryColor: formState.primaryColor || undefined,
            secondaryColor: formState.secondaryColor || undefined,
            faviconUrl: formState.faviconUrl || undefined,
          },
          settings,
          isActive: formState.isActive,
        };

        const updatedTenant = await client.updateTenant(selectedTenant.id, request);
        await refreshTenants(updatedTenant.id);
        setSuccessMessage("Tenant updated.");
      } else {
        const request: CreateTenantRequest = {
          name: formState.name,
          domain: formState.domain,
          domainAliases,
          slug: formState.slug,
          branding: {
            logo: formState.logo || undefined,
            primaryColor: formState.primaryColor || undefined,
            secondaryColor: formState.secondaryColor || undefined,
            faviconUrl: formState.faviconUrl || undefined,
          },
          settings,
          isActive: formState.isActive,
          adminEmail: formState.adminEmail,
          adminPassword: formState.adminPassword,
        };

        const createdTenant = await client.createTenant(request);
        await refreshTenants(createdTenant.id);
        setSuccessMessage("Tenant created.");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save tenant.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTenant) {
      return;
    }

    const confirmed = window.confirm(`Delete tenant "${selectedTenant.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await client.deleteTenant(selectedTenant.id);
      await refreshTenants(null);
      setFormState(emptyForm);
      setSuccessMessage("Tenant deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete tenant.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell
      title="Tenants"
      description="Create new partner tenants, review active environments, and update tenant metadata from one dedicated control surface."
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Tenant registry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={startCreateFlow}>
              Create tenant
            </Button>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading tenants...</p>
            ) : (
              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    type="button"
                    className={[
                      "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                      selectedTenantId === tenant.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted",
                    ].join(" ")}
                    onClick={() => setSelectedTenantId(tenant.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{tenant.name}</span>
                      <span
                        className={[
                          "rounded-full px-2 py-1 text-xs",
                          tenant.isActive
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {tenant.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{tenant.domain}</p>
                    {!!tenant.domainAliases.length && (
                      <p className="text-xs text-muted-foreground">
                        Aliases: {tenant.domainAliases.join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Slug: {tenant.slug}</p>
                  </button>
                ))}

                {!tenants.length && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No tenants found yet.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedTenant ? "Edit tenant" : "Create tenant"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(error || successMessage) && (
              <div className="space-y-2">
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                )}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Tenant name</Label>
                  <Input
                    id="tenant-name"
                    value={formState.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Brand X"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-domain">Domain</Label>
                  <Input
                    id="tenant-domain"
                    value={formState.domain}
                    onChange={(event) => updateForm("domain", event.target.value)}
                    placeholder="brand-x.com"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tenant-domain-aliases">Domain aliases</Label>
                  <textarea
                    id="tenant-domain-aliases"
                    className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    value={formState.domainAliasesText}
                    onChange={(event) => updateForm("domainAliasesText", event.target.value)}
                    placeholder={"brand-x.bet\nwww.brand-x.com"}
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    One alias per line or comma-separated.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-slug">Slug</Label>
                  <Input
                    id="tenant-slug"
                    value={formState.slug}
                    onChange={(event) => updateForm("slug", event.target.value)}
                    placeholder="brand-x"
                    required
                  />
                </div>

                <label
                  htmlFor="tenant-active"
                  className="flex items-center gap-3 rounded-lg border px-4 py-3"
                >
                  <input
                    id="tenant-active"
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(event) => updateForm("isActive", event.target.checked)}
                  />
                  <span className="text-sm text-foreground">Tenant is active</span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenant-logo">Logo URL</Label>
                  <Input
                    id="tenant-logo"
                    value={formState.logo}
                    onChange={(event) => updateForm("logo", event.target.value)}
                    placeholder="https://cdn.brand-x.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-favicon">Favicon URL</Label>
                  <Input
                    id="tenant-favicon"
                    value={formState.faviconUrl}
                    onChange={(event) => updateForm("faviconUrl", event.target.value)}
                    placeholder="https://cdn.brand-x.com/favicon.ico"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-primary-color">Primary color</Label>
                  <Input
                    id="tenant-primary-color"
                    value={formState.primaryColor}
                    onChange={(event) => updateForm("primaryColor", event.target.value)}
                    placeholder="#FF5733"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-secondary-color">Secondary color</Label>
                  <Input
                    id="tenant-secondary-color"
                    value={formState.secondaryColor}
                    onChange={(event) => updateForm("secondaryColor", event.target.value)}
                    placeholder="#C70039"
                  />
                </div>
              </div>

              {!selectedTenant && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tenant-admin-email">Admin email</Label>
                    <Input
                      id="tenant-admin-email"
                      type="email"
                      value={formState.adminEmail}
                      onChange={(event) => updateForm("adminEmail", event.target.value)}
                      placeholder="admin@brand-x.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenant-admin-password">Admin password</Label>
                    <Input
                      id="tenant-admin-password"
                      type="password"
                      value={formState.adminPassword}
                      onChange={(event) => updateForm("adminPassword", event.target.value)}
                      placeholder="Admin123!"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tenant-settings">Settings JSON</Label>
                <textarea
                  id="tenant-settings"
                  className="min-h-64 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  value={formState.settingsText}
                  onChange={(event) => updateForm("settingsText", event.target.value)}
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : selectedTenant ? "Save changes" : "Create tenant"}
                </Button>
                <Button type="button" variant="outline" onClick={startCreateFlow}>
                  New tenant
                </Button>
                {selectedTenant && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => void handleDelete()}
                  >
                    {isDeleting ? "Deleting..." : "Delete tenant"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
