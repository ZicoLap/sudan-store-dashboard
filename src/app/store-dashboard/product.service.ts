import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.models';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where } from '@angular/fire/firestore';
import { Observable, from, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private firestore: Firestore = inject(Firestore);
  private readonly productsCollection = 'products';
  
  constructor() {
    console.log('ProductService initialized');
  }

  // Get all products for a specific store
  getProducts(storeId: string): Observable<Product[]> {
    try {
      console.log('Fetching products for store:', storeId);
      const productsRef = collection(this.firestore, this.productsCollection);
      const q = query(productsRef, where('storeId', '==', storeId));
      
      return collectionData(q, { idField: 'id' }).pipe(
        map(products => {
          console.log(`Found ${products.length} products`);
          return products as Product[];
        }),
        catchError(error => {
          console.error('Error fetching products:', error);
          return of([]);
        })
      );
    } catch (error) {
      console.error('Error in getProducts:', error);
      return of([]);
    }
  }

  // Get a single product by ID
  getProductById(id: string): Observable<Product | undefined> {
    try {
      const productRef = doc(this.firestore, `${this.productsCollection}/${id}`);
      return docData(productRef, { idField: 'id' }).pipe(
        map(product => product as Product | undefined),
        catchError(error => {
          console.error(`Error fetching product ${id}:`, error);
          return of(undefined);
        })
      );
    } catch (error) {
      console.error('Error in getProductById:', error);
      return of(undefined);
    }
  }

  // Create a new product
  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const newProduct: Omit<Product, 'id'> = {
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(this.firestore, this.productsCollection), newProduct);
      console.log('Product created with ID:', docRef.id);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  // Update an existing product
  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    try {
      const updateData = {
        ...product,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(this.firestore, this.productsCollection, id), updateData);
      console.log('Product updated:', id);
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  // Delete a product
  async deleteProduct(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, this.productsCollection, id));
      console.log('Product deleted:', id);
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }
}
