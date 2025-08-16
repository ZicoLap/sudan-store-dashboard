import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { OrdersService } from '../../orders.service';
import { CommonModule, CurrencyPipe, DatePipe, SlicePipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router, ParamMap } from '@angular/router';
import { combineLatest, of, Observable } from 'rxjs';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

// Models
import { Order, OrderStatus, StrictOrder, PaymentStatus, PaymentMethod } from '../../../models/order.models';
import { CartItem } from '../../../models/cartitem.models';

// Interface for table order items
type TableOrderItem = CartItem & {
  id: string; // Matches the productId from CartItem
};

// Interface for status steps in timeline
interface StatusStep {
  status: OrderStatus;
  label: string;
  icon: string;
  color: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isActive: boolean;
  date: string | null;
}

// Type assertion for OrderStatus to include all possible values
type ExtendedOrderStatus = OrderStatus | 'processing' | 'completed';

@Component({
  selector: 'app-order-view',
  standalone: true,
  templateUrl: './order-view.component.html',
  styleUrls: ['./order-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    CurrencyPipe,
    DatePipe,
    SlicePipe,
    TitleCasePipe,
    UpperCasePipe
  ]
})
export class OrderViewComponent implements OnInit, OnDestroy {
  // Table data
  dataSource = new MatTableDataSource<TableOrderItem>([]);
  displayedColumns: string[] = ['product', 'weight', 'price', 'quantity', 'total'];
  tableOrderItems: TableOrderItem[] = [];
  
  // Form controls
  statusControl = new FormControl<OrderStatus>('pending');
  
  // State
  loading = false;
  error: string | null = null;
  order: StrictOrder | null = null;
  statusUpdateLoading = false;
  statusSteps: StatusStep[] = [];
  
  // Make storeId and orderId public for template access
  storeId: string = '';
  orderId: string = '';
  
  // Private
  private destroy$ = new Subject<void>();
  private orderSubscription: Subscription | null = null;

