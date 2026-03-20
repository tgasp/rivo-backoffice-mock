export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  position: "hero" | "sidebar" | "footer";
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
}
