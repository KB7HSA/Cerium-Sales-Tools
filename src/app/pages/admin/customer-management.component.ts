import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Customer, CustomerManagementService } from '../../shared/services/customer-management.service';

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-management.component.html',
  styleUrl: './customer-management.component.css'
})
export class CustomerManagementComponent implements OnInit {
  customers: Customer[] = [];
  searchTerm: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  newCustomer = {
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive'
  };

  editingCustomerId: string | null = null;
  editCustomer = {
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive'
  };

  constructor(public customerService: CustomerManagementService) {}

  ngOnInit(): void {
    this.customerService.customers$.subscribe(customers => {
      this.customers = customers;
    });
  }

  getFilteredCustomers(): Customer[] {
    let filtered = this.customers;

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === this.statusFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(term) ||
        (customer.company || '').toLowerCase().includes(term) ||
        (customer.email || '').toLowerCase().includes(term) ||
        (customer.id || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = status;
  }

  createCustomer(): void {
    if (!this.newCustomer.name.trim()) {
      alert('Customer name is required.');
      return;
    }

    this.customerService.createCustomer({
      name: this.newCustomer.name.trim(),
      company: this.newCustomer.company.trim(),
      email: this.newCustomer.email.trim(),
      phone: this.newCustomer.phone.trim(),
      status: this.newCustomer.status,
    });

    this.newCustomer = {
      name: '',
      company: '',
      email: '',
      phone: '',
      status: 'active'
    };
  }

  startEditCustomer(customer: Customer): void {
    this.editingCustomerId = customer.id;
    this.editCustomer = {
      name: customer.name || '',
      company: customer.company || '',
      email: customer.email || '',
      phone: customer.phone || '',
      status: customer.status
    };
  }

  cancelEditCustomer(): void {
    this.editingCustomerId = null;
    this.editCustomer = {
      name: '',
      company: '',
      email: '',
      phone: '',
      status: 'active'
    };
  }

  saveEditCustomer(): void {
    if (!this.editingCustomerId) {
      return;
    }

    if (!this.editCustomer.name.trim()) {
      alert('Customer name is required.');
      return;
    }

    this.customerService.updateCustomer(this.editingCustomerId, {
      name: this.editCustomer.name.trim(),
      company: this.editCustomer.company.trim(),
      email: this.editCustomer.email.trim(),
      phone: this.editCustomer.phone.trim(),
      status: this.editCustomer.status,
    });

    this.cancelEditCustomer();
  }

  deleteCustomer(customerId: string): void {
    if (this.editingCustomerId === customerId) {
      this.cancelEditCustomer();
    }
    if (confirm('Are you sure you want to delete this customer?')) {
      this.customerService.deleteCustomer(customerId);
    }
  }

  toggleCustomerStatus(customer: Customer): void {
    this.customerService.toggleCustomerStatus(customer);
  }

  getTotalCustomers(): number {
    return this.customers.length;
  }

  getActiveCustomers(): number {
    return this.customers.filter(customer => customer.status === 'active').length;
  }
}
