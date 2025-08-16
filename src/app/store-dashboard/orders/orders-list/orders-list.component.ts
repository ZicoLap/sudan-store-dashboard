import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, Inject, ChangeDetectorRef, TrackByFunction, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, Subject, takeUntil, catchError, of, filter, map } from 'rxjs';
import { Order, OrderStatus, StrictOrder } from '../../../models/order.models';
import { OrdersService } from '../../../services/orders.service';

// Extend the Order interface to include the Firestore Timestamp type
type FirestoreTimestamp = {
  toDate: () => Date;
  // Add other Firestore Timestamp methods if needed
};

interface OrderTableItem {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  formattedTotal: string;
  status: OrderStatus;
  createdAt: Date | FirestoreTimestamp | string;
  totalItems: number;
}

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatSnackBarModule,
    ScrollingModule
  ],
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private storeId: string = '';
  
  // Orders data with caching and MatTableDataSource
  private ordersCache = new BehaviorSubject<OrderTableItem[]>([]);
  orders$: Observable<OrderTableItem[]> = this.ordersCache.asObservable();
  dataSource = new MatTableDataSource<OrderTableItem>([]);
  
  loading = false;
  error: string | null = null;
  
  // TrackBy function for better change detection
  trackByOrderId: TrackByFunction<OrderTableItem> = (index: number, order: OrderTableItem) => order.id;
  
  // Table columns - these must match the matColumnDef values in the template
  displayedColumns: string[] = ['orderNumber', 'date', 'customerName', 'totalItems', 'formattedTotal', 'status'];
  
  constructor(
    @Inject(OrdersService) private ordersService: OrdersService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}
  
  // Navigate to order details when a row is clicked
  onOrderClick(order: OrderTableItem): void {
    if (this.storeId) {
      this.router.navigate(['store', this.storeId, 'orders', order.id]);
    }
  }
  
  ngOnInit(): void {
    // Subscribe to route parameters
    this.route.parent?.parent?.paramMap.subscribe(params => {
      this.storeId = params.get('storeId') || '';
      console.log('Store ID in OrdersListComponent:', this.storeId);
      
      if (!this.storeId) {
        this.error = 'Store ID not found';
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }
      
      // Load orders when store ID is available
      this.loadOrders();
    });
  }
  
  loadOrders(forceRefresh = false): void {
    console.log('loadOrders called, storeId:', this.storeId, 'forceRefresh:', forceRefresh);
    
    if (!this.storeId) {
      console.log('No storeId available, setting error');
      this.error = 'Store ID is not available';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    
    // Return cached data if it exists and we're not forcing a refresh
    const cachedOrders = this.ordersCache.value;
    if (cachedOrders.length > 0 && !forceRefresh) {
      console.log('Using cached orders data');
      this.dataSource.data = cachedOrders;
      return;
    }
    
    console.log('Setting loading to true');
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    
    console.log('Fetching orders from service');
    this.ordersService.getOrders(this.storeId)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (orders: Order[]) => {
          console.log('Received orders:', orders);
          const mappedOrders = orders.map((order: Order) => this.mapToTableItem(order));
          this.ordersCache.next(mappedOrders);
          this.dataSource.data = mappedOrders; // Update data source
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          this.error = 'Failed to load orders. Please try again.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }
  
  private mapToTableItem(order: Order): OrderTableItem {
    // Handle date conversion more robustly
    let createdAt: Date;
    const createdAtValue = order.createdAt as any; // Type assertion to handle different types
    
    try {
      // If it's a Firestore Timestamp, convert it
      if (createdAtValue && typeof createdAtValue.toDate === 'function') {
        createdAt = createdAtValue.toDate();
      }
      // If it's already a Date, use it directly
      else if (createdAtValue instanceof Date) {
        createdAt = createdAtValue;
      }
      // If it's a string, parse it
      else if (typeof createdAtValue === 'string') {
        const parsedDate = new Date(createdAtValue);
        createdAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      }
      // Fallback to current date if all else fails
      else {
        console.warn('Invalid date format, using current date', createdAtValue);
        createdAt = new Date();
      }
    } catch (e) {
      console.error('Error parsing date, using current date', e);
      createdAt = new Date();
    }
    
    // Calculate total items by summing quantities of all items
    const totalItems = Array.isArray(order.items) 
      ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      : 0;

    return {
      id: order.id,
      orderNumber: `#${order.id.substring(0, 8).toUpperCase()}`,
      customerName: order.name || 'Guest',
      total: order.total || 0,
      formattedTotal: this.formatCurrency(order.total || 0),
      status: (order.status as OrderStatus) || 'pending',
      createdAt,
      totalItems
    };
  }
  
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  // Show success message
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}


