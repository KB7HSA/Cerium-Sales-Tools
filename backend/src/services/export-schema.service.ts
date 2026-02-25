import { executeQuery } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface ExportSchema {
  Id: string;
  Name: string;
  QuoteType: string;
  Description?: string;
  IsDefault: boolean;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
  columns?: ExportSchemaColumn[];
}

export interface ExportSchemaColumn {
  Id: string;
  SchemaId: string;
  SourceField: string;
  ExportHeader: string;
  DisplayOrder: number;
  IsIncluded: boolean;
  FormatType?: string;
  CreatedAt: Date;
}

/**
 * Available quote fields for export configuration
 */
export const AVAILABLE_QUOTE_FIELDS = [
  { field: 'Id', label: 'Quote ID', formatType: 'text' },
  { field: 'QuoteType', label: 'Quote Type', formatType: 'text' },
  { field: 'CustomerName', label: 'Customer Name', formatType: 'text' },
  { field: 'ServiceName', label: 'Service Name', formatType: 'text' },
  { field: 'ServiceLevelName', label: 'Service Level', formatType: 'text' },
  { field: 'PricingUnitLabel', label: 'Pricing Unit', formatType: 'text' },
  { field: 'NumberOfUsers', label: 'Number of Users', formatType: 'number' },
  { field: 'DurationMonths', label: 'Duration (Months)', formatType: 'number' },
  { field: 'BasePricePerUnit', label: 'Base Price Per Unit', formatType: 'currency' },
  { field: 'ProfessionalServicesPrice', label: 'Professional Services Price', formatType: 'currency' },
  { field: 'ProfessionalServicesTotal', label: 'Professional Services Total', formatType: 'currency' },
  { field: 'PerUnitTotal', label: 'Per Unit Total', formatType: 'currency' },
  { field: 'AddOnMonthlyTotal', label: 'Add-On Monthly Total', formatType: 'currency' },
  { field: 'AddOnOneTimeTotal', label: 'Add-On One-Time Total', formatType: 'currency' },
  { field: 'AddOnPerUnitTotal', label: 'Add-On Per Unit Total', formatType: 'currency' },
  { field: 'MonthlyPrice', label: 'Monthly Price', formatType: 'currency' },
  { field: 'TotalPrice', label: 'Total Price', formatType: 'currency' },
  { field: 'SetupFee', label: 'Setup Fee', formatType: 'currency' },
  { field: 'DiscountAmount', label: 'Discount Amount', formatType: 'currency' },
  { field: 'AnnualDiscountApplied', label: 'Annual Discount Applied', formatType: 'boolean' },
  { field: 'TotalHours', label: 'Total Hours', formatType: 'number' },
  { field: 'Status', label: 'Status', formatType: 'text' },
  { field: 'Notes', label: 'Notes', formatType: 'text' },
  { field: 'CreatedDate', label: 'Created Date', formatType: 'date' },
  { field: 'CreatedTime', label: 'Created Time', formatType: 'text' },
  { field: 'CreatedAt', label: 'Created At', formatType: 'datetime' },
  { field: 'UpdatedAt', label: 'Updated At', formatType: 'datetime' },
  // Work item fields (labor quotes export one row per work item)
  { field: 'workItem.name', label: 'Work Item Name', formatType: 'text' },
  { field: 'workItem.referenceArchitecture', label: 'Reference Architecture', formatType: 'text' },
  { field: 'workItem.section', label: 'Section', formatType: 'text' },
  { field: 'workItem.unitOfMeasure', label: 'Unit of Measure', formatType: 'text' },
  { field: 'workItem.solutionName', label: 'Solution Name', formatType: 'text' },
  { field: 'workItem.groupName', label: 'Group Name', formatType: 'text' },
  { field: 'workItem.closetCount', label: 'Closet Count', formatType: 'number' },
  { field: 'workItem.switchCount', label: 'Quantity', formatType: 'number' },
  { field: 'workItem.hoursPerSwitch', label: 'Hours Per Unit', formatType: 'number' },
  { field: 'workItem.ratePerHour', label: 'Rate Per Hour', formatType: 'currency' },
  { field: 'workItem.lineHours', label: 'Line Hours', formatType: 'number' },
  { field: 'workItem.lineTotal', label: 'Line Total', formatType: 'currency' },
];

