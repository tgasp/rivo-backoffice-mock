export interface Payment {
  id: string;
  playerId: string;
  amount: number;
  currency: string;
  type: "deposit" | "withdrawal";
  status: "pending" | "completed" | "failed" | "cancelled";
  createdAt: string;
}
