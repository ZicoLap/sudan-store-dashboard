export interface CartItem {
  productId: string;
  storeId: string;
  name: string;
  imageUrl?: string;
  price: number;
  weight: number;
  quantity: number;
  
  // Computed properties (you'll need to calculate these in your Angular service/component)
  totalPrice: number; // price * quantity
  totalWeight: number; // weight * quantity
}