export class ExportSchemaService {
  /**
   * Get all export schemas
   */
  static async getAllSchemas(): Promise<ExportSchema[]> {
    const query = `
      SELECT * FROM dbo.ExportSchemas 
      WHERE IsActive = 1
      ORDER BY QuoteType, Name
    `;
    const schemas = await executeQuery<ExportSchema>(query);
    
    // Load columns for each schema
    for (const schema of schemas) {
      schema.columns = await this.getSchemaColumns(schema.Id);
    }
    
    return schemas;
  }

  /**
   * Get schemas by quote type
   */
  static async getSchemasByQuoteType(quoteType: string): Promise<ExportSchema[]> {
    const query = `
      SELECT * FROM dbo.ExportSchemas 
      WHERE QuoteType = @quoteType AND IsActive = 1
      ORDER BY IsDefault DESC, Name
    `;
    const schemas = await executeQuery<ExportSchema>(query, { quoteType });
    
    for (const schema of schemas) {
      schema.columns = await this.getSchemaColumns(schema.Id);
    }
    
    return schemas;
  }

  /**
   * Get default schema for quote type
   */
  static async getDefaultSchema(quoteType: string): Promise<ExportSchema | null> {
    const query = `
      SELECT * FROM dbo.ExportSchemas 
      WHERE QuoteType = @quoteType AND IsDefault = 1 AND IsActive = 1
    `;
    const results = await executeQuery<ExportSchema>(query, { quoteType });
    
    if (results.length > 0) {
      results[0].columns = await this.getSchemaColumns(results[0].Id);
      return results[0];
    }
    
    return null;
  }

  /**
   * Get schema by ID
   */
  static async getSchemaById(id: string): Promise<ExportSchema | null> {
    const query = `SELECT * FROM dbo.ExportSchemas WHERE Id = @id`;
    const results = await executeQuery<ExportSchema>(query, { id });
    
    if (results.length > 0) {
      results[0].columns = await this.getSchemaColumns(results[0].Id);
      return results[0];
    }
    
    return null;
  }

  /**
   * Get columns for a schema
   */
  static async getSchemaColumns(schemaId: string): Promise<ExportSchemaColumn[]> {
    const query = `
      SELECT * FROM dbo.ExportSchemaColumns 
      WHERE SchemaId = @schemaId
      ORDER BY DisplayOrder
    `;
    return executeQuery<ExportSchemaColumn>(query, { schemaId });
  }

  /**
   * Create new export schema
   */
  static async createSchema(schema: Partial<ExportSchema> & { columns?: Partial<ExportSchemaColumn>[] }): Promise<ExportSchema> {
    const id = uuidv4();
    const now = new Date();
    
    // If this schema is being set as default, unset other defaults for this quote type
    if (schema.IsDefault) {
      await executeQuery(
        `UPDATE dbo.ExportSchemas SET IsDefault = 0 WHERE QuoteType = @quoteType`,
        { quoteType: schema.QuoteType }
      );
    }
    
    const query = `
      INSERT INTO dbo.ExportSchemas (Id, Name, QuoteType, Description, IsDefault, IsActive, CreatedAt, UpdatedAt)
      VALUES (@id, @name, @quoteType, @description, @isDefault, @isActive, @createdAt, @updatedAt);
      
      SELECT * FROM dbo.ExportSchemas WHERE Id = @id
    `;
    
    const params = {
      id,
      name: schema.Name || 'Untitled Schema',
      quoteType: schema.QuoteType || 'msp',
      description: schema.Description || null,
      isDefault: schema.IsDefault ? 1 : 0,
      isActive: schema.IsActive !== false ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    };
    
    const results = await executeQuery<ExportSchema>(query, params);
    const createdSchema = results[0];
    
    // Create columns if provided
    if (schema.columns && schema.columns.length > 0) {
      await this.saveSchemaColumns(id, schema.columns);
      createdSchema.columns = await this.getSchemaColumns(id);
    } else {
      createdSchema.columns = [];
    }
    
    console.log(`[ExportSchemaService] Created schema: ${createdSchema.Name}`);
    return createdSchema;
  }

