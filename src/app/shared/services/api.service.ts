import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Models
export interface Customer {
  CustomerID?: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string;
  CompanyName?: string;
  Status?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export interface Quote {
  QuoteID?: number;
  CustomerID: number;
  QuoteNumber: string;
  Status: string;
  TotalAmount: number;
  Notes?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export interface LaborItem {
  LaborItemID?: number;
  Category: string;
  Description: string;
  HourlyRate: number;
  Section?: string;
  IsActive?: boolean;
  CreatedAt?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ==================== CUSTOMERS ====================
  /**
   * Get all customers with optional status filter
   */
  getAllCustomers(status?: string): Observable<ApiResponse<Customer[]>> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ApiResponse<Customer[]>>(`${this.apiUrl}/customers`, { params });
  }

  /**
   * Get customer by ID
   */
  getCustomerById(id: number): Observable<ApiResponse<Customer>> {
    return this.http.get<ApiResponse<Customer>>(`${this.apiUrl}/customers/${id}`);
  }

  /**
   * Create new customer
   */
  createCustomer(customer: Customer): Observable<ApiResponse<Customer>> {
    return this.http.post<ApiResponse<Customer>>(`${this.apiUrl}/customers`, customer);
  }

  /**
   * Update customer
   */
  updateCustomer(id: number, customer: Partial<Customer>): Observable<ApiResponse<Customer>> {
    return this.http.put<ApiResponse<Customer>>(`${this.apiUrl}/customers/${id}`, customer);
  }

  /**
   * Delete customer
   */
  deleteCustomer(id: number): Observable<ApiResponse<{ id: number }>> {
    return this.http.delete<ApiResponse<{ id: number }>>(`${this.apiUrl}/customers/${id}`);
  }

  /**
   * Search customers by name or email
   */
  searchCustomers(term: string): Observable<ApiResponse<Customer[]>> {
    const params = new HttpParams().set('search', term);
    return this.http.get<ApiResponse<Customer[]>>(`${this.apiUrl}/customers/search`, { params });
  }

  /**
   * Get customer with quote summary
   */
  getCustomerWithQuotes(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/customers/${id}/quotes`);
  }

  // ==================== QUOTES ====================
  /**
   * Get all quotes
   */
  getAllQuotes(): Observable<ApiResponse<Quote[]>> {
    return this.http.get<ApiResponse<Quote[]>>(`${this.apiUrl}/quotes`);
  }

  /**
   * Get quotes by customer ID
   */
  getQuotesByCustomer(customerId: number): Observable<ApiResponse<Quote[]>> {
    const params = new HttpParams().set('customerId', customerId.toString());
    return this.http.get<ApiResponse<Quote[]>>(`${this.apiUrl}/quotes`, { params });
  }

  /**
   * Get quotes by status
   */
  getQuotesByStatus(status: string): Observable<ApiResponse<Quote[]>> {
    const params = new HttpParams().set('status', status);
    return this.http.get<ApiResponse<Quote[]>>(`${this.apiUrl}/quotes`, { params });
  }

  /**
   * Get quote by ID
   */
  getQuoteById(id: number): Observable<ApiResponse<Quote>> {
    return this.http.get<ApiResponse<Quote>>(`${this.apiUrl}/quotes/${id}`);
  }

  /**
   * Create new quote
   */
  createQuote(quote: Quote): Observable<ApiResponse<Quote>> {
    return this.http.post<ApiResponse<Quote>>(`${this.apiUrl}/quotes`, quote);
  }

  /**
   * Update quote
   */
  updateQuote(id: number, quote: Partial<Quote>): Observable<ApiResponse<Quote>> {
    return this.http.put<ApiResponse<Quote>>(`${this.apiUrl}/quotes/${id}`, quote);
  }

  /**
   * Delete quote
   */
  deleteQuote(id: number): Observable<ApiResponse<{ id: number }>> {
    return this.http.delete<ApiResponse<{ id: number }>>(`${this.apiUrl}/quotes/${id}`);
  }

  // ==================== LABOR ITEMS ====================
  /**
   * Get all labor items
   */
  getAllLaborItems(): Observable<ApiResponse<LaborItem[]>> {
    return this.http.get<ApiResponse<LaborItem[]>>(`${this.apiUrl}/labor-items`);
  }

  /**
   * Get labor items by section
   */
  getLaborItemsBySection(section: string): Observable<ApiResponse<LaborItem[]>> {
    const params = new HttpParams().set('section', section);
    return this.http.get<ApiResponse<LaborItem[]>>(`${this.apiUrl}/labor-items`, { params });
  }

  /**
   * Get labor item by ID
   */
  getLaborItemById(id: number): Observable<ApiResponse<LaborItem>> {
    return this.http.get<ApiResponse<LaborItem>>(`${this.apiUrl}/labor-items/${id}`);
  }

  /**
   * Get all labor item sections
   */
  getLaborSections(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/labor-items/sections`);
  }

  /**
   * Create new labor item
   */
  createLaborItem(item: LaborItem): Observable<ApiResponse<LaborItem>> {
    return this.http.post<ApiResponse<LaborItem>>(`${this.apiUrl}/labor-items`, item);
  }

  /**
   * Update labor item
   */
  updateLaborItem(id: number, item: Partial<LaborItem>): Observable<ApiResponse<LaborItem>> {
    return this.http.put<ApiResponse<LaborItem>>(`${this.apiUrl}/labor-items/${id}`, item);
  }

  /**
   * Delete labor item (soft delete)
   */
  deleteLaborItem(id: number): Observable<ApiResponse<{ id: number }>> {
    return this.http.delete<ApiResponse<{ id: number }>>(`${this.apiUrl}/labor-items/${id}`);
  }

  /**
   * Search labor items by description
   */
  searchLaborItems(term: string): Observable<ApiResponse<LaborItem[]>> {
    const params = new HttpParams().set('search', term);
    return this.http.get<ApiResponse<LaborItem[]>>(`${this.apiUrl}/labor-items/search`, { params });
  }

  // ==================== HEALTH CHECK ====================
  /**
   * Check backend API health
   */
  healthCheck(): Observable<ApiResponse<{ timestamp: string }>> {
    return this.http.get<ApiResponse<{ timestamp: string }>>(`${this.apiUrl}/health`);
  }
}
