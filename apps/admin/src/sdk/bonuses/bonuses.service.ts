import type { PaginatedResponse } from "@backoffice/sdk-core/types";
import type { Bonus } from "./bonuses.types";
import type { HttpClient } from "@backoffice/sdk-core/http";

export class BonusesService {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<PaginatedResponse<Bonus>> {
    return this.http.get<PaginatedResponse<Bonus>>("/bonuses");
  }

  create(payload: Omit<Bonus, "id">): Promise<Bonus> {
    return this.http.post<Bonus>("/bonuses", payload);
  }
}
