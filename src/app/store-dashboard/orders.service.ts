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
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  Query,
  DocumentReference,
  getDocs,
  getDoc,
  getCountFromServer
} from '@angular/fire/firestore';
import { Observable, of, from, combineLatest } from 'rxjs';
import { map, catchError, take, switchMap } from 'rxjs/operators';
import { Order, OrderStatus, PaymentStatus } from '../models/order.models';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private firestore: Firestore = inject(Firestore);
  private readonly ORDERS_COLLECTION = 'orders';

  constructor() {
    console.log('OrdersService initialized');
    if (!this.firestore) {
      console.error('Firestore is not properly initialized!');
    } else {
      console.log('Firestore instance:', this.firestore);
      // Test the connection
      this.testFirestoreConnection();
    }
  }

  /**
   * Test Firestore connection and collection access
   * This method is public to allow components to test the connection
   */
  async testFirestoreConnection(): Promise<void> {
    try {
      console.log('Testing Firestore connection...');
      
      // Test if we can access the collection
      const collectionRef = collection(this.firestore, this.ORDERS_COLLECTION);
      console.log('Collection reference created:', collectionRef);
      
      // Try to get a count of documents (without loading all documents)
      const countQuery = query(collectionRef, limit(1));
      const snapshot = await getCountFromServer(countQuery);
      
      console.log('Successfully connected to Firestore!');
      console.log('Total documents in collection:', snapshot.data().count);
      
      // If we get here, the connection is working
      return Promise.resolve();
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Check if Firestore is initialized
   */
  private checkFirestoreInitialized(): void {
    if (!this.firestore) {
      throw new Error('Firestore is not initialized! Make sure Firebase is properly configured.');
    }
  }

  /**
   * Get all orders for a specific store with pagination
   */
  getOrders(storeId: string, status?: OrderStatus, lastDoc?: QueryDocumentSnapshot<DocumentData>): Observable<{orders: Order[], total: number, lastVisible: QueryDocumentSnapshot<DocumentData> | null}> {
    if (!storeId) {
      return new Observable(subscriber => {
        subscriber.error(new Error('storeId is required'));
      });
    }
    
    return new Observable<{orders: Order[], total: number, lastVisible: QueryDocumentSnapshot<DocumentData> | null}>(subscriber => {
      // Create a reference to the orders collection
      const collectionRef = collection(this.firestore, this.ORDERS_COLLECTION);
      
      // Create base query with required conditions
      let baseQuery = query(
        collectionRef,
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      // Apply status filter if provided
      if (status) {
        baseQuery = query(
          baseQuery,
          where('status', '==', status)
        ) as Query<DocumentData>;
      }
      
      // Apply pagination if lastDoc is provided
      if (lastDoc) {
        baseQuery = query(
          baseQuery,
          startAfter(lastDoc)
        ) as Query<DocumentData>;
      }
      
      // Subscribe to the real-time data
      const dataSubscription = collectionData<Order>(baseQuery as Query<Order>, { idField: 'id' })
        .pipe(
          catchError(error => {
            console.error('Error in orders stream:', error);
            return of([]);
          })
        )
        .subscribe(orders => {
          // Get the count for the current filters
          let countQuery = query(
            collectionRef,
            where('storeId', '==', storeId)
          );
          
          if (status) {
            countQuery = query(
              countQuery,
              where('status', '==', status)
            ) as Query<DocumentData>;
          }
          
          getCountFromServer(countQuery)
            .then(countSnapshot => {
              const total = countSnapshot.data().count;
              subscriber.next({
                orders,
                total,
                lastVisible: lastDoc || null
              });
            })
            .catch(error => {
              console.error('Error getting document count:', error);
              subscriber.error(error);
            });
        });
      
      // Return cleanup function
      return () => {
        dataSubscription.unsubscribe();
      };
    });
  }

  /**
   * Get a single order by ID
   */
  getOrder(orderId: string): Observable<Order | undefined> {
    const orderRef = doc(this.firestore, `${this.ORDERS_COLLECTION}/${orderId}`);
    return docData(orderRef, { idField: 'id' }) as Observable<Order>;
  }

  /**
   * Update order status
   */
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const orderRef = doc(this.firestore, `${this.ORDERS_COLLECTION}/${orderId}`);
    return updateDoc(orderRef, { 
      status,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Get order counts by status for a store
   */
  getOrderCounts(storeId: string): Observable<{status: OrderStatus, count: number}[]> {
    const statuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    const counts$ = statuses.map(status => 
      this.getOrderCountByStatus(storeId, status).pipe(
        map(count => ({ status, count }))
      )
    );
    
    return counts$.length > 0 ? combineLatest(counts$) : of([]);
  }

  /**
   * Get count of orders for a store, optionally filtered by status
   */
  private async getOrderCount(storeId: string, status?: OrderStatus): Promise<number> {
    try {
      let q = query(
        collection(this.firestore, this.ORDERS_COLLECTION),
        where('storeId', '==', storeId)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting order count:', error);
      // Fallback to 0 if count fails
      return 0;
    }
  }

  private getOrderCountByStatus(storeId: string, status: OrderStatus): Observable<number> {
    return new Observable(subscriber => {
      this.getOrderCount(storeId, status)
        .then(count => {
          subscriber.next(count);
          subscriber.complete();
        })
        .catch(error => {
        subscriber.error(error);
      });
    });
  }

  /**
   * Search orders by query string (searches in order ID, customer name, and phone)
   */
  searchOrders(storeId: string, queryStr: string, status?: OrderStatus): Observable<{orders: Order[], total: number, lastVisible: QueryDocumentSnapshot<DocumentData> | null}> {
    // This is a simplified search that would work for small datasets
    // For production, consider using Algolia or similar for better search capabilities
    let q = query(
      collection(this.firestore, this.ORDERS_COLLECTION),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc'),
      limit(50)
    ) as Query<DocumentData>;

    // Apply status filter if provided
    if (status) {
      q = query(q, where('status', '==', status)) as Query<DocumentData>;
    }

    return new Observable(subscriber => {
      getDocs(q).then(querySnapshot => {
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        const orders = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as Order;
        });
        
        // Filter the results based on the search term
        const searchStr = queryStr.toLowerCase();
        const filteredOrders = orders.filter(order => {
          const orderData = order as any;
          return (
            (orderData.id?.toLowerCase().includes(searchStr) ||
            orderData.customer?.name?.toLowerCase().includes(searchStr) ||
            orderData.customer?.phone?.includes(queryStr) ||
            orderData.orderNumber?.toLowerCase().includes(searchStr)) ?? false
          );
        });
        
        console.log('Search results:', {
          query: queryStr,
          totalOrders: orders.length,
          filteredOrders: filteredOrders.length,
          firstFewOrders: filteredOrders.slice(0, 3)
        });
        
        subscriber.next({
          orders: filteredOrders,
          total: filteredOrders.length,
          lastVisible
        });
        subscriber.complete();
      }).catch(error => {
        console.error('Error searching orders:', error);
        subscriber.error(error);
      });
    });
}}