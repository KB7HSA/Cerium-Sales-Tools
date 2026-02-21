import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

/**
 * SOW Document Service - Handle SOW document-related database operations
 */

export interface SOWDocument {
  Id: string;
  QuoteId: string;
  CustomerName: string;
  ServiceName: string;
  FileName: string;
  FileData?: Buffer;
  FileSizeBytes: number;
  TotalValue: number;
  MonthlyValue: number;
  DurationMonths: number;
  GeneratedBy?: string;
  Status: 'generated' | 'sent' | 'signed' | 'expired' | 'cancelled';
  Notes?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface SOWDocumentSummary {
  Id: string;
  QuoteId: string;
  CustomerName: string;
  ServiceName: string;
  FileName: string;
  FileSizeBytes: number;
  TotalValue: number;
  MonthlyValue: number;
  DurationMonths: number;
  GeneratedBy?: string;
  Status: string;
  Notes?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class SOWDocumentService {
  /**
   * Get all SOW documents (without file data for performance)
   */
  static async getAllSOWDocuments(status?: string): Promise<SOWDocumentSummary[]> {
    let query = `
      SELECT 
        Id, QuoteId, CustomerName, ServiceName, FileName, FileSizeBytes, 
        TotalValue, MonthlyValue, DurationMonths, GeneratedBy, Status, Notes,
        CreatedAt, UpdatedAt
      FROM dbo.SOWDocuments
    `;
    const params: Record<string, any> = {};

    if (status) {
      query += ` WHERE Status = @status`;
      params.status = status.toLowerCase();
    }

    query += ` ORDER BY CreatedAt DESC`;
    return await executeQuery<SOWDocumentSummary>(query, params);
  }

  /**
   * Get SOW document by ID (with file data)
   */
  static async getSOWDocumentById(id: string): Promise<SOWDocument | null> {
    const query = `SELECT * FROM dbo.SOWDocuments WHERE Id = @id`;
    const results = await executeQuery<SOWDocument>(query, { id });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get SOW documents by Quote ID
   */
  static async getSOWDocumentsByQuoteId(quoteId: string): Promise<SOWDocumentSummary[]> {
    const query = `
      SELECT 
        Id, QuoteId, CustomerName, ServiceName, FileName, FileSizeBytes, 
        TotalValue, MonthlyValue, DurationMonths, GeneratedBy, Status, Notes,
        CreatedAt, UpdatedAt
      FROM dbo.SOWDocuments
      WHERE QuoteId = @quoteId
      ORDER BY CreatedAt DESC
    `;
    return await executeQuery<SOWDocumentSummary>(query, { quoteId });
  }

  /**
   * Create new SOW document
   */
  static async createSOWDocument(data: {
    QuoteId: string;
    CustomerName: string;
    ServiceName: string;
    FileName: string;
    FileData: Buffer;
    TotalValue?: number;
    MonthlyValue?: number;
    DurationMonths?: number;
    GeneratedBy?: string;
    Notes?: string;
  }): Promise<SOWDocumentSummary> {
    const id = uuidv4();
    const now = new Date();
    const fileSizeBytes = data.FileData.length;

    const query = `
      INSERT INTO dbo.SOWDocuments (
        Id, QuoteId, CustomerName, ServiceName, FileName, FileData, FileSizeBytes,
        TotalValue, MonthlyValue, DurationMonths, GeneratedBy, Status, Notes,
        CreatedAt, UpdatedAt
      ) VALUES (
        @id, @quoteId, @customerName, @serviceName, @fileName, @fileData, @fileSizeBytes,
        @totalValue, @monthlyValue, @durationMonths, @generatedBy, 'generated', @notes,
        @createdAt, @updatedAt
      )
    `;

    await executeQuery(query, {
      id,
      quoteId: data.QuoteId,
      customerName: data.CustomerName,
      serviceName: data.ServiceName,
      fileName: data.FileName,
      fileData: data.FileData,
      fileSizeBytes,
      totalValue: data.TotalValue || 0,
      monthlyValue: data.MonthlyValue || 0,
      durationMonths: data.DurationMonths || 0,
      generatedBy: data.GeneratedBy || null,
      notes: data.Notes || null,
      createdAt: now,
      updatedAt: now
    });

    return {
      Id: id,
      QuoteId: data.QuoteId,
      CustomerName: data.CustomerName,
      ServiceName: data.ServiceName,
      FileName: data.FileName,
      FileSizeBytes: fileSizeBytes,
      TotalValue: data.TotalValue || 0,
      MonthlyValue: data.MonthlyValue || 0,
      DurationMonths: data.DurationMonths || 0,
      GeneratedBy: data.GeneratedBy,
      Status: 'generated',
      Notes: data.Notes,
      CreatedAt: now,
      UpdatedAt: now
    };
  }

  /**
   * Update SOW document status
   */
  static async updateSOWDocumentStatus(id: string, status: string): Promise<boolean> {
    const query = `
      UPDATE dbo.SOWDocuments 
      SET Status = @status, UpdatedAt = GETUTCDATE()
      WHERE Id = @id
    `;
    await executeQuery(query, { id, status });
    return true;
  }

  /**
   * Update SOW document
   */
  static async updateSOWDocument(id: string, data: Partial<{
    Notes: string;
    Status: string;
  }>): Promise<SOWDocumentSummary | null> {
    const setClauses: string[] = ['UpdatedAt = GETUTCDATE()'];
    const params: Record<string, any> = { id };

    if (data.Notes !== undefined) {
      setClauses.push('Notes = @notes');
      params.notes = data.Notes;
    }
    if (data.Status !== undefined) {
      setClauses.push('Status = @status');
      params.status = data.Status;
    }

    const query = `
      UPDATE dbo.SOWDocuments 
      SET ${setClauses.join(', ')}
      WHERE Id = @id
    `;
    
    await executeQuery(query, params);
    
    // Return updated document without file data
    const selectQuery = `
      SELECT 
        Id, QuoteId, CustomerName, ServiceName, FileName, FileSizeBytes, 
        TotalValue, MonthlyValue, DurationMonths, GeneratedBy, Status, Notes,
        CreatedAt, UpdatedAt
      FROM dbo.SOWDocuments
      WHERE Id = @id
    `;
    const results = await executeQuery<SOWDocumentSummary>(selectQuery, { id });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Delete SOW document
   */
  static async deleteSOWDocument(id: string): Promise<boolean> {
    const query = `DELETE FROM dbo.SOWDocuments WHERE Id = @id`;
    await executeQuery(query, { id });
    return true;
  }

  /**
   * Get file data for download
   */
  static async getSOWDocumentFile(id: string): Promise<{ fileName: string; fileData: Buffer } | null> {
    const query = `SELECT FileName, FileData FROM dbo.SOWDocuments WHERE Id = @id`;
    const results = await executeQuery<{ FileName: string; FileData: Buffer }>(query, { id });
    
    if (results.length === 0) {
      return null;
    }

    return {
      fileName: results[0].FileName,
      fileData: results[0].FileData
    };
  }
}
