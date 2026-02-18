import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError } from 'rxjs';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Customer {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  company?: string;
  Company?: string;
  email?: string;
  Email?: string;
  phone?: string;
  Phone?: string;
  status?: 'active' | 'inactive';
  Status?: 'active' | 'inactive';
  createdDate?: string;
  CreatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerManagementService {
  private customersSubject = new BehaviorSubject<Customer[]>([]);
  public customers$ = this.customersSubject.asObservable();
  
  private apiUrl = `${environment.apiUrl}/customers`;

  constructor(private http: HttpClient) {
    this.loadCustomersFromApi();
  }

  /**
   * Load all customers from backend API
   */
  private loadCustomersFromApi(): void {
    console.log('[CustomerService] Loading customers from API...');
    this.http.get<ApiResponse<Customer[]>>(this.apiUrl)
      .pipe(
        tap(response => {
          console.log('[CustomerService] API Response:', response);
          if (response.success && Array.isArray(response.data)) {
            // Normalize field names (backend might use Id, Name, etc.)
            const normalized = response.data.map(c => this.normalizeCustomer(c));
            console.log('[CustomerService] Normalized customers:', normalized);
            this.customersSubject.next(normalized);
          } else {
            console.warn('[CustomerService] Unexpected response format:', response);
            this.customersSubject.next([]);
          }
        }),
        catchError(error => {
          console.error('[CustomerService] Failed to load customers from API:', error);
          // Fall back to empty array
          this.customersSubject.next([]);
          return of(null);
        })
      )
      .subscribe({
        next: () => console.log('[CustomerService] Load customers: Complete'),
        error: (err) => console.error('[CustomerService] Subscribe error:', err)
      });
  }

  /**
   * Normalize customer object to consistent field names
   */
  private normalizeCustomer(customer: Customer): Customer {
    return {
      id: customer.id || customer.Id,
      name: customer.name || customer.Name,
      company: customer.company || customer.Company,
      email: customer.email || customer.Email,
      phone: customer.phone || customer.Phone,
      status: (customer.status || customer.Status || 'active') as 'active' | 'inactive',
      createdDate: customer.createdDate || customer.CreatedAt,
    };
  }

  /**
   * Get current customers from local state
   */
  getCustomers(): Customer[] {
    return this.customersSubject.value;
  }

  /**
   * Get only active customers
   */
  getActiveCustomers(): Customer[] {
    return this.customersSubject.value.filter(
      customer => (customer.status || customer.Status) === 'active'
    );
  }

  /**
   * Create new customer on backend
   */
  createCustomer(customer: Omit<Customer, 'id' | 'createdDate'>): void {
    const payload = {
      Name: customer.name || customer.Name,
      Email: customer.email || customer.Email,
      Phone: customer.phone || customer.Phone,
      Company: customer.company || customer.Company,
      Status: (customer.status || customer.Status || 'active').toLowerCase(),
    };

    console.log('[CustomerService] Creating customer:', payload);
    this.http.post<ApiResponse<Customer>>(this.apiUrl, payload)
      .pipe(
        tap(response => {
          console.log('[CustomerService] Create response:', response);
          if (response.success && response.data) {
            // Add new customer to local state
            const normalized = this.normalizeCustomer(response.data);
            const current = this.customersSubject.value;
            this.customersSubject.next([...current, normalized]);
            console.log('[CustomerService] Customer created successfully:', normalized);
          }
        }),
        catchError(error => {
          console.error('[CustomerService] Failed to create customer:', error);
          return of(null);
        })
      )
      .subscribe({
        error: (err) => console.error('[CustomerService] Create subscribe error:', err)
      });
  }

  /**
   * Update customer on backend
   */
  updateCustomer(id: string, updates: Partial<Customer>): void {
    const payload = {
      Name: updates.name || updates.Name,
      Email: updates.email || updates.Email,
      Phone: updates.phone || updates.Phone,
      Company: updates.company || updates.Company,
      Status: updates.status || updates.Status,
    };

    const customerId = id || updates.id || updates.Id;
    this.http.put<ApiResponse<Customer>>(`${this.apiUrl}/${customerId}`, payload)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update local state
            const current = this.customersSubject.value;
            const index = current.findIndex(c => (c.id || c.Id) === customerId);
            if (index !== -1) {
              current[index] = { ...current[index], ...updates };
              this.customersSubject.next([...current]);
            }
          }
        }),
        catchError(error => {
          console.error('Failed to update customer:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Delete customer from backend
   */
  deleteCustomer(id: string): void {
    this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            // Remove from local state
            const current = this.customersSubject.value;
            const filtered = current.filter(c => (c.id || c.Id) !== id);
            this.customersSubject.next(filtered);
          }
        }),
        catchError(error => {
          console.error('Failed to delete customer:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Toggle customer status between active and inactive
   */
  toggleCustomerStatus(customer: Customer): void {
    const currentStatus = customer.status || customer.Status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const customerId = customer.id || customer.Id;
    
    this.updateCustomer(customerId || '', { status: newStatus });
  }

  /**
   * Refresh customers from API
   */
  refreshCustomers(): void {
    this.loadCustomersFromApi();
  }
}
