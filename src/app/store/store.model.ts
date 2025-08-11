// store.model.ts
export interface Store {
  id: string;
  name: string;
  description: string;
  email: string;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
    label?: string;
  };
  categoryIds: string[];
  storeTypes: string[];
  tags: string[];
  coverImageUrl?: string;
  logoUrl?: string;
  deliveryPricing: { fee: number; maxWeight: number }[];
  freeDeliveryOver?: number;
  minimumOrderAmount?: number;
  rating?: number;
  ratingCount?: number;
  storeOwnerId: string;
  isActive: boolean;
  isApproved: boolean;
  isFeatured: boolean;
  isOpen: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
