import type { HttpClient } from "@backoffice/sdk-core/http";
import type { PaginatedResponse } from "@backoffice/sdk-core/types";
import type { StaticPage } from "./pages.types";

export class PagesService {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<PaginatedResponse<StaticPage>> {
    return this.http.get<PaginatedResponse<StaticPage>>("/pages");
  }

  get(slug: string): Promise<StaticPage> {
    return this.http.get<StaticPage>(`/pages/${slug}`);
  }

  upsert(payload: Omit<StaticPage, "id" | "updatedAt">): Promise<StaticPage> {
    return this.http.post<StaticPage>("/pages", payload);
  }
}
