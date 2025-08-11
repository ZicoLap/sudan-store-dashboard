import { inject, Injectable } from '@angular/core';
import { collection, collectionData, doc, docData, Firestore, query, where } from '@angular/fire/firestore'; // import needed Firestore methods
import { Observable, of, switchMap } from 'rxjs';
import { Store } from './store.model';
import { Auth, user } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  getUserStores(): Observable<Store[]> {
    return user(this.auth).pipe(
      switchMap((user) => {
        if (!user) {
          return of([]);
        }
        const storesRef = collection(this.firestore, 'stores');
        const q = query(storesRef, where('storeOwnerId', '==', user.uid));
        return collectionData(q, { idField: 'id' }) as Observable<Store[]>;
      })
    );
  }

  getStoreById(storeId: string): Observable<Store | undefined> {
    if (!storeId) {
      return of(undefined);
    }
    const storeDocRef = doc(this.firestore, `stores/${storeId}`);
    return docData(storeDocRef, { idField: 'id' }) as Observable<Store | undefined>;
  }
}
