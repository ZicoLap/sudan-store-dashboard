import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Collection } from '../../../models/collection.models';

@Component({
  selector: 'app-collection-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './collection-card.component.html',
  styleUrls: ['./collection-card.component.css']
})
export class CollectionCardComponent {
  @Input() collection!: Collection;
  @Output() edit = new EventEmitter<Collection>();
  @Output() delete = new EventEmitter<string>();

  onEdit(): void {
    this.edit.emit(this.collection);
  }

  onDelete(): void {
    if (confirm(`Are you sure you want to delete "${this.collection.name}"?`)) {
      this.delete.emit(this.collection.id);
    }
  }
}
