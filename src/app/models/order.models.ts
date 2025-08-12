import { Address } from "./address.models";
import { CartItem } from "./cartitem.models";

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  totalWeight: number;
  status: string; // Consider using union type: 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  paymentStatus: string; // Consider using union type: 'paid' | 'failed' | 'pending'
  paymentMethod: string; // Consider using union type: 'stripe' | 'cash' | 'card'
  name: string;
  phone: string;
  address: Address;
  orderNote?: string;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentStatus = 'paid' | 'failed' | 'pending' | 'refunded';
export type PaymentMethod = 'stripe' | 'cash' | 'card' | 'mobile_money';


export interface StrictOrder extends Omit<Order, 'status' | 'paymentStatus' | 'paymentMethod'> {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
}