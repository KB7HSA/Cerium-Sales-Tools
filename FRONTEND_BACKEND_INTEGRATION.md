# Angular Frontend → Node.js Backend Integration Guide

## Overview
This guide explains how to connect your Angular frontend (running on `http://localhost:9766`) to the Node.js/Express backend (running on `http://localhost:3000`).

All communication happens through the **ApiService** located at `src/app/shared/services/api.service.ts`.

---

## Setup Steps

### Step 1: Start the Backend Server
In a terminal, navigate to the backend directory and start the server:

```bash
cd d:\Github\Tailadmin\backend
npm install              # First time only
npm run build           # Compile TypeScript
npm run dev             # Start in development mode
```

**Expected Output:**
```
✅ Connected to SQL Server
✅ Server running on http://localhost:3000
████████████████████████████████████████
✅ Environment: development
✅ Port: 3000
✅ CORS Origin: http://localhost:4200
████████████████████████████████████████
```

### Step 2: Verify Health Check
In another terminal, verify backend connectivity:

```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "data": { "timestamp": "2024-01-15T10:30:00Z" },
  "message": "API health check successful",
  "statusCode": 200
}
```

### Step 3: Environment Configuration
The environment files are already configured:

**Development** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  apiTimeout: 30000,
};
```

**Production** (`src/environments/environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api-domain.com/api',
  apiTimeout: 30000,
};
```

---

## Using the ApiService

### Import HttpClientModule
First, ensure `HttpClientModule` is available in your component or service:

```typescript
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [HttpClientModule, /* other imports */]
})
export class AppModule {}
```

Or in standalone component:
```typescript
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule, /* other imports */]
})
export class AppComponent {}
```

### Import ApiService
```typescript
import { ApiService, Customer, Quote, LaborItem } from '@/shared/services/api.service';

@Component({
  selector: 'app-customer-list',
  template: `...`
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  loading = false;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.loading = true;
    this.apiService.getAllCustomers().subscribe({
      next: (response) => {
        this.customers = response.data;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
      }
    });
  }
}
```

---

## API Methods Reference

### CUSTOMERS
```typescript
apiService.getAllCustomers(status?: string)          // Get all or filtered by status
apiService.getCustomerById(id: number)               // Get single customer
apiService.createCustomer(customer: Customer)        // Create new customer
apiService.updateCustomer(id: number, data)          // Update customer
apiService.deleteCustomer(id: number)                // Delete customer
apiService.searchCustomers(term: string)             // Search by name/email
apiService.getCustomerWithQuotes(id: number)         // Get customer + quotes
```

**Example: Create Customer**
```typescript
const newCustomer: Customer = {
  FirstName: 'John',
  LastName: 'Doe',
  Email: 'john@example.com',
  Phone: '555-1234',
  CompanyName: 'Acme Corp',
  Status: 'Active'
};

this.apiService.createCustomer(newCustomer).subscribe({
  next: (response) => {
    console.log('Customer created:', response.data);
  },
  error: (error) => {
    console.error('Error creating customer:', error);
  }
});
```

### QUOTES
```typescript
apiService.getAllQuotes()                            // Get all quotes
apiService.getQuotesByCustomer(customerId: number)  // Get quotes for customer
apiService.getQuotesByStatus(status: string)        // Filter by status
apiService.getQuoteById(id: number)                 // Get single quote
apiService.createQuote(quote: Quote)                // Create new quote
apiService.updateQuote(id: number, data)            // Update quote
apiService.deleteQuote(id: number)                  // Delete quote
```

**Example: Create Quote**
```typescript
const newQuote: Quote = {
  CustomerID: 1,
  QuoteNumber: 'QT-2024-001',
  Status: 'Draft',
  TotalAmount: 5000.00,
  Notes: 'Includes installation'
};

this.apiService.createQuote(newQuote).subscribe({
  next: (response) => {
    console.log('Quote created:', response.data);
  }
});
```

### LABOR ITEMS
```typescript
apiService.getAllLaborItems()                        // Get all labor items
apiService.getLaborItemsBySection(section: string)  // Get by category/section
apiService.getLaborItemById(id: number)             // Get single item
apiService.getLaborSections()                       // Get all sections/categories
apiService.createLaborItem(item: LaborItem)         // Create new item
apiService.updateLaborItem(id: number, data)        // Update item
apiService.deleteLaborItem(id: number)              // Delete item (soft)
apiService.searchLaborItems(term: string)           // Search by description
```

**Example: Get Labor Items by Section**
```typescript
this.apiService.getLaborItemsBySection('Installation').subscribe({
  next: (response) => {
    this.laborItems = response.data;
    console.log(`Found ${response.data.length} items in Installation section`);
  }
});
```

### HEALTH CHECK
```typescript
apiService.healthCheck()  // Verify backend connectivity
```

---

## Error Handling

### Generic Error Handling with HttpErrorResponse
```typescript
import { HttpErrorResponse } from '@angular/common/http';

