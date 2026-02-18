import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeStoredProcedure } from '../config/database';

/**
 * Customer Service - Handle customer-related database operations
 */

export interface Customer {
  Id: string;
  Name: string;
  Company?: string;
  Email?: string;
  Phone?: string;
  Status: string;
  Industry?: string;
  Website?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class CustomerService {
  /**
   * Get all customers
   */
  static async getAllCustomers(status?: string): Promise<Customer[]> {
    let query = `SELECT * FROM dbo.Customers`;
    const params: Record<string, any> = {};

    if (status) {
      query += ` WHERE Status = @status`;
      params.status = status.toLowerCase(); // Convert to lowercase
    }

    query += ` ORDER BY CreatedAt DESC`;
    return await executeQuery<Customer>(query, params);
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(id: string): Promise<Customer | null> {
    const query = `SELECT * FROM dbo.Customers WHERE Id = @id`;
    const results = await executeQuery<Customer>(query, { id });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create new customer
   */
  static async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const id = uuidv4();
    const now = new Date();
    
    // Validate status against database constraints
    const validStatusValues = ['active', 'inactive', 'prospect', 'archived'];
    let status = (customer.Status || 'active').toLowerCase();
    if (!validStatusValues.includes(status)) {
      status = 'active'; // Default to active if invalid
    }

    const query = `
      INSERT INTO dbo.Customers 
      (Id, Name, Company, Email, Phone, Status, Industry, Website, CreatedAt, UpdatedAt)
      VALUES 
      (@id, @name, @company, @email, @phone, @status, @industry, @website, @createdAt, @updatedAt);
      
      SELECT * FROM dbo.Customers WHERE Id = @id
    `;

    const params = {
      id,
      name: customer.Name || '',
      company: customer.Company || null,
      email: customer.Email || null,
      phone: customer.Phone || null,
      status,  // Now lowercase and validated
      industry: customer.Industry || null,
      website: customer.Website || null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const results = await executeQuery<Customer>(query, params);
      if (!results || results.length === 0) {
        console.error('❌ INSERT executed but no result returned');
        throw new Error('Customer created but not found in SELECT');
      }
      return results[0];
    } catch (error) {
      console.error('❌ Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Update customer
   */
  static async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const fields: string[] = [];
    const params: Record<string, any> = { id };

    Object.keys(updates).forEach((key) => {
      if (key !== 'Id' && key !== 'CreatedAt' && key !== 'UpdatedAt') {
        fields.push(`${key} = @${key}`);
        // Convert status to lowercase if present
        if (key === 'Status') {
          params[key] = (updates as any)[key].toLowerCase();
        } else {
          params[key] = (updates as any)[key];
        }
      }
    });

    if (fields.length === 0) {
      return this.getCustomerById(id);
    }

    params.updatedAt = new Date();
    fields.push('UpdatedAt = @updatedAt');

    const query = `
      UPDATE dbo.Customers 
      SET ${fields.join(', ')}
      WHERE Id = @id;
      
      SELECT * FROM dbo.Customers WHERE Id = @id
    `;

    try {
      const results = await executeQuery<Customer>(query, params);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('❌ Error updating customer:', error);
      throw error;
    }
  }

  /**
   * Delete customer
   */
  static async deleteCustomer(id: string): Promise<boolean> {
    const query = `DELETE FROM dbo.Customers WHERE Id = @id`;
    await executeQuery(query, { id });
    return true;
  }

  /**
   * Search customers by name or company
   */
  static async searchCustomers(searchTerm: string): Promise<Customer[]> {
    const query = `
      SELECT * FROM dbo.Customers 
      WHERE Name LIKE @search OR Company LIKE @search
      ORDER BY CreatedAt DESC
    `;
    const searchPattern = `%${searchTerm}%`;
    return await executeQuery<Customer>(query, { search: searchPattern });
  }

  /**
   * Get customer quote summary (view)
   */
  static async getCustomerQuoteSummary(customerId: string): Promise<any> {
    const query = `
      SELECT * FROM dbo.vw_CustomerQuoteSummary
      WHERE CustomerId = @customerId
    `;
    const results = await executeQuery(query, { customerId });
    return results.length > 0 ? results[0] : null;
  }
}
