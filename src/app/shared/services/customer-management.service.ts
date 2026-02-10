import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Customer {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerManagementService {
  private readonly STORAGE_KEY = 'admin_customers';
  private customersSubject = new BehaviorSubject<Customer[]>(this.loadCustomers());

  public customers$ = this.customersSubject.asObservable();

  constructor() {
    if (this.customersSubject.value.length === 0) {
      this.createDefaultCustomers();
    }
  }

  private loadCustomers(): Customer[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) as Customer[] : [];
  }

  private saveCustomers(customers: Customer[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(customers));
    this.customersSubject.next([...customers]);
  }

  private createDefaultCustomers(): void {
    const today = new Date().toLocaleDateString();
    const defaults: Customer[] = [
      {
        id: 'CUST-001',
        name: 'Acme Logistics',
        company: 'Acme Logistics',
        email: 'ops@acmelogistics.com',
        phone: '(555) 101-2000',
        status: 'active',
        createdDate: today,
      },
      {
        id: 'CUST-002',
        name: 'Northwind Health',
        company: 'Northwind Health',
        email: 'it@northwindhealth.com',
        phone: '(555) 202-3000',
        status: 'active',
        createdDate: today,
      }
    ];

    this.saveCustomers(defaults);
  }

  generateCustomerId(): string {
    return 'CUST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  getCustomers(): Customer[] {
    return this.customersSubject.value;
  }

  getActiveCustomers(): Customer[] {
    return this.customersSubject.value.filter(customer => customer.status === 'active');
  }

  createCustomer(customer: Omit<Customer, 'id' | 'createdDate'>): Customer {
    const newCustomer: Customer = {
      ...customer,
      id: this.generateCustomerId(),
      createdDate: new Date().toLocaleDateString(),
    };

    const customers = this.customersSubject.value;
    customers.push(newCustomer);
    this.saveCustomers(customers);

    return newCustomer;
  }

  updateCustomer(id: string, updates: Partial<Customer>): void {
    const customers = this.customersSubject.value;
    const index = customers.findIndex(customer => customer.id === id);

    if (index !== -1) {
      customers[index] = { ...customers[index], ...updates };
      this.saveCustomers(customers);
    }
  }

  deleteCustomer(id: string): void {
    const customers = this.customersSubject.value.filter(customer => customer.id !== id);
    this.saveCustomers(customers);
  }

  toggleCustomerStatus(customer: Customer): void {
    const newStatus = customer.status === 'active' ? 'inactive' : 'active';
    this.updateCustomer(customer.id, { status: newStatus });
  }
}
