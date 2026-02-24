import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeStoredProcedure } from '../config/database';

/**
 * Quote Service - Handle quote-related database operations
 * Updated to support full quote data including service levels, add-ons, and pricing breakdown
 */

export interface QuoteSelectedOption {
  Id?: string;
  id?: string;
  QuoteId?: string;
  OptionId?: string;
  optionId?: string;
  Name?: string;
  name?: string;
  MonthlyPrice?: number;
  monthlyPrice?: number;
  PricingUnit?: string;
  pricingUnit?: string;
  CreatedAt?: Date;
}

export interface Quote {
  Id: string;
  QuoteType: string;
  CustomerId?: string;
  CustomerName: string;
  Notes?: string;
  ServiceName?: string;
  ServiceLevelName?: string;
  PricingUnitLabel?: string;
  BasePricePerUnit?: number;
  ProfessionalServicesPrice?: number;
  ProfessionalServicesTotal?: number;
  PerUnitTotal?: number;
  AddOnMonthlyTotal?: number;
  AddOnOneTimeTotal?: number;
  AddOnPerUnitTotal?: number;
  NumberOfUsers: number;
  DurationMonths: number;
  MonthlyPrice: number;
  TotalPrice: number;
  SetupFee: number;
  DiscountAmount: number;
  AnnualDiscountApplied?: boolean;
  TotalHours: number;
  Status: string;
  ExpiresAt?: Date;
  AcceptedAt?: Date;
  CreatedDate?: string;
  CreatedTime?: string;
  CreatedBy?: string;
  CreatedByEmail?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
  // Related items (for retrieval)
  selectedOptions?: QuoteSelectedOption[];
}

export class QuoteService {
  /**
   * Get all quotes
   */
  static async getAllQuotes(status?: string): Promise<any[]> {
    let query = `SELECT * FROM dbo.Quotes`;
    const params: Record<string, any> = {};

    if (status) {
      query += ` WHERE Status = @status`;
      params.status = status.toLowerCase();
    }

    query += ` ORDER BY CreatedAt DESC`;
    const quotes = await executeQuery<Quote>(query, params);
    
    const enrichedQuotes: any[] = [];
    for (const quote of quotes) {
      quote.selectedOptions = await this.getQuoteSelectedOptions(quote.Id);

      // Fetch work items and labor groups for labor quotes
      if ((quote.QuoteType || '').toLowerCase() === 'labor') {
        const workItemsQuery = `SELECT * FROM dbo.QuoteWorkItems WHERE QuoteId = @quoteId ORDER BY CreatedAt`;
        const laborGroupsQuery = `SELECT * FROM dbo.QuoteLaborGroups WHERE QuoteId = @quoteId ORDER BY Section`;
        const [workItems, laborGroups] = await Promise.all([
          executeQuery(workItemsQuery, { quoteId: quote.Id }),
          executeQuery(laborGroupsQuery, { quoteId: quote.Id })
        ]);
        enrichedQuotes.push({
          ...quote,
          workItems: workItems.map((wi: any) => ({
            name: wi.Name,
            referenceArchitecture: wi.ReferenceArchitecture,
            section: wi.Section,
            unitOfMeasure: wi.UnitOfMeasure,
            closetCount: wi.ClosetCount,
            switchCount: wi.SwitchCount,
            hoursPerSwitch: wi.HoursPerUnit,
            ratePerHour: wi.RatePerHour,
            lineHours: wi.LineHours,
            lineTotal: wi.LineTotal,
            solutionName: wi.SolutionName
          })),
          laborGroups: laborGroups.map((lg: any) => ({
            section: lg.Section,
            total: lg.Total,
            items: lg.ItemCount
          }))
        });
      } else {
        enrichedQuotes.push(quote);
      }
    }
    
    return enrichedQuotes;
  }

