export interface NavItem {
  id: string;
  label: string;
  href: string;
  order: number;
  parentId?: string;
  isVisible: boolean;
}