this.apiService.getCustomerById(1).subscribe({
  next: (response) => {
    // Success
    console.log('Data:', response.data);
  },
  error: (error: HttpErrorResponse) => {
    // Error handling
    if (error.status === 404) {
      console.error('Customer not found');
    } else if (error.status === 500) {
      console.error('Server error:', error.error.message);
    } else {
      console.error('Unknown error:', error.message);
    }
  }
});
```

### Response Format
All API responses follow this format:
```typescript
{
  success: boolean;
  data: T;                    // Your actual data
  message: string;            // Description
  statusCode: number;         // HTTP status code
}
```

---

## Real-World Example Component

```typescript
import { Component, OnInit } from '@angular/core';
import { ApiService, Customer } from '@/shared/services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">Customers</h1>
      
      <!-- Loading State -->
      <div *ngIf="loading" class="text-center py-4">
        Loading customers...
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="bg-red-100 text-red-700 p-4 rounded mb-4">
        {{ error }}
      </div>

      <!-- Customer Table -->
      <table class="w-full border-collapse border" *ngIf="!loading && customers.length">
        <thead class="bg-gray-100">
          <tr>
            <th class="border p-2">First Name</th>
            <th class="border p-2">Last Name</th>
            <th class="border p-2">Email</th>
            <th class="border p-2">Company</th>
            <th class="border p-2">Status</th>
            <th class="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let customer of customers" class="hover:bg-gray-50">
            <td class="border p-2">{{ customer.FirstName }}</td>
            <td class="border p-2">{{ customer.LastName }}</td>
            <td class="border p-2">{{ customer.Email }}</td>
            <td class="border p-2">{{ customer.CompanyName }}</td>
            <td class="border p-2">
              <span [class]="getStatusClass(customer.Status)">
                {{ customer.Status }}
              </span>
            </td>
            <td class="border p-2">
              <button (click)="editCustomer(customer.CustomerID)" class="text-blue-600">Edit</button>
              <button (click)="deleteCustomer(customer.CustomerID)" class="text-red-600">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div *ngIf="!loading && !customers.length" class="text-center py-8 text-gray-500">
        No customers found
      </div>
    </div>
  `
})
export class CustomersComponent implements OnInit {
  customers: Customer[] = [];
  loading = false;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.loading = true;
    this.error = null;
    
    this.apiService.getAllCustomers().subscribe({
      next: (response) => {
        this.customers = response.data;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load customers';
        this.loading = false;
      }
    });
  }

  deleteCustomer(id?: number) {
    if (!id || !confirm('Are you sure?')) return;
    
    this.apiService.deleteCustomer(id).subscribe({
      next: () => {
        this.customers = this.customers.filter(c => c.CustomerID !== id);
      },
      error: (error) => {
        this.error = 'Failed to delete customer';
      }
    });
  }

  editCustomer(id?: number) {
    // Navigate to edit page or open modal
    console.log('Edit customer:', id);
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 px-2 py-1 rounded';
      case 'Inactive': return 'bg-gray-100 text-gray-800 px-2 py-1 rounded';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded';
      default: return '';
    }
  }
}
```

---

## Troubleshooting

### Issue: CORS Error
**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution:** Backend CORS is configured for `http://localhost:4200`. If frontend is running on different port, update backend:
```typescript
// backend/src/config/server.ts
corsOrigin: 'http://localhost:9766'  // Your frontend port
```

### Issue: Connection Refused
**Error:** `Cannot GET http://localhost:3000/api/customers`

**Solution:** 
1. Ensure backend server is running: `npm run dev`
2. Check backend is accessible: `curl http://localhost:3000/api/health`
3. Wait 5-10 seconds for backend to fully initialize

### Issue: 500 Internal Server Error
**Error:** Backend returns 500 status

**Solution:**
1. Check backend console for error messages
2. Verify SQL Server connection: check `.env` credentials
3. Check database is accessible: use SQL Server Management Studio
4. Look for query syntax errors in backend logs

### Issue: "Cannot find module" in Angular
**Error:** `Cannot find module '@/shared/services/api.service'`

**Solution:** Update `tsconfig.json` path alias or use full relative path:
```typescript
import { ApiService } from '../services/api.service';
```

---

## Next Steps

1. **Update Dashboard Component** to use ApiService for real data
2. **Create Forms** for creating/updating customers, quotes, labor items
3. **Add Pagination** to large datasets
4. **Implement Authentication** (optional)
5. **Add Request Interceptors** for common headers, token injection
6. **Deploy to Production** with proper environment configuration

---

## Backend API Documentation
For complete backend API documentation, see: `backend/README.md`

---

## Questions?
- Check backend logs: Terminal running `npm run dev`
- Check Angular console: Browser Developer Tools (F12)
- Verify connectivity: `curl http://localhost:3000/api/health`
