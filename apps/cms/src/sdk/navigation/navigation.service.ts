import type { NavItem } from "./navigation.types";
import type { HttpClient } from "@backoffice/sdk-core/http";

export class NavigationService {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<NavItem[]> {
    return this.http.get<NavItem[]>("/navigation");
  }

  update(id: string, payload: Partial<NavItem>): Promise<NavItem> {
    return this.http.patch<NavItem>(`/navigation/${id}`, payload);
  }

  reorder(ids: string[]): Promise<void> {
    return this.http.post<void>("/navigation/reorder", { ids });
  }
}
