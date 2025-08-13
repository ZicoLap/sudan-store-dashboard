import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { OrderStatus, PaymentStatus } from '../../../models/order.models';

type StatusType = 'order' | 'payment';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  template: `
    <mat-chip
      [ngClass]="getStatusClasses()"
      [disableRipple]="true"
      [title]="status"
    >
      {{ status | titlecase }}
    </mat-chip>
  `,
  styles: [
    `
      mat-chip {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        height: 24px;
        padding: 0 8px;
        border-radius: 12px;
        text-transform: capitalize;
        
        &.status-pending {
          background-color: #fff3e0;
          color: #e65100;
        }
        
        &.status-confirmed {
          background-color: #e3f2fd;
          color: #0d47a1;
        }
        
        &.status-preparing {
          background-color: #e8f5e9;
          color: #1b5e20;
        }
        
        &.status-ready {
          background-color: #e8eaf6;
          color: #1a237e;
        }
        
        &.status-delivered {
          background-color: #e8f5e9;
          color: #1b5e20;
        }
        
        &.status-cancelled {
          background-color: #ffebee;
          color: #b71c1c;
        }
        
        /* Payment statuses */
        &.status-paid {
          background-color: #e8f5e9;
          color: #1b5e20;
        }
        
        &.status-pending-payment {
          background-color: #fff3e0;
          color: #e65100;
        }
        
        &.status-failed {
          background-color: #ffebee;
          color: #b71c1c;
        }
        
        &.status-refunded {
          background-color: #f3e5f5;
          color: #4a148c;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  @Input() status: string = '';
  @Input() type: StatusType = 'order';

  getStatusClasses(): string {
    const statusClass = this.status.toLowerCase().replace(/\s+/g, '-');
    return `status-${statusClass}`;
  }
}
