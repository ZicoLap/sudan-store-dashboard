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
  getDocs,
  getCountFromServer
} from '@angular/fire/firestore';
import { Observable, map, from, combineLatest, of } from 'rxjs';
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
    console.log('\n--- getOrders called ---');
    console.log('storeId:', storeId, '(type:', typeof storeId, ')');
    console.log('status filter:', status || 'none');
    console.log('has lastDoc:', !!lastDoc);
    
    if (!storeId) {
      console.error('ERROR: storeId is required but was not provided');
      return new Observable(subscriber => {
        subscriber.error(new Error('storeId is required'));
      });
    }
    
    try {
      // Log Firestore instance for debugging
      console.log('Firestore instance available:', !!this.firestore);
      
      // First, let's check if the collection exists and has any documents
      const collectionRef = collection(this.firestore, this.ORDERS_COLLECTION);
      
      // Create base query with required conditions
      console.log('Creating base query with storeId:', storeId);
      const baseQuery = query(
        collectionRef,
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc')
      );
      
      console.log('Base query created, checking if collection has any documents...');
      
      // Log all documents in the collection for debugging
      console.log('Fetching all orders to debug...');
      getDocs(collectionRef).then(snapshot => {
        console.log('--- ALL DOCUMENTS IN ORDERS COLLECTION ---');
        if (snapshot.empty) {
          console.log('No documents in the orders collection!');
        } else {
          snapshot.forEach(doc => {
            console.log('Document ID:', doc.id);
            console.log('Document data:', doc.data());
            console.log('storeId in document:', doc.data()['storeId']);
            console.log('----------------------------------');
          });
        }
        
        // Now get documents for the specific store
        const storeQuery = query(collectionRef, where('storeId', '==', storeId));
        return getDocs(storeQuery);
      }).then(storeSnapshot => {
        console.log(`\n--- DOCUMENTS FOR STORE ${storeId} ---`);
        if (storeSnapshot.empty) {
          console.log(`No documents found for storeId: ${storeId}`);
          console.log('This could be because:');
          console.log(`1. The store with ID ${storeId} has no orders`);
          console.log('2. The store ID in the URL does not match the storeId in the documents');
          console.log('3. There might be a typo in the store ID');
        } else {
          storeSnapshot.forEach(doc => {
            console.log('Document ID:', doc.id);
            console.log('Document data:', doc.data());
            console.log('----------------------------------');
          });
        }
      }).catch(err => {
        console.error('Error fetching documents:', err);
      });
      
      // Apply status filter if provided
      let filteredQuery = baseQuery;
      if (status) {
        filteredQuery = query(
          baseQuery,
          where('status', '==', status)
        );
        console.log('Applied status filter:', status);
      }
      
      // Apply pagination if lastDoc is provided
      let paginatedQuery = filteredQuery;
      if (lastDoc) {
        paginatedQuery = query(
          filteredQuery,
          startAfter(lastDoc),
          limit(10)
        );
        console.log('Applied pagination with startAfter');
      } else {
        // Only apply limit if not using pagination with lastDoc
        paginatedQuery = query(filteredQuery, limit(10));
        console.log('Applied initial limit of 10');
      }
      
      console.log('Final query constructed, executing...');

      return new Observable(subscriber => {
        console.log('\n--- Executing Firestore query ---');
        
        // First, get the count for the filtered query (without pagination)
        console.log('Getting total count for current filters...');
        getCountFromServer(filteredQuery).then(countSnapshot => {
          const total = countSnapshot.data().count;
          console.log('Total matching documents:', total);
          
          // Now get the paginated results
          console.log('Fetching paginated results...');
          getDocs(paginatedQuery).then(querySnapshot => {
            console.log('Query completed. Documents found:', querySnapshot.docs.length);
            
            // Get the last document for pagination
            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
            
            // Map documents to Order objects
            const orders = querySnapshot.docs.map(doc => {
              const data = doc.data();
              console.log('Document data:', { 
                id: doc.id, 
                status: data['status'],
                storeId: data['storeId'],
                createdAt: data['createdAt']?.toDate() || 'No date',
                total: data['total']
              });
              
              return {
                id: doc.id,
                ...data
              } as Order;
            });
            
            console.log(`Returning ${orders.length} orders with total ${total}`);
            subscriber.next({ 
              orders, 
              total, 
              lastVisible 
            });
            subscriber.complete();
            
          }).catch(error => {
            console.error('Error in getDocs:', error);
            subscriber.error(error);
          });
          
        }).catch(error => {
          console.error('Error getting document count:', error);
          // If we can't get the count, just return the documents we have
          getDocs(paginatedQuery).then(querySnapshot => {
            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
            const orders = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Order));
            
            console.warn('Using fallback count (may be inaccurate)');
            subscriber.next({ 
              orders, 
              total: orders.length, 
              lastVisible 
            });
            subscriber.complete();
          }).catch(e => {
            console.error('Fallback query also failed:', e);
            subscriber.error(e);
          });
        });
      });
      
    } catch (error) {
      console.error('Error in getOrders:', error);
      return new Observable(subscriber => {
        subscriber.error(error);
      });
    }
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
/*   searchOrders(storeId: string, queryStr: string, status?: OrderStatus): Observable<{orders: Order[], total: number, lastVisible: QueryDocumentSnapshot<DocumentData> | null}> {
    // This is a simplified search that would work for small datasets
    // For production, consider using Algolia or similar for better search capabilities
    let q = query(
      collection(this.firestore, this.ORDERS_COLLECTION),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (status) {
      q = query(q, where('status', '==', status));
    }

    return new Observable(subscriber => {
      getDocs(q).then(querySnapshot => {
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        const orders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        
        // Filter the results based on the search term
        const searchStr = queryStr.toLowerCase();
        const filteredOrders = orders.filter(order => 
          (order.id?.toLowerCase().includes(searchStr) ||
          order.name?.toLowerCase().includes(searchStr) ||
          order.phone?.includes(queryStr)) ?? false
        );
        
        subscriber.next({
          orders: filteredOrders,
          total: filteredOrders.length,
          lastVisible
        });
        subscriber.complete();
      }).catch(error => {
        subscriber.error(error);
      });
    });
  } */

    searchOrders(storeId: string, queryStr: string, status?: OrderStatus): Observable<{orders: Order[], total: number, lastVisible: QueryDocumentSnapshot<DocumentData> | null}> {
        // This is a simplified search that would work for small datasets
        // For production, consider using Algolia or similar for better search capabilities
        let q = query(
          collection(this.firestore, this.ORDERS_COLLECTION),
          where('storeId', '==', storeId),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      
        if (status) {
          q = query(q, where('status', '==', status));
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
            console.error('Error in searchOrders:', error);
            subscriber.error(error);
          });
        });
      }
}
