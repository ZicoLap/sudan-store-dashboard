import { Pipe, PipeTransform } from '@angular/core';
import { OrderStatus } from '../../models/order.models';


const STATUS_LABELS: Record<OrderStatus, string> = {
  'pending': 'Pending',
  'confirmed': 'Confirmed',
  'preparing': 'Preparing',
  'ready': 'Ready for Pickup',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled'
};

@Pipe({
  name: 'orderStatus',
  standalone: true
})
export class OrderStatusPipe implements PipeTransform {
  transform(status: OrderStatus): string {
    return STATUS_LABELS[status] || status;
  }
}
