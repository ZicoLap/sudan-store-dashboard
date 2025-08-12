
export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category?: string;
  quantity: number;
  isAvailable: boolean;
  weight: number;
  isFeatured: boolean;
  collectionIds: string[];
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}
