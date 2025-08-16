import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCard, MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { CommonModule } from '@angular/common';
import { StoreSettingsService } from '../../services/store-settings.service';
import { Store } from '../../store/store.model';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  templateUrl: './store-settings.component.html',
  styleUrls: ['./store-settings.component.css'],
  imports: [CommonModule, MatCard, MatCardModule, MatInputModule, ReactiveFormsModule]
})
export class StoreSettingsComponent implements OnInit {
  storeForm!: FormGroup;
  loading = false;
  coverPreview: string | null = null;
  logoPreview: string | null = null;
  currentStore: Store | null = null;

  @ViewChild('logoUpload', { static: false }) logoUpload!: ElementRef<HTMLInputElement>;
  @ViewChild('coverUpload', { static: false }) coverUpload!: ElementRef<HTMLInputElement>;   

  constructor(
    private fb: FormBuilder,
    private storeSettingsService: StoreSettingsService
  ) {}

  ngOnInit(): void {
    this.initForm();

    // Load store data
    this.storeSettingsService.getStore().subscribe(store => {
      if (store) this.patchForm(store);
    });
  }

  private initForm() {
    this.storeForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      address: this.fb.group({
        street: [''],
        city: [''],
        country: [''],
        postalCode: ['']
      }),
      categoryIds: [''],
      tags: [''],
      storeTypes: [''],
      deliveryPricing: this.fb.array([ this.createDeliveryPrice() ]),
      freeDeliveryOver: [null, Validators.min(0)],
      minimumOrderAmount: [null, Validators.min(0)],
      isOpen: [false]
    });
  }

  private patchForm(store: Store) {
    this.currentStore = store;
    this.storeForm.patchValue({
      name: store.name,
      description: store.description || '',
      email: store.email || '',
      phoneNumber: store.phoneNumber || '',
      address: store.address || {},
      categoryIds: store.categoryIds?.join(', ') || '',
      tags: store.tags?.join(', ') || '',
      storeTypes: store.storeTypes?.join(', ') || '',
      freeDeliveryOver: store.freeDeliveryOver || null,
      minimumOrderAmount: store.minimumOrderAmount || null,
      isOpen: store.isOpen ?? false
    });

    this.coverPreview = store.coverImageUrl || null;
    this.logoPreview = store.logoUrl || null;

    // Rebuild deliveryPricing array
    if (store.deliveryPricing?.length) {
      this.deliveryPricing.clear();
      store.deliveryPricing.forEach(pricing =>
        this.deliveryPricing.push(this.fb.group({
          maxWeight: [pricing.maxWeight, [Validators.min(0.1)]],
          fee: [pricing.fee, [Validators.min(0)]]
        }))
      );
    }
  }

  get addressForm(): FormGroup {
    return this.storeForm.get('address') as FormGroup;
  }

  get deliveryPricing(): FormArray {
    return this.storeForm.get('deliveryPricing') as FormArray;
  }

  private createDeliveryPrice(): FormGroup {
    return this.fb.group({
      maxWeight: [null, [Validators.min(0.1)]],
      fee: [null, [Validators.min(0)]]
    });
  }

  addDeliveryPrice(): void {
    this.deliveryPricing.push(this.createDeliveryPrice());
  }

  removeDeliveryPrice(index: number): void {
    this.deliveryPricing.removeAt(index);
  }

  triggerFileInput(type: 'logo' | 'cover'): void {
    if (type === 'logo') this.logoUpload.nativeElement.click();
    else this.coverUpload.nativeElement.click();
  }

  async onFileSelected(event: Event, type: 'cover' | 'logo') {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    try {
      if (type === 'cover') {
        this.coverPreview = URL.createObjectURL(file);
        await this.storeSettingsService.uploadCoverImage(file);
      } else {
        this.logoPreview = URL.createObjectURL(file);
        await this.storeSettingsService.uploadLogo(file);
      }
    } catch (err) {
      console.error('File upload failed:', err);
    }
  }

  onSubmit(): void {
    if (this.storeForm.invalid) {
      this.storeForm.markAllAsTouched();
      return;
    }

    // Convert comma-separated strings to arrays
    const storeData = {
      ...this.storeForm.value,
      categoryIds: this.storeForm.value.categoryIds?.split(',').map((c: string) => c.trim()) || [],
      tags: this.storeForm.value.tags?.split(',').map((t: string) => t.trim()) || [],
      storeTypes: this.storeForm.value.storeTypes?.split(',').map((s: string) => s.trim()) || []
    };

    this.loading = true;
    this.storeSettingsService.updateStore(storeData).subscribe({
      next: () => {
        this.loading = false;
        console.log('Store updated successfully');
      },
      error: err => {
        this.loading = false;
        console.error('Update failed:', err);
      }
    });
  }
}
