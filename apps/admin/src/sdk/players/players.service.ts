import type { HttpClient } from "@backoffice/sdk-core/http";
import type { PaginatedResponse } from "@backoffice/sdk-core/types";
import type { Player, PlayersQuery } from "./players.types";

export class PlayersService {
  constructor(private readonly http: HttpClient) {}

  list(query: PlayersQuery = {}): Promise<PaginatedResponse<Player>> {
    const params = new URLSearchParams(query as Record<string, string>).toString();
    return this.http.get<PaginatedResponse<Player>>(`/players?${params}`);
  }

  get(id: string): Promise<Player> {
    return this.http.get<Player>(`/players/${id}`);
  }

  suspend(id: string): Promise<Player> {
    return this.http.patch<Player>(`/players/${id}/suspend`, {});
  }
}