  /**
   * Update export schema
   */
  static async updateSchema(id: string, updates: Partial<ExportSchema> & { columns?: Partial<ExportSchemaColumn>[] }): Promise<ExportSchema | null> {
    const now = new Date();
    
    // If this schema is being set as default, unset other defaults for this quote type
    if (updates.IsDefault) {
      const existing = await this.getSchemaById(id);
      if (existing) {
        await executeQuery(
          `UPDATE dbo.ExportSchemas SET IsDefault = 0 WHERE QuoteType = @quoteType AND Id != @id`,
          { quoteType: existing.QuoteType, id }
        );
      }
    }
    
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    
    if (updates.Name !== undefined) {
      fields.push('Name = @name');
      params.name = updates.Name;
    }
    if (updates.Description !== undefined) {
      fields.push('Description = @description');
      params.description = updates.Description;
    }
    if (updates.IsDefault !== undefined) {
      fields.push('IsDefault = @isDefault');
      params.isDefault = updates.IsDefault ? 1 : 0;
    }
    if (updates.IsActive !== undefined) {
      fields.push('IsActive = @isActive');
      params.isActive = updates.IsActive ? 1 : 0;
    }
    
    fields.push('UpdatedAt = @updatedAt');
    params.updatedAt = now;
    
    if (fields.length > 1) {
      const query = `
        UPDATE dbo.ExportSchemas 
        SET ${fields.join(', ')}
        WHERE Id = @id;
        
        SELECT * FROM dbo.ExportSchemas WHERE Id = @id
      `;
      
      await executeQuery(query, params);
    }
    
    // Update columns if provided
    if (updates.columns !== undefined) {
      await this.saveSchemaColumns(id, updates.columns);
    }
    
    return this.getSchemaById(id);
  }

  /**
   * Save schema columns (replace all)
   */
  static async saveSchemaColumns(schemaId: string, columns: Partial<ExportSchemaColumn>[]): Promise<void> {
    // Delete existing columns
    await executeQuery(`DELETE FROM dbo.ExportSchemaColumns WHERE SchemaId = @schemaId`, { schemaId });
    
    // Insert new columns
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const query = `
        INSERT INTO dbo.ExportSchemaColumns (Id, SchemaId, SourceField, ExportHeader, DisplayOrder, IsIncluded, FormatType, CreatedAt)
        VALUES (@id, @schemaId, @sourceField, @exportHeader, @displayOrder, @isIncluded, @formatType, @createdAt)
      `;
      
      const params = {
        id: col.Id || uuidv4(),
        schemaId,
        sourceField: col.SourceField || '',
        exportHeader: col.ExportHeader || col.SourceField || '',
        displayOrder: col.DisplayOrder ?? i,
        isIncluded: col.IsIncluded !== false ? 1 : 0,
        formatType: col.FormatType || 'text',
        createdAt: new Date(),
      };
      
      await executeQuery(query, params);
    }
    
    console.log(`[ExportSchemaService] Saved ${columns.length} columns for schema ${schemaId}`);
  }

  /**
   * Delete export schema
   */
  static async deleteSchema(id: string): Promise<boolean> {
    // Columns will cascade delete due to FK constraint
    await executeQuery(`DELETE FROM dbo.ExportSchemas WHERE Id = @id`, { id });
    console.log(`[ExportSchemaService] Deleted schema ${id}`);
    return true;
  }

  /**
   * Get available quote fields for configuration
   */
  static getAvailableFields() {
    return AVAILABLE_QUOTE_FIELDS;
  }

  /**
   * Get quote types
   */
  static getQuoteTypes() {
    return [
      { value: 'msp', label: 'MSP Service' },
      { value: 'labor', label: 'Labor Budget' },
    ];
  }
}