  constructor(
    private ordersService: OrdersService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get the parent route (orders) and its parent (store/:storeId)
    const parentRoute = this.route.parent;
    const storeRoute = parentRoute?.parent;

    if (!storeRoute) {
      this.error = 'Invalid route configuration: Could not find store ID';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // Combine store ID from the store route with order ID from current route
    combineLatest([
      storeRoute.paramMap,
      this.route.paramMap
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([storeParams, orderParams]) => {
      const storeId = storeParams.get('storeId') || '';
      const orderId = orderParams.get('orderId') || '';
      
      console.log('Store ID:', storeId);
      console.log('Order ID:', orderId);
      
      if (storeId && orderId && (storeId !== this.storeId || orderId !== this.orderId)) {
        this.storeId = storeId;
        this.orderId = orderId;
        this.loadOrder(storeId, orderId);
      } else if (!storeId || !orderId) {
        this.error = 'Store ID or Order ID is missing';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.orderSubscription?.unsubscribe();
  }

  loadOrder(storeId: string, orderId: string): void {
    if (!storeId || !orderId) {
      this.error = 'Store ID and Order ID are required';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.storeId = storeId;
    this.orderId = orderId;
    this.cdr.markForCheck();
    
    this.orderSubscription?.unsubscribe();
    
    this.orderSubscription = this.ordersService.getOrderByStoreAndId(storeId, orderId).subscribe({
      next: (order: Order | undefined) => {
        if (!order) {
          this.error = 'Order not found or does not belong to this store';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        
        // Create a properly typed StrictOrder with all required fields
        const strictOrder: StrictOrder = {
          ...order,
          status: this.getValidOrderStatus(order.status),
          paymentStatus: this.getValidPaymentStatus(order.paymentStatus),
          paymentMethod: this.getValidPaymentMethod(order.paymentMethod),
          items: order.items || [],
          address: order.address || { street: '', city: '', postalCode: '', country: '' },
          name: order.name || '',
          phone: order.phone || '',
          orderNote: order.orderNote || '',
          createdAt: order.createdAt || new Date().toISOString(),
          updatedAt: order.updatedAt || new Date().toISOString(),
          subtotal: order.subtotal || 0,
          deliveryFee: order.deliveryFee || 0,
          total: order.total || 0,
          totalWeight: order.totalWeight || 0
        };
        
        this.order = strictOrder;
        this.initializeStatusSteps(strictOrder.status);
        this.initializeOrderItems(strictOrder.items);
        this.statusControl.setValue(strictOrder.status, { emitEvent: false });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Error loading order:', err);
        this.error = 'Failed to load order details';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private initializeOrderItems(items: CartItem[]): void {
    if (!items || !Array.isArray(items)) {
      console.error('Invalid items array:', items);
      this.dataSource.data = [];
      this.tableOrderItems = [];
      return;
    }
    
    this.tableOrderItems = items.map(item => ({
      ...item,
      id: item.productId
    }));
    
    this.dataSource.data = [...this.tableOrderItems];
  }

  private getValidOrderStatus(status: string): OrderStatus {
    const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    return validStatuses.includes(status as OrderStatus) ? status as OrderStatus : 'pending';
  }

  private getValidPaymentStatus(status: string): PaymentStatus {
    const validStatuses: PaymentStatus[] = ['paid', 'failed', 'pending', 'refunded'];
    return validStatuses.includes(status as PaymentStatus) ? status as PaymentStatus : 'pending';
  }

  private getValidPaymentMethod(method: string): PaymentMethod {
    const validMethods: PaymentMethod[] = ['stripe', 'cash', 'card', 'mobile_money'];
    return validMethods.includes(method as PaymentMethod) ? method as PaymentMethod : 'cash';
  }

  private initializeStatusSteps(status: OrderStatus): void {
    const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(status);
    
    this.statusSteps = statusOrder.map((stepStatus, index) => ({
      status: stepStatus,
      label: this.getStatusLabel(stepStatus),
      icon: this.getStatusIcon(stepStatus),
      color: this.getStatusColor(stepStatus),
      isCompleted: index < currentStatusIndex,
      isCurrent: index === currentStatusIndex,
      isActive: index <= currentStatusIndex,
      date: this.order?.updatedAt || null
    }));
  }

  getStatusLabel(status: OrderStatus | string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'processing': return 'Processing';
      case 'ready': return 'Ready for Pickup';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  getStatusIcon(status: OrderStatus | string): string {
    const icons: Record<string, string> = {
      pending: 'schedule',
      confirmed: 'check_circle',
      processing: 'autorenew',
      ready: 'local_shipping',
      completed: 'done_all',
      cancelled: 'cancel'
    };
    return icons[status] || 'help';
  }

  getStatusColor(status: OrderStatus | string): string {
    switch (status) {
      case 'pending': return 'accent';
      case 'confirmed': return 'primary';
      case 'processing': return 'accent';
      case 'ready': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'warn';
      default: return '';
    }
  }

  getNextStatuses(): OrderStatus[] {
    if (!this.order) return [];
    
    const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
    const currentIndex = statusFlow.indexOf(this.order.status);
    
    if (currentIndex === -1) return [];
    
    // Return all next possible statuses
    return statusFlow.slice(currentIndex + 1);
  }
  
  onStatusChange(newStatus: OrderStatus): void {
    if (!this.order || this.statusUpdateLoading) return;
    
    this.statusUpdateLoading = true;
    this.ordersService.updateOrderStatus(this.orderId, newStatus)
      .then(() => {
        if (this.order) {
          this.order.status = newStatus;
          this.initializeStatusSteps(newStatus);
          this.snackBar.open(`Order status updated to ${newStatus}`, 'Close', { duration: 3000 });
        }
      })
      .catch((error: any) => {
        console.error('Error updating order status:', error);
        this.snackBar.open('Failed to update order status', 'Close', { duration: 3000 });
      })
      .finally(() => {
        this.statusUpdateLoading = false;
        this.cdr.markForCheck();
      });
  }
  
  updateOrderStatus(newStatus: OrderStatus): void {
    if (!this.order || !this.orderId) return;
    
    this.statusUpdateLoading = true;
    this.ordersService.updateOrderStatus(this.orderId, newStatus)
      .then(() => {
        if (this.order) {
          this.order.status = newStatus;
          this.initializeStatusSteps(newStatus);
          this.snackBar.open(`Order status updated to ${newStatus}`, 'Close', { duration: 3000 });
        }
      })
      .catch((error: any) => {
        console.error('Error updating order status:', error);
        this.snackBar.open('Failed to update order status', 'Close', { duration: 3000 });
      })
      .finally(() => {
        this.statusUpdateLoading = false;
        this.cdr.markForCheck();
      });
  }
  
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/product-placeholder.png';
  }

  isActionDisabled(action: string): boolean {
    if (!this.order) return true;
    
    if (['completed', 'cancelled'].includes(this.order.status)) {
      return true;
    }
    
    return false;
  }

  onStatusUpdate(): void {
    const newStatus = this.statusControl.value;
    if (newStatus && newStatus !== this.order?.status) {
      this.updateOrderStatus(newStatus);
    }
  }

  onPrintInvoice(): void {
    window.print();
  }

  onResendConfirmation(): void {
    if (!this.orderId) return;
    
    this.ordersService.resendOrderConfirmation(this.orderId)
      .then(() => {
        this.snackBar.open('Order confirmation has been resent', 'Close', { duration: 3000 });
      })
      .catch((error: Error) => {
        console.error('Error resending confirmation:', error);
        this.snackBar.open('Failed to resend confirmation. Please try again.', 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      });
  }

  /**
   * Determines if the status update button should be disabled
   */
  isStatusUpdateDisabled(): boolean {
    if (this.loading || this.statusControl.invalid || this.statusControl.pristine) {
      return true;
    }

    const newStatus = this.statusControl.value;
    // If updating to 'ready' or 'delivered', ensure all items are checked
    if ((newStatus === 'ready' || newStatus === 'delivered')) {
      return true;
    }

    return false;
  }

  /**
   * Gets the tooltip text for the status update button
   */
  getStatusUpdateTooltip(): string {
    if (this.loading) {
      return 'Updating status...';
    }

    if (this.statusControl.invalid) {
      return 'Please select a valid status';
    }

    if (this.statusControl.pristine) {
      return 'Please select a new status';
    }

    return 'Update status to ' + this.statusControl.value;
  }

  onCancelOrder(): void {
    if (!this.order) return;
    
    const confirmCancel = confirm('Are you sure you want to cancel this order? This action cannot be undone.');
    if (!confirmCancel) return;
    
    this.ordersService.updateOrderStatus(this.orderId, 'cancelled')
      .then(() => {
        this.snackBar.open('Order has been cancelled', 'Close', { duration: 3000 });
        // Refresh order data
        this.loadOrder(this.storeId, this.orderId);
      })
      .catch((error: Error) => {
        console.error('Error cancelling order:', error);
        this.snackBar.open('Failed to cancel order. Please try again.', 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      });
  }
}
