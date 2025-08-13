import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Collection } from '../../../models/collection.models';
import { CollectionsService } from '../../collections.service';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
/* import { CollectionsService } from '../collections.service';
 */
export interface CollectionFormData {
  collection?: Collection;
  isEdit?: boolean;
  storeId?: string;
}

@Component({
  selector: 'app-collection-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule
],
  templateUrl: './collection-form-dialog.component.html',
  styleUrls: ['./collection-form-dialog.component.css']
})
export class CollectionFormDialogComponent implements OnInit {
  collectionForm: FormGroup;
  isSubmitting = false;
  isEdit = false;
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CollectionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CollectionFormData,
    private collectionsService: CollectionsService,
    private snackBar: MatSnackBar
  ) {
    this.isEdit = !!data?.isEdit;
    this.collectionForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  ngOnInit(): void {
    if (this.data?.collection) {
      this.collectionForm.patchValue({
        name: this.data.collection.name
      });
      if (this.data.collection.imageUrl) {
        this.previewUrl = this.data.collection.imageUrl;
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.previewImage(this.selectedFile);
    }
  }

  private previewImage(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  onSubmit(): void {
    if (this.collectionForm.invalid) {
      this.collectionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.collectionForm.value;
    
    if (this.isEdit && this.data.collection?.id) {
      this.updateCollection(formValue);
    } else {
      this.createCollection(formValue);
    }
  }

  private createCollection(formValue: any): void {
    if (!this.data.storeId) {
      this.snackBar.open('Error: No store selected', 'Close', { duration: 3000 });
      this.isSubmitting = false;
      return;
    }

    const newCollection: Omit<Collection, 'id'> = {
      name: formValue.name,
      storeId: this.data.storeId,
      createdAt: new Date().toISOString(),
      imageUrl: this.previewUrl?.toString() || ''
    };

    this.collectionsService.addCollection(newCollection).then(() => {
      this.snackBar.open('Collection created successfully!', 'Close', { duration: 3000 });
      this.dialogRef.close(true);
    }).catch(error => {
      console.error('Error creating collection:', error);
      this.snackBar.open('Failed to create collection. Please try again.', 'Close', { duration: 3000 });
      this.isSubmitting = false;
    });
  }

  private updateCollection(formValue: any): void {
    if (!this.data.collection?.id) {
      this.snackBar.open('Error: Invalid collection', 'Close', { duration: 3000 });
      this.isSubmitting = false;
      return;
    }

    const updatedCollection: Partial<Collection> = {
      name: formValue.name,
      imageUrl: this.previewUrl?.toString() || this.data.collection.imageUrl || ''
    };

    this.collectionsService.updateCollection(this.data.collection.id, updatedCollection)
      .then(() => {
        this.snackBar.open('Collection updated successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      })
      .catch(error => {
        console.error('Error updating collection:', error);
        this.snackBar.open('Failed to update collection. Please try again.', 'Close', { duration: 3000 });
        this.isSubmitting = false;
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
