import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, map, catchError } from 'rxjs/operators';
import { Subject, Observable, of } from 'rxjs';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Models and Components
import { Collection } from '../../../models/collection.models';
import { CollectionCardComponent } from '../collection-card/collection-card.component';
import { CollectionFormDialogComponent } from '../collection-form-dialog/collection-form-dialog.component';
import { CollectionsService } from '../../collections.service';
import { OrdersService } from '../../orders.service';

@Component({
  selector: 'app-collections-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    CollectionCardComponent
  ],
  templateUrl: './collections-list.component.html',
  styleUrls: ['./collections-list.component.css']
})
export class CollectionsListComponent implements OnInit, OnDestroy {
  collections: Collection[] = [];
  filteredCollections$: Observable<Collection[]> = of([]);
  loading = true;
  searchControl = new FormControl('');
  storeId: string | null = null;
  
  private destroy$ = new Subject<void>();
  
  // Services
  private collectionsService = inject(CollectionsService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private ordersService = inject(OrdersService);
  
  // Collections will be loaded from Firebase

  ngOnInit(): void {
    // Get storeId from parent route parameters
    this.route.parent?.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        this.storeId = params.get('storeId');
        console.log('Store ID from route:', this.storeId); // Debug log
        if (!this.storeId) {
          this.showError('No store ID found in URL');
          return of([]);
        }
        console.log('Store ID:', this.storeId);
        const orders = this.ordersService.getOrders(this.storeId);
        console.log('Orders:', orders);
        return this.loadCollections();
      })
    ).subscribe();

    // Setup search with debounce
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.filterCollections());
  }

  private loadCollections(): Observable<Collection[]> {
    if (!this.storeId) {
      this.showError('No store selected');
      return of([]);
    }

    this.loading = true;
    
    return this.collectionsService.getCollections(this.storeId).pipe(
      takeUntil(this.destroy$),
      map(collections => {
        this.collections = collections || [];
        this.filteredCollections$ = of(this.collections);
        this.loading = false;
        return collections;
      }),
      catchError(error => {
        console.error('Error loading collections:', error);
        this.showError('Failed to load collections. Please try again.');
        this.loading = false;
        // Fallback to empty array to prevent template errors
        this.collections = [];
        this.filteredCollections$ = of([]);
        return of([]);
      })
    );
  }

  private filterCollections(): void {
    const searchTerm = (this.searchControl.value || '').toLowerCase();
    
    if (!searchTerm) {
      this.filteredCollections$ = of(this.collections);
      return;
    }
    
    this.filteredCollections$ = of(
      this.collections.filter(collection => 
        collection.name.toLowerCase().includes(searchTerm)
      )
    );
  }

  openAddCollectionDialog(): void {
    if (!this.storeId) return;

    const dialogRef = this.dialog.open(CollectionFormDialogComponent, {
      width: '500px',
      data: { storeId: this.storeId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the collections list after adding a new collection
        this.loadCollections().subscribe();
      }
    });
  }

  onEditCollection(collection: Collection): void {
    if (!this.storeId) {
      this.showError('No store selected');
      return;
    }

    const dialogRef = this.dialog.open(CollectionFormDialogComponent, {
      width: '500px',
      data: { 
        isEdit: true,
        collection: collection,
        storeId: this.storeId 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the collections list after updating a collection
        this.loadCollections().subscribe();
      }
    });
  }

  onDeleteCollection(collectionId: string): void {
    if (confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      this.loading = true;
      this.collectionsService.deleteCollection(collectionId)
        .then(() => {
          this.showSuccess('Collection deleted successfully');
          // Remove the deleted collection from the local array instead of reloading
          this.collections = this.collections.filter(c => c.id !== collectionId);
          this.filteredCollections$ = of(this.collections);
        })
        .catch(error => {
          console.error('Error deleting collection:', error);
          this.showError('Failed to delete collection. Please try again.');
        })
        .finally(() => {
          this.loading = false;
        });
    }
  }

  trackByCollectionId(index: number, collection: Collection): string {
    return collection.id;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
    this.loading = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