  /**
   * Get selected options for a quote
   */
  static async getQuoteSelectedOptions(quoteId: string): Promise<QuoteSelectedOption[]> {
    const query = `SELECT * FROM dbo.QuoteSelectedOptions WHERE QuoteId = @quoteId ORDER BY CreatedAt`;
    return await executeQuery<QuoteSelectedOption>(query, { quoteId });
  }

  /**
   * Get quote by ID with related items
   */
  static async getQuoteById(id: string): Promise<{ quote: Quote | null; workItems: any[]; laborGroups: any[]; selectedOptions: QuoteSelectedOption[] }> {
    const quoteQuery = `SELECT * FROM dbo.Quotes WHERE Id = @id`;
    const quotes = await executeQuery<Quote>(quoteQuery, { id });
    
    if (quotes.length === 0) {
      return { quote: null, workItems: [], laborGroups: [], selectedOptions: [] };
    }

    const workItemsQuery = `SELECT * FROM dbo.QuoteWorkItems WHERE QuoteId = @id ORDER BY CreatedAt`;
    const laborGroupsQuery = `SELECT * FROM dbo.QuoteLaborGroups WHERE QuoteId = @id ORDER BY Section`;
    const selectedOptionsQuery = `SELECT * FROM dbo.QuoteSelectedOptions WHERE QuoteId = @id ORDER BY CreatedAt`;

    const [workItems, laborGroups, selectedOptions] = await Promise.all([
      executeQuery(workItemsQuery, { id }),
      executeQuery(laborGroupsQuery, { id }),
      executeQuery<QuoteSelectedOption>(selectedOptionsQuery, { id })
    ]);

    const quote = quotes[0];
    quote.selectedOptions = selectedOptions;

    return {
      quote,
      workItems,
      laborGroups,
      selectedOptions
    };
  }

