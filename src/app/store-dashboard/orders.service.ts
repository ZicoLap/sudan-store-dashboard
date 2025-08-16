import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  updateDoc,
  DocumentData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Order, OrderStatus, PaymentStatus } from '../models/order.models';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private firestore: Firestore = inject(Firestore);
  private readonly ORDERS_COLLECTION = 'orders';

  constructor() {}

  /**
   * Get real-time orders for a specific store
   */
  getOrders(storeId: string): Observable<Order[]> {
    if (!storeId) {
      throw new Error('storeId is required');
    }
    
    const ordersRef = collection(this.firestore, this.ORDERS_COLLECTION);
    const ordersQuery = query(
      ordersRef,
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    );
    
    return collectionData(ordersQuery, { idField: 'id' }) as Observable<Order[]>;
  }

  /**
   * Get a single order by ID (alias for getOrder for backward compatibility)
   */
  getOrderById(orderId: string): Observable<Order | undefined> {
    return this.getOrder(orderId);
  }

  /**
   * Get a single order by ID and verify it belongs to the specified store
   */
  getOrderByStoreAndId(storeId: string, orderId: string): Observable<Order | undefined> {
    const orderRef = doc(this.firestore, `${this.ORDERS_COLLECTION}/${orderId}`);
    return (docData(orderRef, { idField: 'id' }) as Observable<Order>).pipe(
      map(order => {
        if (!order) return undefined;
        // Verify the order belongs to the specified store
        if (order.storeId !== storeId) {
          console.error(`Order ${orderId} does not belong to store ${storeId}`);
          return undefined;
        }
        return this.mapOrderData(order);
      })
    );
  }

  /**
   * Get a single order by ID without store verification
   * @deprecated Use getOrderByStoreAndId for better security
   */
  getOrder(orderId: string): Observable<Order | undefined> {
    const orderRef = doc(this.firestore, `${this.ORDERS_COLLECTION}/${orderId}`);
    return (docData(orderRef, { idField: 'id' }) as Observable<Order>).pipe(
      map(order => {
        if (!order) return undefined;
        return this.mapOrderData(order);
      })
    );
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const orderRef = doc(this.firestore, `${this.ORDERS_COLLECTION}/${orderId}`);
    await updateDoc(orderRef, { 
      status,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Resend order confirmation
   */
  async resendOrderConfirmation(orderId: string): Promise<void> {
    // In a real app, this would trigger an email/SMS service
    // For now, we'll just log it and return a resolved promise
    console.log(`Resending confirmation for order ${orderId}`);
    return Promise.resolve();
  }

  /**
   * Helper to map Firestore data to Order
   */
  private mapOrderData(data: any): Order {
    return {
      ...data,
      createdAt: this.convertTimestamp(data.createdAt),
      updatedAt: this.convertTimestamp(data.updatedAt)
    } as Order;
  }

  /**
   * Convert Firestore Timestamp to Date string
   */
  private convertTimestamp(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Date) return timestamp.toISOString();
    if (timestamp.toDate) return timestamp.toDate().toISOString();
    return timestamp;
  }
}