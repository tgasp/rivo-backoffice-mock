export interface Bonus {
  id: string;
  name: string;
  type: "deposit" | "free_spins" | "cashback";
  value: number;
  currency?: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}
