import { Component, EventEmitter, Input, Output, OnInit, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Product } from '../../models/product.models';
import { ProductService } from '../product.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css']
})
export class ProductFormComponent implements OnInit, OnDestroy {
  @Input() product: Partial<Product> | null = null;
  @Input() storeId: string = '';
  @Output() formSubmitted = new EventEmitter<Partial<Product>>();
  
  productForm: FormGroup = new FormGroup({});
  categories = ['Food', 'Fashion', 'Electronics', 'Home', 'Raw Materials', 'Other'];
  isEditMode = false;
  isLoading = false;
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    @Inject(MAT_DIALOG_DATA) public data: { product?: Product; storeId: string } = { storeId: '' },
    private dialogRef: MatDialogRef<ProductFormComponent>,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.data?.storeId) {
      this.storeId = this.data.storeId;
    }
    
    if (this.data?.product) {
      this.product = this.data.product;
      this.isEditMode = true;
      this.patchFormWithProductData();
    } else if (this.storeId) {
      this.productForm.addControl('storeId', this.fb.control(this.storeId));
    }
  }

  ngOnDestroy(): void {
    // No need to unsubscribe from Promises as they don't need cleanup like Observables
  }

  private initializeForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      price: [0, [Validators.required, Validators.min(0.01)]],
      discountPrice: [null, [Validators.min(0)]],
      category: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0)]],
      isAvailable: [true],
      weight: [0.1, [Validators.required, Validators.min(0.01)]],
      isFeatured: [false],
      images: this.fb.array([
        this.fb.control('', [
          Validators.pattern('(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?')
        ])
      ]),
      collectionIds: this.fb.array([])
    });
  }

  get images(): FormArray {
    return this.productForm.get('images') as FormArray;
  }

  get collectionIds(): FormArray {
    return this.productForm.get('collectionIds') as FormArray;
  }

  addImage(): void {
    this.images.push(this.fb.control('', [
      Validators.pattern('(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?')
    ]));
  }

  removeImage(index: number): void {
    if (this.images.length > 1) {
      this.images.removeAt(index);
    } else {
      this.images.at(0).setValue('');
    }
  }

  addCollection(): void {
    this.collectionIds.push(this.fb.control(''));
  }

  removeCollection(index: number): void {
    this.collectionIds.removeAt(index);
  }

  private patchFormWithProductData(): void {
    if (!this.product) return;

    const productData = { ...this.product };
    
    // Ensure we have at least one image
    if (!productData.images || productData.images.length === 0) {
      productData.images = [''];
    }

    // Patch the form with product data
    this.productForm.patchValue({
      name: productData.name,
      description: productData.description,
      price: productData.price,
      discountPrice: productData.discountPrice || null,
      category: productData.category || '',
      quantity: productData.quantity || 1,
      isAvailable: productData.isAvailable ?? true,
      weight: productData.weight || 0.1,
      isFeatured: productData.isFeatured ?? false
    });

    // Set up images array
    if (productData.images && productData.images.length > 0) {
      // Remove the default empty image control
      this.images.clear();
      // Add all images from the product
      productData.images.forEach(image => {
        this.images.push(this.fb.control(image, [
          Validators.pattern('(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?')
        ]));
      });
    }

    // Set up collections
    if (productData.collectionIds?.length) {
      const collectionArray = this.fb.array(
        productData.collectionIds.map(id => this.fb.control(id))
      );
      this.productForm.setControl('collectionIds', collectionArray);
    }
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.markAllFormControlsAsTouched(this.productForm);
      this.snackBar.open('Please fill in all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const formValue = this.prepareFormData(this.productForm.value);

    if (this.isEditMode && this.product?.id) {
      this.updateProduct(this.product.id, formValue);
    } else {
      this.createProduct(formValue);
    }
  }

  onCancel(): void {
    if (this.productForm.dirty) {
      const confirmDiscard = confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmDiscard) return;
    }
    this.dialogRef.close();
  }

  private prepareFormData(formData: any): Partial<Product> {
    return {
      ...formData,
      price: Number(formData.price) || 0,
      discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      quantity: formData.quantity ? Number(formData.quantity) : 0,
      isAvailable: formData.isAvailable || false,
      isFeatured: formData.isFeatured || false,
      images: formData.images || [],
      collectionIds: formData.collectionIds || [],
      storeId: this.storeId,
      updatedAt: new Date().toISOString(),
      ...(this.isEditMode ? {} : { createdAt: new Date().toISOString() })
    };
  }

  private createProduct(productData: Partial<Product>): void {
    this.isLoading = true;
    this.productService.createProduct(productData as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>)
      .then(() => {
        this.snackBar.open('Product created successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      })
      .catch((error: Error) => {
        console.error('Error creating product:', error);
        this.snackBar.open('Failed to create product. Please try again.', 'Close', { duration: 3000 });
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  private updateProduct(productId: string, productData: Partial<Product>): void {
    this.isLoading = true;
    this.productService.updateProduct(productId, productData)
      .then(() => {
        this.snackBar.open('Product updated successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      })
      .catch((error: Error) => {
        console.error('Error updating product:', error);
        this.snackBar.open('Failed to update product. Please try again.', 'Close', { duration: 3000 });
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  private markAllFormControlsAsTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control) {
        control.markAsTouched({ onlySelf: true });

        if (control instanceof FormGroup || control instanceof FormArray) {
          this.markAllFormControlsAsTouched(control);
        }
      }
    });
  }

  getError(controlName: string, index?: number): string {
    let control: AbstractControl | null = null;

    if (index !== undefined) {
      // Handle form array controls (like images)
      const arrayControl = this.productForm.get(controlName) as FormArray;
      if (arrayControl && arrayControl.controls[index]) {
        control = arrayControl.controls[index];
      }
    } else {
      // Handle regular form controls
      control = this.productForm.get(controlName);
    }

    if (!control || !control.touched) {
      return '';
    }

    if (control.hasError('required')) {
      return 'This field is required';
    } else if (control.hasError('min')) {
      const minError = control.getError('min');
      return `Value must be at least ${minError?.min || 'the minimum value'}`;
    } else if (control.hasError('minlength')) {
      return `Minimum length is ${control.getError('minlength').requiredLength} characters`;
    } else if (control.hasError('pattern')) {
      if (controlName === 'images' || controlName === 'image') {
        return 'Please enter a valid URL (e.g., https://example.com/image.jpg)';
      }
      return 'Invalid format';
    }

    return '';
  }
}