
export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string; // ISO 8601 date string
  updatedAt?: string; // ISO 8601 date string
}
