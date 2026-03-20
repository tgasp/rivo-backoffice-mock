import type { BrandingConfig } from "./branding.types";
import type { HttpClient } from "@backoffice/sdk-core/http";

export class BrandingService {
  constructor(private readonly http: HttpClient) {}

  get(tenantId: string): Promise<BrandingConfig> {
    return this.http.get<BrandingConfig>(`/branding/${tenantId}`);
  }

  update(tenantId: string, payload: Partial<BrandingConfig>): Promise<BrandingConfig> {
    return this.http.patch<BrandingConfig>(`/branding/${tenantId}`, payload);
  }
}