  /**
   * Create new quote with all related data
   */
  static async createQuote(quote: Partial<Quote> & { selectedOptions?: any[] }): Promise<Quote> {
    const id = uuidv4();
    const now = new Date();
    
    // Validate status against database constraints
    const validStatusValues = ['draft', 'pending', 'sent', 'accepted', 'rejected', 'expired'];
    let status = (quote.Status || 'draft').toLowerCase();
    if (!validStatusValues.includes(status)) {
      status = 'draft';
    }

    // Map camelCase to PascalCase for frontend compatibility
    const serviceLevelName = quote.ServiceLevelName || (quote as any).serviceLevelName || null;
    const pricingUnitLabel = quote.PricingUnitLabel || (quote as any).pricingUnitLabel || null;
    const basePricePerUnit = quote.BasePricePerUnit ?? (quote as any).basePricePerUnit ?? 0;
    const professionalServicesPrice = quote.ProfessionalServicesPrice ?? (quote as any).professionalServicesPrice ?? 0;
    const professionalServicesTotal = quote.ProfessionalServicesTotal ?? (quote as any).professionalServicesTotal ?? 0;
    const perUnitTotal = quote.PerUnitTotal ?? (quote as any).perUnitTotal ?? 0;
    const addOnMonthlyTotal = quote.AddOnMonthlyTotal ?? (quote as any).addOnMonthlyTotal ?? 0;
    const addOnOneTimeTotal = quote.AddOnOneTimeTotal ?? (quote as any).addOnOneTimeTotal ?? 0;
    const addOnPerUnitTotal = quote.AddOnPerUnitTotal ?? (quote as any).addOnPerUnitTotal ?? 0;
    const annualDiscountApplied = quote.AnnualDiscountApplied ?? (quote as any).annualDiscountApplied ?? false;
    const createdDate = quote.CreatedDate || (quote as any).createdDate || now.toLocaleDateString();
    const createdTime = quote.CreatedTime || (quote as any).createdTime || now.toLocaleTimeString();
    const createdBy = quote.CreatedBy || (quote as any).createdBy || null;
    const createdByEmail = quote.CreatedByEmail || (quote as any).createdByEmail || null;
    const serviceName = quote.ServiceName || (quote as any).service || null;
    const monthlyPrice = quote.MonthlyPrice ?? (quote as any).monthlyPrice ?? 0;
    const totalPrice = quote.TotalPrice ?? (quote as any).totalPrice ?? 0;
    const setupFee = quote.SetupFee ?? (quote as any).setupFee ?? 0;
    const discountAmount = quote.DiscountAmount ?? (quote as any).discountAmount ?? 0;
    const numberOfUsers = quote.NumberOfUsers ?? (quote as any).numberOfUsers ?? 1;
    const durationMonths = quote.DurationMonths ?? (quote as any).durationMonths ?? 1;

    const query = `
      INSERT INTO dbo.Quotes 
      (Id, QuoteType, CustomerId, CustomerName, Notes, ServiceName, ServiceLevelName, PricingUnitLabel,
       BasePricePerUnit, ProfessionalServicesPrice, ProfessionalServicesTotal, PerUnitTotal,
       AddOnMonthlyTotal, AddOnOneTimeTotal, AddOnPerUnitTotal, NumberOfUsers, DurationMonths,
       MonthlyPrice, TotalPrice, SetupFee, DiscountAmount, AnnualDiscountApplied, TotalHours,
       Status, CreatedDate, CreatedTime, CreatedBy, CreatedByEmail, CreatedAt, UpdatedAt)
      VALUES 
      (@id, @quoteType, @customerId, @customerName, @notes, @serviceName, @serviceLevelName, @pricingUnitLabel,
       @basePricePerUnit, @professionalServicesPrice, @professionalServicesTotal, @perUnitTotal,
       @addOnMonthlyTotal, @addOnOneTimeTotal, @addOnPerUnitTotal, @numberOfUsers, @durationMonths,
       @monthlyPrice, @totalPrice, @setupFee, @discountAmount, @annualDiscountApplied, @totalHours,
       @status, @createdDate, @createdTime, @createdBy, @createdByEmail, @createdAt, @updatedAt);
      
      SELECT * FROM dbo.Quotes WHERE Id = @id
    `;

    const params = {
      id,
      quoteType: quote.QuoteType || (quote as any).type || 'msp',
      customerId: quote.CustomerId || null,
      customerName: quote.CustomerName || (quote as any).customerName || '',
      notes: quote.Notes || (quote as any).notes || '',
      serviceName,
      serviceLevelName,
      pricingUnitLabel,
      basePricePerUnit,
      professionalServicesPrice,
      professionalServicesTotal,
      perUnitTotal,
      addOnMonthlyTotal,
      addOnOneTimeTotal,
      addOnPerUnitTotal,
      numberOfUsers,
      durationMonths,
      monthlyPrice,
      totalPrice,
      setupFee,
      discountAmount,
      annualDiscountApplied: annualDiscountApplied ? 1 : 0,
      totalHours: quote.TotalHours ?? (quote as any).totalHours ?? 0,
      status,
      createdDate,
      createdTime,
      createdBy,
      createdByEmail,
      createdAt: now,
      updatedAt: now,
    };

    try {
      console.log('[QuoteService] Creating quote with params:', JSON.stringify(params, null, 2));
      const results = await executeQuery<Quote>(query, params);
      
      if (!results || results.length === 0) {
        console.error('❌ INSERT executed but no result returned');
        throw new Error('Quote created but not found in SELECT');
      }

      const createdQuote = results[0];

      // Save selected options if provided
      const selectedOptions = quote.selectedOptions || (quote as any).selectedOptions || [];
      if (selectedOptions.length > 0) {
        await this.saveSelectedOptions(id, selectedOptions);
        createdQuote.selectedOptions = await this.getQuoteSelectedOptions(id);
      }

      console.log('[QuoteService] Quote created successfully:', createdQuote.Id);
      return createdQuote;
    } catch (error) {
      console.error('❌ Error creating quote:', error);
      throw error;
    }
  }

