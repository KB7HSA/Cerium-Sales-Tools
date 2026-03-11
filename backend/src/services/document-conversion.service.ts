import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

// ================================================================
// INTERFACES
// ================================================================

export interface DocumentConversionType {
  Id?: string;
  Name: string;
  Description?: string;
  Category?: string;
  TemplateFileName?: string;
  HeaderContent?: string;
  FooterContent?: string;
  HeaderXml?: string;
  FooterXml?: string;
  OutputFileNamePattern?: string;
  AcceptedFileTypes?: string; // 'docx', 'pdf', or 'both'
  ConversionMethod?: string; // 'template-apply', 'pdf-to-docx', 'pdf-extract'
  UseAdobeApi?: boolean; // true = use ConvertAPI, false = local conversion
  IsActive: boolean;
  SortOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export interface ConvertedDocument {
  Id?: string;
  ConversionTypeId: string;
  OriginalFileName: string;
  ConvertedFileName?: string;
  FileData?: Buffer;
  FileSizeBytes?: number;
  Status: string;
  ConvertedBy?: string;
  Notes?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  // Joined fields
  ConversionTypeName?: string;
}

// ================================================================
// DOCUMENT CONVERSION TYPE SERVICE
// ================================================================

export class DocumentConversionTypeService {
  /**
   * Get all document conversion types
   */
  static async getAll(activeOnly: boolean = false): Promise<DocumentConversionType[]> {
    let query = `
      SELECT Id, Name, Description, Category, TemplateFileName,
             HeaderContent, FooterContent, HeaderXml, FooterXml,
             OutputFileNamePattern,
             AcceptedFileTypes, ConversionMethod, UseAdobeApi,
             IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.DocumentConversionTypes
    `;
    if (activeOnly) {
      query += ` WHERE IsActive = 1`;
    }
    query += ` ORDER BY SortOrder ASC, Name ASC`;

    try {
      return await executeQuery<DocumentConversionType>(query, {});
    } catch (error) {
      console.error('Error fetching document conversion types:', error);
      throw error;
    }
  }

  /**
   * Get document conversion type by ID
   */
  static async getById(id: string): Promise<DocumentConversionType | null> {
    const query = `
      SELECT Id, Name, Description, Category, TemplateFileName,
             HeaderContent, FooterContent, HeaderXml, FooterXml,
             OutputFileNamePattern,
             AcceptedFileTypes, ConversionMethod, UseAdobeApi,
             IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.DocumentConversionTypes
      WHERE Id = @id
    `;

    try {
      const results = await executeQuery<DocumentConversionType>(query, { id });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error fetching document conversion type:', error);
      throw error;
    }
  }

  /**
   * Create new document conversion type
   */
  static async create(convType: DocumentConversionType): Promise<DocumentConversionType> {
    const id = uuidv4();
    const query = `
      INSERT INTO dbo.DocumentConversionTypes (
        Id, Name, Description, Category, TemplateFileName,
        HeaderContent, FooterContent, HeaderXml, FooterXml,
        OutputFileNamePattern,
        AcceptedFileTypes, ConversionMethod, UseAdobeApi,
        IsActive, SortOrder, CreatedAt, UpdatedAt
      )
      VALUES (
        @id, @name, @description, @category, @templateFileName,
        @headerContent, @footerContent, @headerXml, @footerXml,
        @outputFileNamePattern,
        @acceptedFileTypes, @conversionMethod, @useAdobeApi,
        @isActive, @sortOrder, GETUTCDATE(), GETUTCDATE()
      );

      SELECT Id, Name, Description, Category, TemplateFileName,
             HeaderContent, FooterContent, HeaderXml, FooterXml,
             OutputFileNamePattern,
             AcceptedFileTypes, ConversionMethod, UseAdobeApi,
             IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.DocumentConversionTypes WHERE Id = @id;
    `;

    try {
      const results = await executeQuery<DocumentConversionType>(query, {
        id,
        name: convType.Name,
        description: convType.Description || null,
        category: convType.Category || null,
        templateFileName: convType.TemplateFileName || null,
        headerContent: convType.HeaderContent || null,
        footerContent: convType.FooterContent || null,
        headerXml: convType.HeaderXml || null,
        footerXml: convType.FooterXml || null,
        outputFileNamePattern: convType.OutputFileNamePattern || '{originalName}_converted',
        acceptedFileTypes: convType.AcceptedFileTypes || 'docx',
        conversionMethod: convType.ConversionMethod || 'template-apply',
        useAdobeApi: convType.UseAdobeApi ? 1 : 0,
        isActive: convType.IsActive ?? true,
        sortOrder: convType.SortOrder ?? 0
      });

      return results[0];
    } catch (error) {
      console.error('Error creating document conversion type:', error);
      throw error;
    }
  }

  /**
   * Update document conversion type
   */
  static async update(id: string, convType: Partial<DocumentConversionType>): Promise<DocumentConversionType | null> {
    const query = `
      UPDATE dbo.DocumentConversionTypes
      SET Name = @name,
          Description = @description,
          Category = @category,
          TemplateFileName = @templateFileName,
          HeaderContent = @headerContent,
          FooterContent = @footerContent,
          HeaderXml = @headerXml,
          FooterXml = @footerXml,
          OutputFileNamePattern = @outputFileNamePattern,
          AcceptedFileTypes = @acceptedFileTypes,
          ConversionMethod = @conversionMethod,
          UseAdobeApi = @useAdobeApi,
          IsActive = @isActive,
          SortOrder = @sortOrder,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @id;

      SELECT Id, Name, Description, Category, TemplateFileName,
             HeaderContent, FooterContent, HeaderXml, FooterXml,
             OutputFileNamePattern,
             AcceptedFileTypes, ConversionMethod, UseAdobeApi,
             IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.DocumentConversionTypes WHERE Id = @id;
    `;

    try {
      const results = await executeQuery<DocumentConversionType>(query, {
        id,
        name: convType.Name || '',
        description: convType.Description || null,
        category: convType.Category || null,
        templateFileName: convType.TemplateFileName || null,
        headerContent: convType.HeaderContent || null,
        footerContent: convType.FooterContent || null,
        headerXml: convType.HeaderXml || null,
        footerXml: convType.FooterXml || null,
        outputFileNamePattern: convType.OutputFileNamePattern || '{originalName}_converted',
        acceptedFileTypes: convType.AcceptedFileTypes || 'docx',
        conversionMethod: convType.ConversionMethod || 'template-apply',
        useAdobeApi: convType.UseAdobeApi ? 1 : 0,
        isActive: convType.IsActive ?? true,
        sortOrder: convType.SortOrder ?? 0
      });

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error updating document conversion type:', error);
      throw error;
    }
  }

