import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'price',
  standalone: true
})
export class PricePipe implements PipeTransform {
  transform(value: number | string | null | undefined, currency: string = '€'): string {
    if (value === null || value === undefined) return '';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) return '';
    
    return `${currency}${numValue.toFixed(2)}`;
  }
}
