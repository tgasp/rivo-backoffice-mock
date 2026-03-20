import type { PaginatedResponse } from "@backoffice/sdk-core/types";
import type { Banner } from "./banners.types";
import type { HttpClient } from "@backoffice/sdk-core/http";

export class BannersService {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<PaginatedResponse<Banner>> {
    return this.http.get<PaginatedResponse<Banner>>("/banners");
  }

  create(payload: Omit<Banner, "id">): Promise<Banner> {
    return this.http.post<Banner>("/banners", payload);
  }

  update(id: string, payload: Partial<Banner>): Promise<Banner> {
    return this.http.patch<Banner>(`/banners/${id}`, payload);
  }

  delete(id: string): Promise<void> {
    return this.http.delete<void>(`/banners/${id}`);
  }
}
