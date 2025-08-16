import { Injectable } from '@angular/core';
import { Firestore, doc, collection, query, where, limit, getDocs, updateDoc, docData } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Store } from '../store/store.model';
import { BehaviorSubject, from, lastValueFrom, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class StoreSettingsService {
  private storeSubject = new BehaviorSubject<Store | null>(null);
  store$ = this.storeSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private authService: AuthService
  ) {
    this.loadStore();
  }

  /** Load store for the logged-in owner */
  private loadStore(): void {
    this.authService.user$.pipe(
      switchMap(user => {
        if (!user?.uid) return of(null);
        const storesRef = collection(this.firestore, 'stores');
        const q = query(storesRef, where('storeOwnerId', '==', user.uid), limit(1));
        return from(getDocs(q)).pipe(
          switchMap(snapshot => {
            const store = snapshot.docs[0]?.data() as Store;
            if (store) store.id = snapshot.docs[0].id;
            this.storeSubject.next(store || null);
            return of(store || null);
          })
        );
      })
    ).subscribe();
  }

  /** Get the current store as observable */
  getStore(): Observable<Store | null> {
    return this.store$;
  }

  /** Generic store update */
  updateStore(storeData: Partial<Store>): Observable<void> {
    const store = this.storeSubject.value;
    if (!store?.id) return of(undefined);
    const storeRef = doc(this.firestore, `stores/${store.id}`);
    const updatedStore = { ...store, ...storeData, updatedAt: new Date().toISOString() };
    return from(updateDoc(storeRef, updatedStore)).pipe(
      tap(() => this.storeSubject.next(updatedStore as Store))
    );
  }

  // === File uploads ===
  async uploadCoverImage(file: File): Promise<string> {
    const store = this.storeSubject.value;
    if (!store?.id) return '';
    const storageRef = ref(this.storage, `stores/covers/${store.id}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await lastValueFrom(this.updateStore({ coverImageUrl: url }));
    return url;
  }

  async uploadLogo(file: File): Promise<string> {
    const store = this.storeSubject.value;
    if (!store?.id) throw new Error('Store not loaded');
  
    const storageRef = ref(this.storage, `stores/logo/${store.id}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await lastValueFrom(this.updateStore({ logoUrl: url }));
    return url;
  }

  // === Helpers ===
  updateContactInfo(contactInfo: { email: string; phoneNumber: string }) {
    this.updateStore(contactInfo).subscribe();
  }

  updateAddress(address: Store['address']) {
    this.updateStore({ address }).subscribe();
  }

  updateDeliverySettings(settings: {
    deliveryPricing: { fee: number; maxWeight: number }[];
    freeDeliveryOver?: number;
    minimumOrderAmount?: number;
  }) {
    this.updateStore(settings).subscribe();
  }

  updateStoreStatus(isOpen: boolean) {
    this.updateStore({ isOpen }).subscribe();
  }

  updateStoreNameAndDescription(data: { name: string; description: string }) {
    this.updateStore(data).subscribe();
  }

  updateCategoriesAndTags(data: { categoryIds: string[]; tags: string[] }) {
    this.updateStore(data).subscribe();
  }

  updateStoreType(storeTypes: string[]) {
    this.updateStore({ storeTypes }).subscribe();
  }

  updateLogo(logoUrl: string) {
    this.updateStore({ logoUrl }).subscribe();
  }

  updateCoverImage(coverImageUrl: string) {
    this.updateStore({ coverImageUrl }).subscribe();
  }

  activateStore() {
    this.updateStore({ isActive: true }).subscribe();
  }

  deactivateStore() {
    this.updateStore({ isActive: false }).subscribe();
  }

  featureStore() {
    this.updateStore({ isFeatured: true }).subscribe();
  }

  unfeatureStore() {
    this.updateStore({ isFeatured: false }).subscribe();
  }
}
