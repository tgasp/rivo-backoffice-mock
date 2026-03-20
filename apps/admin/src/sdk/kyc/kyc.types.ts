export interface KycRecord {
  id: string;
  playerId: string;
  status: "pending" | "approved" | "rejected";
  documentType: "passport" | "id_card" | "drivers_license";
  submittedAt: string;
  reviewedAt?: string;
}
