import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, switchMap, catchError, of, startWith, combineLatest, map, Observable } from 'rxjs';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

// Material Modules
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

// Services and Models
import { OrdersService } from '../../orders.service';
import { Order, OrderStatus, StrictOrder } from '../../../models/order.models';
import { PipesModule } from '../../../shared/pipes/pipes.module';

// Tab type definition
const TAB_TYPES = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
type TabType = typeof TAB_TYPES[number];

interface OrderCount {
  status: OrderStatus;
  count: number;
}

// Interface for the order customer
interface OrderCustomer {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

// Interface for order items
interface OrderItem {
  id?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

// Extend Order with additional properties for the table
type OrderTableItem = Omit<Order, 'status' | 'customer' | 'items' | 'createdAt' | 'updatedAt'> & {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customer: OrderCustomer;
  items: OrderItem[];
  total: number;
  createdAt: Date | any;
  updatedAt: Date | any;
  // Additional properties for the table
  customerName: string;
  totalItems: number;
  formattedTotal: string;
  // Make all other properties optional
  [key: string]: any;
};

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatTabsModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonToggleModule,
    PipesModule
  ],
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.css'],
})
export class OrdersListComponent implements OnInit, OnDestroy, AfterViewInit {
  // Services are now properly injected via constructor

  constructor(
    private ordersService: OrdersService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    // Initialize form group in constructor to avoid initialization order issues
    this.searchForm = this.fb.group({
      searchTerm: this.searchControl,
      status: this.statusFilter,
      startDate: this.startDate,
      endDate: this.endDate
    });

    console.log('OrdersListComponent constructor called');
  }


  private destroy$ = new Subject<void>();

  // View Children
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Table Configuration
  displayedColumns: string[] = [
    'orderNumber',
    'date',
    'customer',
    'items',
    'total',
    'status',
    'actions'
  ];

  // Data
  orders: OrderTableItem[] = []; // Fixing the orders array initialization
  loading = true;
  error: string | null = null;
  activeTab: TabType = 'all';

  // Tabs configuration - using readonly array for type safety
  tabs: ReadonlyArray<{ id: TabType; label: string; count: number }> = [
    { id: 'all', label: 'All', count: 0 },
    { id: 'pending', label: 'Pending', count: 0 },
    { id: 'processing', label: 'Processing', count: 0 },
    { id: 'shipped', label: 'Shipped', count: 0 },
    { id: 'delivered', label: 'Delivered', count: 0 },
    { id: 'cancelled', label: 'Cancelled', count: 0 }
  ];

  // Store ID from route
  storeId: string = '';

  // UI State
  showFilters = false;

  // Form Controls
  searchControl = new FormControl('');
  statusFilter = new FormControl<TabType>('all');
  startDate = new FormControl<Date | null>(null);
  endDate = new FormControl<Date | null>(null);

  // Form Group for filters
  searchForm: FormGroup;

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  total = 0;
  lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;


  

  async testFirestoreConnection() {
    try {
      console.log('Testing Firestore connection from component...');
      await this.ordersService.testFirestoreConnection();

      // If we get here, the connection is working
      console.log('Firestore connection test successful!');

      // Now try to get order counts to see if we can query the collection
      console.log('Testing order counts...');
      const storeId = this.route.snapshot.paramMap.get('storeId');
      if (storeId) {
        const counts = await this.ordersService.getOrderCounts(storeId).toPromise();
        console.log('Order counts:', counts);

        // If we have counts, log the total
        if (counts && counts.length > 0) {
          const totalOrders = counts.reduce((sum, item) => sum + (item?.count || 0), 0);
          console.log(`Total orders in database: ${totalOrders}`);

          if (totalOrders === 0) {
            console.warn('No orders found in the database. This might be expected if no orders have been placed yet.');
          }
        }
      }
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      this.error = 'Failed to connect to the database. Please check your internet connection and try again.';
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async ngOnInit() {
    console.log('🚀 ngOnInit() - Starting component initialization');
    try {
      console.log('🔍 Checking storeId...');
      
      // Get the store ID from the route, handling potential null values
      const routeStoreId = this.route.snapshot.paramMap.get('storeId');
      console.log('📌 Store ID from route params:', routeStoreId);
      
      // If not in params, try parent params
      const parentStoreId = this.route.parent?.snapshot.paramMap.get('storeId');
      console.log('🔍 Store ID from parent route params:', parentStoreId);
      
      // Set storeId with a type-safe approach
      this.storeId = routeStoreId || parentStoreId || '';
      
      if (!this.storeId) {
        const errorMsg = '❌ No store ID found in route';
        console.error(errorMsg);
        this.error = errorMsg;
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }
      
      console.log('✅ Using storeId:', this.storeId);

      // First, test the Firestore connection
      console.log('Initializing component, testing Firestore connection...');
      await this.testFirestoreConnection();

      // Set up search form value changes
      this.searchForm.valueChanges.pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.pageIndex = 0; // Reset to first page when filters change
        this.loadOrders();
      });

      // Load initial data
      console.log('Loading initial orders...');
      await this.loadOrders();

      // Load order counts for the tabs
      this.loadOrderCounts();
    } catch (error) {
      console.error('Error initializing component:', error);
      this.error = 'Failed to initialize. Please refresh the page and try again.';
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit called');

    // Ensure the component is still active
    if (this.destroy$.isStopped) {
      console.log('Component is being destroyed, skipping paginator setup');
      return;
    }

    // Handle pagination changes
    if (this.paginator) {
      console.log('Setting up paginator subscription');

      // Unsubscribe from any existing subscriptions to prevent memory leaks
      this.destroy$.next();

      this.paginator.page
        .pipe(
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (pageEvent: PageEvent) => {
            console.log('Paginator page event:', pageEvent);
            this.onPageChange(pageEvent);
          },
          error: (error) => {
            console.error('Error in paginator subscription:', error);
          },
          complete: () => {
            console.log('Paginator subscription completed');
          }
        });
    } else {
      console.warn('Paginator not found in the view');
    }

    // Force a change detection cycle to ensure the view is updated
    this.cdr.detectChanges();
  }