  /**
   * Save selected options for a quote
   */
  static async saveSelectedOptions(quoteId: string, options: any[]): Promise<void> {
    // First, delete existing options
    await executeQuery(`DELETE FROM dbo.QuoteSelectedOptions WHERE QuoteId = @quoteId`, { quoteId });

    // Insert new options
    for (const option of options) {
      const optionId = uuidv4();
      const query = `
        INSERT INTO dbo.QuoteSelectedOptions 
        (Id, QuoteId, OptionId, Name, MonthlyPrice, PricingUnit, CreatedAt)
        VALUES 
        (@id, @quoteId, @optionId, @name, @monthlyPrice, @pricingUnit, @createdAt)
      `;
      
      const params = {
        id: optionId,
        quoteId,
        optionId: option.id || option.Id || option.OptionId || option.optionId || '',
        name: option.name || option.Name || '',
        monthlyPrice: option.price ?? option.monthlyPrice ?? option.MonthlyPrice ?? 0,
        pricingUnit: option.pricingType || option.pricingUnit || option.PricingUnit || 'per-user',
        createdAt: new Date()
      };

      await executeQuery(query, params);
    }

    console.log(`[QuoteService] Saved ${options.length} selected options for quote ${quoteId}`);
  }

  /**
   * Update quote
   */
  static async updateQuote(id: string, updates: Partial<Quote> & { selectedOptions?: any[] }): Promise<Quote | null> {
    const fields: string[] = [];
    const params: Record<string, any> = { id };

    // Map all possible update fields (both PascalCase and camelCase)
    const fieldMappings: Record<string, string> = {
      CustomerName: 'customerName',
      Notes: 'notes',
      ServiceName: 'service',
      ServiceLevelName: 'serviceLevelName',
      PricingUnitLabel: 'pricingUnitLabel',
      BasePricePerUnit: 'basePricePerUnit',
      ProfessionalServicesPrice: 'professionalServicesPrice',
      ProfessionalServicesTotal: 'professionalServicesTotal',
      PerUnitTotal: 'perUnitTotal',
      AddOnMonthlyTotal: 'addOnMonthlyTotal',
      AddOnOneTimeTotal: 'addOnOneTimeTotal',
      AddOnPerUnitTotal: 'addOnPerUnitTotal',
      NumberOfUsers: 'numberOfUsers',
      DurationMonths: 'durationMonths',
      MonthlyPrice: 'monthlyPrice',
      TotalPrice: 'totalPrice',
      SetupFee: 'setupFee',
      DiscountAmount: 'discountAmount',
      AnnualDiscountApplied: 'annualDiscountApplied',
      TotalHours: 'totalHours',
      Status: 'status',
    };

    Object.keys(updates).forEach((key) => {
      if (key !== 'Id' && key !== 'CreatedAt' && key !== 'UpdatedAt' && key !== 'selectedOptions') {
        const dbKey = key;
        fields.push(`${dbKey} = @${dbKey}`);
        
        // Handle boolean conversion
        if (key === 'AnnualDiscountApplied') {
          params[dbKey] = (updates as any)[key] ? 1 : 0;
        } else if (key === 'Status') {
          params[dbKey] = ((updates as any)[key] || '').toLowerCase();
        } else {
          params[dbKey] = (updates as any)[key];
        }
      }
    });

    // Also check for camelCase versions
    Object.entries(fieldMappings).forEach(([dbKey, camelKey]) => {
      if ((updates as any)[camelKey] !== undefined && !params[dbKey]) {
        fields.push(`${dbKey} = @${dbKey}`);
        if (dbKey === 'AnnualDiscountApplied') {
          params[dbKey] = (updates as any)[camelKey] ? 1 : 0;
        } else if (dbKey === 'Status') {
          params[dbKey] = ((updates as any)[camelKey] || '').toLowerCase();
        } else {
          params[dbKey] = (updates as any)[camelKey];
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
      
      // Update selected options if provided
      const selectedOptions = updates.selectedOptions;
      if (selectedOptions && Array.isArray(selectedOptions)) {
        await this.saveSelectedOptions(id, selectedOptions);
      }

      if (results.length > 0) {
        results[0].selectedOptions = await this.getQuoteSelectedOptions(id);
      }

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
    console.log(`[QuoteService] Deleted quote ${id}`);
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
    const quotes = await executeQuery<Quote>(query, { customerId });
    
    for (const quote of quotes) {
      quote.selectedOptions = await this.getQuoteSelectedOptions(quote.Id);
    }
    
    return quotes;
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
    const quotes = await executeQuery<Quote>(query, { status: status.toLowerCase() });
    
    for (const quote of quotes) {
      quote.selectedOptions = await this.getQuoteSelectedOptions(quote.Id);
    }
    
    return quotes;
  }

  /**
   * Add work item to quote
   */
  static async addWorkItem(quoteId: string, item: any): Promise<any> {
    const now = new Date();
    const query = `
      INSERT INTO dbo.QuoteWorkItems 
      (QuoteId, Name, ReferenceArchitecture, Section, UnitOfMeasure, ClosetCount, SwitchCount,
       HoursPerUnit, RatePerHour, LineHours, LineTotal, SolutionName, GroupName, SortOrder, CreatedAt)
      VALUES 
      (@quoteId, @name, @refArch, @section, @unitOfMeasure, @closetCount, @switchCount,
       @hours, @rate, @lineHours, @lineTotal, @solutionName, @groupName, @sortOrder, @createdAt);
      
      SELECT * FROM dbo.QuoteWorkItems WHERE QuoteId = @quoteId ORDER BY CreatedAt DESC
    `;

    const params = {
      quoteId,
      name: item.Name || item.name || '',
      refArch: item.ReferenceArchitecture || item.referenceArchitecture || null,
      section: item.Section || item.section || null,
      unitOfMeasure: item.UnitOfMeasure || item.unitOfMeasure || null,
      closetCount: item.ClosetCount ?? item.closetCount ?? 0,
      switchCount: item.SwitchCount ?? item.switchCount ?? 0,
      hours: item.HoursPerUnit ?? item.hoursPerSwitch ?? 0,
      rate: item.RatePerHour ?? item.ratePerHour ?? 0,
      lineHours: item.LineHours ?? item.lineHours ?? 0,
      lineTotal: item.LineTotal ?? item.lineTotal ?? 0,
      solutionName: item.SolutionName || item.solutionName || null,
      groupName: item.GroupName || item.groupName || 'Default',
      sortOrder: item.SortOrder ?? item.sortOrder ?? 0,
      createdAt: now,
    };

    const results = await executeQuery(query, params);
    return results[0];
  }

  /**
   * Add labor group to quote
   */
  static async addLaborGroup(quoteId: string, group: any): Promise<any> {
    const now = new Date();
    const query = `
      INSERT INTO dbo.QuoteLaborGroups 
      (QuoteId, Section, Total, ItemCount, CreatedAt)
      VALUES 
      (@quoteId, @section, @total, @itemCount, @createdAt);
      
      SELECT * FROM dbo.QuoteLaborGroups WHERE QuoteId = @quoteId ORDER BY CreatedAt DESC
    `;

    const params = {
      quoteId,
      section: group.Section || group.section || '',
      total: group.Total ?? group.total ?? 0,
      itemCount: group.ItemCount ?? group.items ?? 0,
      createdAt: now,
    };

    const results = await executeQuery(query, params);
    return results[0];
  }

  /**
   * Create labor quote with work items and groups
   */
  static async createLaborQuote(quote: Partial<Quote>, workItems: any[], laborGroups: any[]): Promise<Quote> {
    // Create the main quote
    const createdQuote = await this.createQuote({
      ...quote,
      QuoteType: 'labor'
    });

    // Add work items
    for (const item of workItems) {
      await this.addWorkItem(createdQuote.Id, item);
    }

    // Add labor groups
    for (const group of laborGroups) {
      await this.addLaborGroup(createdQuote.Id, group);
    }

    // Return complete quote
    const result = await this.getQuoteById(createdQuote.Id);
    return result.quote!;
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
