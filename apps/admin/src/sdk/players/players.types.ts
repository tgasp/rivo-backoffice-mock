export interface Player {
  id: string;
  username: string;
  email: string;
  status: "active" | "suspended" | "banned";
  balance: number;
  currency: string;
  createdAt: string;
}

export interface PlayersQuery {
  page?: number;
  pageSize?: number;
  status?: Player["status"];
  search?: string;
}
