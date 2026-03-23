import type { HttpClient } from "@backoffice/sdk-core/http";
import type { PaginatedResponse } from "@backoffice/sdk-core/types";
import type { KycRecord } from "./kyc.types";

export class KycService {
  constructor(private readonly http: HttpClient) {}

  list(status?: KycRecord["status"]): Promise<PaginatedResponse<KycRecord>> {
    const params = status ? `?status=${status}` : "";
    return this.http.get<PaginatedResponse<KycRecord>>(`/kyc${params}`);
  }

  approve(id: string): Promise<KycRecord> {
    return this.http.patch<KycRecord>(`/kyc/${id}/approve`, {});
  }

  reject(id: string, reason: string): Promise<KycRecord> {
    return this.http.patch<KycRecord>(`/kyc/${id}/reject`, { reason });
  }
}
