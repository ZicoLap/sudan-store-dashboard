import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderStatusPipe } from './order-status.pipe';
import { DateAgoPipe } from './date-ago.pipe';
import { PricePipe } from './price.pipe';

@NgModule({
  imports: [
    CommonModule,
    OrderStatusPipe,
    DateAgoPipe,
    PricePipe
  ],
  exports: [
    OrderStatusPipe,
    DateAgoPipe,
    PricePipe
  ]
})
export class PipesModule { }
