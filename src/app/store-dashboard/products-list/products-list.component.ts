import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.models';
import { Observable, of } from 'rxjs';
import { map, startWith, catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductFormComponent } from '../product-form/product-form.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    ReactiveFormsModule
  ],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.css'
})
export class ProductsListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  products$: Observable<Product[]> | undefined;
  dataSource = new MatTableDataSource<Product>([]);
  displayedColumns: string[] = ['name', 'category', 'price', 'stock', 'actions'];
  
  searchControl = new FormControl<string>('');
  categoryControl = new FormControl<string>('');
  categories: string[] = [];
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalItems = 0;
  selectedRowIndex: string | null = null;

  constructor(
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  ngAfterViewInit() {
    // Set up the sort and paginator after the view init
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  private loadProducts(): void {
    console.log('loadProducts() called');
    
    // Subscribe to route parameter changes
    this.route.parent?.paramMap.subscribe(params => {
      const storeId = params.get('storeId');
      
      if (!storeId) {
        const errorMsg = 'Store ID is missing in route parameters';
        console.error(errorMsg);
        this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
        return;
      }

      console.log('Loading products for store:', storeId);
      
      this.products$ = this.productService.getProducts(storeId).pipe(
        catchError(error => {
          const errorMsg = `Error loading products: ${error?.message || 'Unknown error'}`;
          console.error(errorMsg, error);
          this.snackBar.open('Error loading products', 'Close', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          return of([]);
        })
      );
      
      // Initialize data source with products
      this.products$.subscribe({
        next: (products) => {
          console.log('Products loaded:', products);
          console.log('Number of products:', products.length);
          
          if (products.length === 0) {
            console.warn('No products found for store:', storeId);
            this.snackBar.open('No products found for this store', 'OK', {
              duration: 3000,
              panelClass: ['info-snackbar']
            });
          }
          
          this.dataSource = new MatTableDataSource(products);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.totalItems = products.length;
          
          // Extract and log unique categories
          this.categories = [...new Set(products
            .map(p => p.category)
            .filter((category): category is string => !!category)
          )];
          console.log('Available categories:', this.categories);
          
          // Initialize filters
          this.setupFilters();
        },
        error: (error) => {
          console.error('Error in products subscription:', error);
        }
      });
    }, (error) => {
      console.error('Error in route params subscription:', error);
    });
  }

  private setupFilters(): void {
    // Apply filters when search term or category changes
    this.searchControl.valueChanges.pipe(
      startWith(''),
      map(searchTerm => {
        const category = this.categoryControl.value;
        return { searchTerm: searchTerm || '', category };
      })
    ).subscribe(({ searchTerm, category }) => {
      this.applyFilters(searchTerm, category);
    });
    
    this.categoryControl.valueChanges.pipe(
      startWith(''),
      map(category => {
        const searchTerm = this.searchControl.value || '';
        return { searchTerm, category: category || '' };
      })
    ).subscribe(({ searchTerm, category }) => {
      this.applyFilters(searchTerm, category);
    });
  }
  
  // Clear all filters and reset the view
  clearFilters(): void {
    this.searchControl.setValue('');
    this.categoryControl.setValue('');
    this.applyFilters('', '');
    this.snackBar.open('Filters cleared', 'Close', { 
      duration: 2000,
      panelClass: ['success-snackbar']
    });
  }

  private applyFilters(searchTerm: string | null, category: string | null): void {
    if (!this.products$) return;
    
    this.products$.pipe(
      map(products => {
        return products.filter(product => {
          const searchTermLower = searchTerm?.toLowerCase() || '';
          const matchesSearch = product.name.toLowerCase().includes(searchTermLower) ||
                             (product.description?.toLowerCase().includes(searchTermLower) || false);
          const matchesCategory = !category || product.category === category;
          return matchesSearch && matchesCategory;
        });
      })
    ).subscribe(filteredProducts => {
      if (this.dataSource) {
        this.dataSource.data = filteredProducts;
        this.totalItems = filteredProducts.length;
        
        // Reset to first page when filtering
        if (this.paginator) {
          this.paginator.firstPage();
        }
      }
    });
  }
  
  // Handle page change event
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
  }
  


  editProduct(product: Product): void {
    // For now, just show a message
    this.snackBar.open(`Editing product: ${product.name}`, 'Dismiss', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
    console.log('Edit product:', product);
    // TODO: Implement edit functionality
  }

  deleteProduct(productId: string): void {
    if (confirm('Are you sure you want to delete this product?')) {
      // In a real app, we would call productService.deleteProduct(productId)
      // For now, just show a message
      this.snackBar.open('Product deleted successfully!', 'Dismiss', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      console.log('Delete product with ID:', productId);
      // TODO: Implement delete functionality
    }
  }

  openAddProductDialog(): void {
    // Get storeId from route params
    const storeId = this.route.snapshot.paramMap.get('storeId');
    
    if (!storeId) {
      this.snackBar.open('Store ID is missing', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container',
      data: { 
        product: null, // Pass null for new product
        storeId: storeId // Pass the storeId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // In a real app, we would call productService.addProduct(result)
        this.snackBar.open('Product added successfully!', 'Dismiss', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        console.log('New product:', result);
        // Refresh the products list
        this.loadProducts();
      }
    });
  }

  openEditProductDialog(product: Product): void {
    // Get storeId from route params
    //const storeId = this.route.snapshot.paramMap.get('storeId');
    
   /*  if (!storeId) {
      this.snackBar.open('Store ID is missing', 'Close', { duration: 3000 });
      return;
    } */

    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container',
      data: { 
        product: product, // Pass the product to edit
       // storeId: storeId  // Pass the storeId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // In a real app, we would call productService.updateProduct(result)
        this.snackBar.open('Product updated successfully!', 'Dismiss', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        console.log('Updated product:', result);
        // Refresh the products list
        this.loadProducts();
      }
    });
  }
}