  /**
   * Delete document conversion type
   */
  static async delete(id: string): Promise<void> {
    try {
      // Delete related converted documents first
      await executeQuery(`DELETE FROM dbo.ConvertedDocuments WHERE ConversionTypeId = @id`, { id });
      await executeQuery(`DELETE FROM dbo.DocumentConversionTypes WHERE Id = @id`, { id });
    } catch (error) {
      console.error('Error deleting document conversion type:', error);
      throw error;
    }
  }
}

// ================================================================
// CONVERTED DOCUMENT SERVICE
// ================================================================

export class ConvertedDocumentService {
  /**
   * Get all converted documents
   */
  static async getAll(): Promise<ConvertedDocument[]> {
    const query = `
      SELECT cd.Id, cd.ConversionTypeId, cd.OriginalFileName, cd.ConvertedFileName,
             cd.FileSizeBytes, cd.Status, cd.ConvertedBy, cd.Notes,
             cd.CreatedAt, cd.UpdatedAt,
             dct.Name AS ConversionTypeName
      FROM dbo.ConvertedDocuments cd
      LEFT JOIN dbo.DocumentConversionTypes dct ON cd.ConversionTypeId = dct.Id
      ORDER BY cd.CreatedAt DESC
    `;

    try {
      return await executeQuery<ConvertedDocument>(query, {});
    } catch (error) {
      console.error('Error fetching converted documents:', error);
      throw error;
    }
  }

  /**
   * Get converted document by ID
   */
  static async getById(id: string): Promise<ConvertedDocument | null> {
    const query = `
      SELECT cd.Id, cd.ConversionTypeId, cd.OriginalFileName, cd.ConvertedFileName,
             cd.FileSizeBytes, cd.Status, cd.ConvertedBy, cd.Notes,
             cd.CreatedAt, cd.UpdatedAt,
             dct.Name AS ConversionTypeName
      FROM dbo.ConvertedDocuments cd
      LEFT JOIN dbo.DocumentConversionTypes dct ON cd.ConversionTypeId = dct.Id
      WHERE cd.Id = @id
    `;

    try {
      const results = await executeQuery<ConvertedDocument>(query, { id });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error fetching converted document:', error);
      throw error;
    }
  }

  /**
   * Get file data for download
   */
  static async getFile(id: string): Promise<{ FileData: Buffer; FileName: string } | null> {
    const query = `
      SELECT FileData, ConvertedFileName AS FileName
      FROM dbo.ConvertedDocuments
      WHERE Id = @id
    `;

    try {
      const results = await executeQuery<any>(query, { id });
      if (results.length === 0 || !results[0].FileData) return null;
      return results[0];
    } catch (error) {
      console.error('Error fetching converted document file:', error);
      throw error;
    }
  }

  /**
   * Create converted document record
   */
  static async create(doc: ConvertedDocument): Promise<ConvertedDocument> {
    const id = uuidv4();
    const query = `
      INSERT INTO dbo.ConvertedDocuments (
        Id, ConversionTypeId, OriginalFileName, ConvertedFileName,
        FileData, FileSizeBytes, Status, ConvertedBy, Notes,
        CreatedAt, UpdatedAt
      )
      VALUES (
        @id, @conversionTypeId, @originalFileName, @convertedFileName,
        @fileData, @fileSizeBytes, @status, @convertedBy, @notes,
        GETUTCDATE(), GETUTCDATE()
      );

      SELECT cd.Id, cd.ConversionTypeId, cd.OriginalFileName, cd.ConvertedFileName,
             cd.FileSizeBytes, cd.Status, cd.ConvertedBy, cd.Notes,
             cd.CreatedAt, cd.UpdatedAt,
             dct.Name AS ConversionTypeName
      FROM dbo.ConvertedDocuments cd
      LEFT JOIN dbo.DocumentConversionTypes dct ON cd.ConversionTypeId = dct.Id
      WHERE cd.Id = @id;
    `;

    try {
      const results = await executeQuery<ConvertedDocument>(query, {
        id,
        conversionTypeId: doc.ConversionTypeId,
        originalFileName: doc.OriginalFileName,
        convertedFileName: doc.ConvertedFileName || null,
        fileData: doc.FileData || null,
        fileSizeBytes: doc.FileSizeBytes || null,
        status: doc.Status || 'completed',
        convertedBy: doc.ConvertedBy || null,
        notes: doc.Notes || null
      });

      return results[0];
    } catch (error) {
      console.error('Error creating converted document:', error);
      throw error;
    }
  }

  /**
   * Delete converted document
   */
  static async delete(id: string): Promise<void> {
    try {
      await executeQuery(`DELETE FROM dbo.ConvertedDocuments WHERE Id = @id`, { id });
    } catch (error) {
      console.error('Error deleting converted document:', error);
      throw error;
    }
  }
}
