import type { PaginatedResponse } from "@backoffice/sdk-core/types";
import type { Payment } from "./payments.types";
import type { HttpClient } from "@backoffice/sdk-core/http";

export class PaymentsService {
  constructor(private readonly http: HttpClient) {}

  list(query: Record<string, string> = {}): Promise<PaginatedResponse<Payment>> {
    const params = new URLSearchParams(query).toString();
    return this.http.get<PaginatedResponse<Payment>>(`/payments?${params}`);
  }

  get(id: string): Promise<Payment> {
    return this.http.get<Payment>(`/payments/${id}`);
  }
}
