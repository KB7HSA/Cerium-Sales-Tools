import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeStoredProcedure } from '../config/database';

/**
 * Quote Service - Handle quote-related database operations
 */

export interface Quote {
  Id: string;
  QuoteType: string;
  CustomerId?: string;
  CustomerName: string;
  Notes?: string;
  ServiceName?: string;
  NumberOfUsers: number;
  DurationMonths: number;
  MonthlyPrice: number;
  TotalPrice: number;
  SetupFee: number;
  DiscountAmount: number;
  TotalHours: number;
  Status: string;
  ExpiresAt?: Date;
  AcceptedAt?: Date;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class QuoteService {
  /**
   * Get all quotes
   */
  static async getAllQuotes(status?: string): Promise<Quote[]> {
    let query = `SELECT * FROM dbo.Quotes`;
    const params: Record<string, any> = {};

    if (status) {
      query += ` WHERE Status = @status`;
      params.status = status.toLowerCase(); // Convert to lowercase
    }

    query += ` ORDER BY CreatedAt DESC`;
    return await executeQuery<Quote>(query, params);
  }

  /**
   * Get quote by ID with related items
   */
  static async getQuoteById(id: string): Promise<any> {
    const query = `
      SELECT * FROM dbo.Quotes WHERE Id = @id;
      
      SELECT * FROM dbo.QuoteWorkItems WHERE QuoteId = @id;
      
      SELECT * FROM dbo.QuoteLaborGroups WHERE QuoteId = @id;
      
      SELECT * FROM dbo.QuoteSelectedOptions WHERE QuoteId = @id
    `;

    const results = await executeQuery(query, { id });
    return {
      quote: results.length > 0 ? results[0] : null,
      workItems: results.slice(1),
    };
  }

  /**
   * Create new quote
   */
  static async createQuote(quote: Partial<Quote>): Promise<Quote> {
    const id = uuidv4();
    const now = new Date();
    
    // Validate status against database constraints
    const validStatusValues = ['draft', 'pending', 'sent', 'accepted', 'rejected', 'expired'];
    let status = (quote.Status || 'draft').toLowerCase();
    if (!validStatusValues.includes(status)) {
      status = 'draft'; // Default to draft if invalid
    }

    const query = `
      INSERT INTO dbo.Quotes 
      (Id, QuoteType, CustomerId, CustomerName, Status, NumberOfUsers, DurationMonths, CreatedAt, UpdatedAt)
      VALUES 
      (@id, @quoteType, @customerId, @customerName, @status, @numberOfUsers, @durationMonths, @createdAt, @updatedAt);
      
      SELECT * FROM dbo.Quotes WHERE Id = @id
    `;

    const params = {
      id,
      quoteType: quote.QuoteType || 'Standard',
      customerId: quote.CustomerId || null,
      customerName: quote.CustomerName || '',
      status,  // Now lowercase and validated
      numberOfUsers: quote.NumberOfUsers || 1,
      durationMonths: quote.DurationMonths || 1,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const results = await executeQuery<Quote>(query, params);
      if (!results || results.length === 0) {
        console.error('❌ INSERT executed but no result returned');
        throw new Error('Quote created but not found in SELECT');
      }
      return results[0];
    } catch (error) {
      console.error('❌ Error creating quote:', error);
      throw error;
    }
  }

  /**
   * Update quote
   */
  static async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | null> {
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
      const result = await this.getQuoteById(id);
      return result.quote;
    }

    params.updatedAt = new Date();
    fields.push('UpdatedAt = @updatedAt');

    const query = `
      UPDATE dbo.Quotes 
      SET ${fields.join(', ')}
      WHERE Id = @id;
      
      SELECT * FROM dbo.Quotes WHERE Id = @id
    `;

    try {
      const results = await executeQuery<Quote>(query, params);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('❌ Error updating quote:', error);
      throw error;
    }
  }

  /**
   * Delete quote (cascades to related items)
   */
  static async deleteQuote(id: string): Promise<boolean> {
    const query = `DELETE FROM dbo.Quotes WHERE Id = @id`;
    await executeQuery(query, { id });
    return true;
  }

  /**
   * Get quotes by customer
   */
  static async getQuotesByCustomer(customerId: string): Promise<Quote[]> {
    const query = `
      SELECT * FROM dbo.Quotes 
      WHERE CustomerId = @customerId
      ORDER BY CreatedAt DESC
    `;
    return await executeQuery<Quote>(query, { customerId });
  }

  /**
   * Get quotes by status
   */
  static async getQuotesByStatus(status: string): Promise<Quote[]> {
    const query = `
      SELECT * FROM dbo.Quotes 
      WHERE Status = @status
      ORDER BY CreatedAt DESC
    `;
    return await executeQuery<Quote>(query, { status: status.toLowerCase() });
  }

  /**
   * Add work item to quote
   */
  static async addWorkItem(quoteId: string, item: any): Promise<any> {
    const itemId = uuidv4();
    const now = new Date();
    const query = `
      INSERT INTO dbo.QuoteWorkItems 
      (Id, QuoteId, Name, ReferenceArchitecture, Section, HoursPerUnit, RatePerHour, CreatedAt, UpdatedAt)
      VALUES 
      (@id, @quoteId, @name, @refArch, @section, @hours, @rate, @createdAt, @updatedAt);
      
      SELECT * FROM dbo.QuoteWorkItems WHERE Id = @id
    `;

    const params = {
      id: itemId,
      quoteId,
      name: item.Name || '',
      refArch: item.ReferenceArchitecture || null,
      section: item.Section || null,
      hours: item.HoursPerUnit || 0,
      rate: item.RatePerHour || 0,
      createdAt: now,
      updatedAt: now,
    };

    const results = await executeQuery(query, params);
    return results[0];
  }

  /**
   * Calculate quote total with function
   */
  static async calculateQuoteTotal(baseTotal: number, setupFee: number, discount: number): Promise<number> {
    const query = `
      SELECT dbo.fn_CalculateQuoteTotal(@base, @setup, @discount) AS Total
    `;
    const results = await executeQuery<any>(query, { base: baseTotal, setup: setupFee, discount });
    return results[0]?.Total || 0;
  }
}