  private loadOrderCounts(): void {
    // Get storeId from route params
    const storeId = this.route.snapshot.paramMap.get('storeId');
    if (!storeId) {
      console.error('No storeId found in route');
      return;
    }

    this.ordersService.getOrderCounts(storeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (counts: OrderCount[]) => {
          this.tabs = this.tabs.map(tab => {
            if (tab.id === 'all') {
              return { ...tab, count: counts.reduce((sum, item) => sum + (item?.count || 0), 0) };
            }
            const count = counts.find(c => c?.status === tab.id)?.count || 0;
            return { ...tab, count };
          });
        },
        error: (error: any) => {
          console.error('Error loading order counts:', error);
          this.showError('Failed to load order counts');
        }
      });
  }


  private setupFilters(): void {
    // Combine all filter changes
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith('')),
      this.statusFilter.valueChanges.pipe(startWith('all')),
      this.startDate.valueChanges.pipe(startWith<Date | null>(null)),
      this.endDate.valueChanges.pipe(startWith<Date | null>(null))
    ]).pipe(
      debounceTime(300), // Debounce to avoid too many requests
      takeUntil(this.destroy$)
    ).subscribe(([searchTerm, status, startDate, endDate]) => {
      this.pageIndex = 0; // Reset to first page on filter change
      this.lastVisible = null; // Reset pagination
      this.loadOrders();
    });
  }

  private convertToTableItem(order: Order): OrderTableItem {
    console.log('\n--- Converting order to table item ---');
    console.log('Original order:', order);

    // Ensure all required fields have default values
    const orderId = order.id || '';
    const orderNumber = (order as any).orderNumber || `#${orderId.substring(0, 8) || 'N/A'}`;
    const customer = (order as any).customer || {};
    const items = (order as any).items || [];
    const total = (order as any).total || 0;
    const status = ((order as any).status as OrderStatus) || 'pending';

    // Log the extracted values
    console.log('Extracted values:', {
      orderId,
      orderNumber,
      customer,
      itemsCount: items.length,
      total,
      status
    });

    const tableItem = {
      ...order,
      id: orderId,
      orderNumber,
      status,
      customer,
      items,
      total,
      customerName: customer?.name || 'Unknown',
      totalItems: items.reduce((sum: number, item: any) => {
        const quantity = item?.quantity || 0;
        console.log(`Item: ${item?.name}, Quantity: ${quantity}`);
        return sum + quantity;
      }, 0),
      formattedTotal: `$${total.toFixed(2)}`,
      createdAt: (order as any).createdAt || new Date(),
      updatedAt: (order as any).updatedAt || new Date()
    };

    console.log('Converted table item:', tableItem);
    return tableItem;
  }

  // Make loadOrders public to be accessible from template
  async loadOrders(): Promise<void> {
    console.log('\n--- loadOrders called ---');
    console.log('storeId:', this.storeId);
    console.log('loading state:', this.loading);

    // Initialize orders as empty array if undefined
    if (!this.orders) {
      this.orders = [];
    }

    console.log('current orders length:', this.orders.length);

    // Reset loading state
    this.loading = true;
    this.error = null;
    this.orders = []; // Clear current orders
    this.cdr.detectChanges();

    if (!this.storeId) {
      const errorMsg = 'No store ID available';
      console.error('Error:', errorMsg);
      this.error = errorMsg;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    console.log('Loading orders for store:', this.storeId);

    const status = this.statusFilter.value === 'all' ? undefined : this.statusFilter.value as OrderStatus;
    const searchTerm = this.searchControl.value || '';

    console.log('Using filters - status:', status, 'searchTerm:', searchTerm);
    console.log('Page:', this.pageIndex + 1, 'Page size:', this.pageSize);
    console.log('Last visible doc exists:', !!this.lastVisible);

    try {
      console.log('Determining which service method to use...');

      // Add a small delay to ensure UI updates are shown
      await new Promise(resolve => setTimeout(resolve, 100));

      // Determine which service method to use based on whether we're searching
      const orders$ = searchTerm
        ? this.ordersService.searchOrders(this.storeId, searchTerm, status)
        : this.ordersService.getOrders(
          this.storeId,
          status,
          this.pageIndex > 0 && this.lastVisible ? this.lastVisible : undefined
        );

      console.log('Subscribing to orders observable...');

      // Unsubscribe from any existing subscriptions
      this.destroy$.next();

      // Create a promise to handle the observable
      return new Promise<void>((resolve) => {
        const subscription = orders$.pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (result: { orders: Order[]; total: number; lastVisible: QueryDocumentSnapshot<DocumentData> | null; }) => {
            console.log('\n--- Received orders data ---');
            console.log('Raw orders from service:', result.orders);
            console.log('Orders count:', result.orders?.length);
            console.log('Total count:', result.total);
            console.log('Has lastVisible:', !!result.lastVisible);

            // Update pagination state
            if (result.lastVisible) {
              this.lastVisible = result.lastVisible;
              console.log('Updated lastVisible document');
            }

            // Convert orders to table items
            const tableItems = (result.orders || []).map(order => this.convertToTableItem(order));
            console.log('Converted table items:', tableItems);

            // Update component state
            this.orders = tableItems;
            this.total = result.total || 0;

            console.log('Final orders array:', this.orders);
            console.log('Total orders:', this.total);
            console.log('Last visible:', this.lastVisible);

            // Inside the loadOrders method, add this after the orders$ is defined
            console.log('Orders observable created with params:', {
              storeId: this.storeId,
              status: status || 'all',
              searchTerm: searchTerm || 'none',
              page: this.pageIndex + 1,
              pageSize: this.pageSize
            });

            this.loading = false;
            console.log('Loading complete. Orders loaded:', this.orders.length);
            this.cdr.detectChanges();
            resolve();
          },
          error: (error: Error) => {
            console.error('\n--- Error loading orders ---');
            console.error('Error details:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);

            this.error = 'Failed to load orders. Please try again.';
            this.loading = false;
            this.cdr.detectChanges();
            resolve();
          },
          complete: () => {
            console.log('Orders subscription completed');
          }
        });

        // Add subscription to destroy$ to ensure cleanup
        this.destroy$.subscribe(() => {
          subscription.unsubscribe();
        });
      });


    } catch (error) {
      console.error('\n--- Exception in loadOrders ---');
      console.error('Error:', error);

      this.error = 'An error occurred while loading orders.';
      this.loading = false;
      this.cdr.detectChanges();
      return Promise.resolve();
    }
  }

  onPageChange(event: PageEvent): void {
    console.log('\n--- Page changed ---');
    console.log('Previous page index:', event.previousPageIndex);
    console.log('New page index:', event.pageIndex);
    console.log('Page size:', event.pageSize);

    const previousPageSize = this.pageSize;
    this.pageSize = event.pageSize;

    // If page size changes, reset to first page and clear pagination state
    if (event.previousPageIndex !== undefined && event.pageSize !== previousPageSize) {
      console.log('Page size changed, resetting to first page');
      this.pageIndex = 0;
      this.lastVisible = null;
    } else {
      this.pageIndex = event.pageIndex;
    }

    console.log('Loading page', this.pageIndex + 1, 'with', this.pageSize, 'items per page');

    // Reload orders with new pagination
    this.loadOrders();
  }

  onTabChange(event: MatTabChangeEvent): void {
    const selectedTab = this.tabs[event.index];
    this.statusFilter.setValue(selectedTab.id);
  }

  // Toggle filters visibility
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // View order details
  viewOrder(orderId: string): void {
    this.router.navigate(['order', orderId], { relativeTo: this.route });
  }

  // Update order status
  updateOrderStatus(orderId: string, status: OrderStatus): void {
    this.ordersService.updateOrderStatus(orderId, status)
      .then(() => {
        // Update the local order status and refresh the list
        this.showSuccess(`Order status updated to ${status}`);
        this.loadOrders();
      })
      .catch(error => {
        this.showError('Failed to update order status');
        console.error('Error updating order status:', error);
      });
  }

  // Check if any filters are active
  hasActiveFilters(): boolean {
    return (
      !!this.searchControl.value ||
      this.statusFilter.value !== 'all' ||
      !!this.startDate.value ||
      !!this.endDate.value
    );
  }

  // Show success message
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  trackByOrderId(index: number, order: Order): string {
    return order.id;
  }

  // Check if an order is new (created in the last 24 hours)
  isOrderNew(createdAt: Date | any): boolean {
    if (!createdAt) return false;
    const orderDate = createdAt instanceof Date ? createdAt : createdAt.toDate();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return orderDate > oneDayAgo;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Helper method to show error messages
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Helper method to refresh orders
  private refreshOrders(): void {
    this.pageIndex = 0;
    this.lastVisible = null;
    this.loadOrders();
  }
}


