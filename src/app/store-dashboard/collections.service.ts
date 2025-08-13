import { Injectable, inject } from '@angular/core';
import { Collection } from '../models/collection.models';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CollectionsService {
  private firestore: Firestore = inject(Firestore);
  private readonly collectionsCollection = 'collections';
  
  constructor() {
    console.log('CollectionsService initialized');
  }

  // Get all collections for a specific store
  getCollections(storeId: string): Observable<Collection[]> {
    try {
      console.log('Fetching collections for store:', storeId);
      const collectionsRef = collection(this.firestore, this.collectionsCollection);
      const q = query(collectionsRef, where('storeId', '==', storeId));
      
      return collectionData(q, { idField: 'id' }).pipe(
        map(collections => {
          console.log(`Found ${collections.length} collections`);
          // Convert Firestore Timestamp to JavaScript Date and sort by creation date (newest first)
          return (collections as any[]).map(collection => ({
            ...collection,
            // Convert Firestore Timestamp to JavaScript Date
            createdAt: collection.createdAt?.toDate ? collection.createdAt.toDate() : new Date(collection.createdAt)
          } as Collection)).sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }),
        catchError(error => {
          console.error('Error fetching collections:', error);
          return of([]);
        })
      );
    } catch (error) {
      console.error('Error in getCollections:', error);
      return of([]);
    }
  }

  // Get a single collection by ID
  getCollectionById(id: string): Observable<Collection | undefined> {
    try {
      const collectionRef = doc(this.firestore, `${this.collectionsCollection}/${id}`);
      return docData(collectionRef, { idField: 'id' }).pipe(
        map(collection => {
          if (!collection) return undefined;
          // Convert Firestore Timestamp to JavaScript Date
          return {
            ...collection,
            createdAt: (collection as any).createdAt?.toDate ? 
              (collection as any).createdAt.toDate() : 
              new Date((collection as any).createdAt)
          } as Collection;
        }),
        catchError(error => {
          console.error(`Error fetching collection ${id}:`, error);
          return of(undefined);
        })
      );
    } catch (error) {
      console.error('Error in getCollectionById:', error);
      return of(undefined);
    }
  }

  // Add a new collection
  addCollection(collectionData: Omit<Collection, 'id' | 'createdAt'>): Promise<string> {
    try {
      const collectionsRef = collection(this.firestore, this.collectionsCollection);
      const newCollection = {
        ...collectionData,
        createdAt: serverTimestamp()
      };
      
      return addDoc(collectionsRef, newCollection)
        .then(docRef => {
          console.log('Collection added with ID:', docRef.id);
          return docRef.id;
        });
    } catch (error) {
      console.error('Error adding collection:', error);
      return Promise.reject(error);
    }
  }

  // Update an existing collection
  updateCollection(id: string, data: Partial<Omit<Collection, 'id' | 'storeId' | 'createdAt'>>): Promise<void> {
    try {
      const collectionRef = doc(this.firestore, `${this.collectionsCollection}/${id}`);
      return updateDoc(collectionRef, data);
    } catch (error) {
      console.error(`Error updating collection ${id}:`, error);
      return Promise.reject(error);
    }
  }

  // Delete a collection
  deleteCollection(id: string): Promise<void> {
    try {
      const collectionRef = doc(this.firestore, `${this.collectionsCollection}/${id}`);
      return deleteDoc(collectionRef);
    } catch (error) {
      console.error(`Error deleting collection ${id}:`, error);
      return Promise.reject(error);
    }
  }

  // Helper method to get collections by store ID
  getCollectionsByStoreId(storeId: string): Observable<Collection[]> {
    return this.getCollections(storeId);
  }
}
