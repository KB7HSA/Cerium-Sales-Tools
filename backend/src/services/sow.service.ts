import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

// ================================================================
// INTERFACES (reuse ReferenceArchitecture from assessment.service)
// ================================================================

export interface ReferenceArchitecture {
  Id?: string;
  Name: string;
  Description?: string;
  Category?: string;
  IconName?: string;
  IsActive: boolean;
  SortOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export interface SOWType {
  Id?: string;
  Name: string;
  Description?: string;
  Category?: string;
  TemplateFileName?: string;
  OverviewTemplate?: string;
  ScopeTemplate?: string;
  MethodologyTemplate?: string;
  DeliverablesTemplate?: string;
  RecommendationsTemplate?: string;
  AIPromptOverview?: string;
  AIPromptFindings?: string;
  AIPromptRecommendations?: string;
  AIPromptScope?: string;
  AITemperature?: number;
  ResourceFolder?: string;
  ContentSections?: string;
  DefaultHours?: number;
  DefaultRate?: number;
  IsActive: boolean;
  SortOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  ReferenceArchitectures?: ReferenceArchitecture[];
}

export interface SOWTypeArchitecture {
  Id?: number;
  SOWTypeId: string;
  ReferenceArchitectureId: string;
  CustomTemplate?: string;
  CreatedAt?: Date;
}

export interface GeneratedSOW {
  Id?: string;
  SOWTypeId: string;
  ReferenceArchitectureId: string;
  QuoteId?: string;
  CustomerName: string;
  CustomerContact?: string;
  CustomerEmail?: string;
  Title: string;
  ExecutiveSummary?: string;
  Scope?: string;
  Methodology?: string;
  Findings?: string;
  Recommendations?: string;
  NextSteps?: string;
  EstimatedHours?: number;
  HourlyRate?: number;
  TotalPrice?: number;
  FileName?: string;
  FileData?: Buffer;
  FileSizeBytes?: number;
  Status: string;
  GeneratedBy?: string;
  Notes?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  // Joined fields
  SOWTypeName?: string;
  ReferenceArchitectureName?: string;
}

// ================================================================
// SOW TYPE SERVICE
// ================================================================

export class SOWTypeService {
  /**
   * Get all SOW types with their linked reference architectures
   */
  static async getAll(activeOnly: boolean = false): Promise<SOWType[]> {
    let query = `
      SELECT Id, Name, Description, Category, TemplateFileName,
             OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
             AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope, AITemperature,
             ResourceFolder, ContentSections,
             DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.SOWTypes
    `;
    if (activeOnly) {
      query += ` WHERE IsActive = 1`;
    }
    query += ` ORDER BY SortOrder ASC, Name ASC`;

    try {
      const sowTypes = await executeQuery<SOWType>(query, {});

      // Fetch reference architectures for each type
      for (const type of sowTypes) {
        type.ReferenceArchitectures = await this.getArchitecturesForType(type.Id!);
      }

      return sowTypes;
    } catch (error) {
      console.error('Error fetching SOW types:', error);
      throw error;
    }
  }

  /**
   * Get SOW type by ID
   */
  static async getById(id: string): Promise<SOWType | null> {
    const query = `
      SELECT Id, Name, Description, Category, TemplateFileName,
             OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
             AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope, AITemperature,
             ResourceFolder, ContentSections,
             DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.SOWTypes
      WHERE Id = @id
    `;

    try {
      const results = await executeQuery<SOWType>(query, { id });
      if (results.length === 0) return null;

      const sowType = results[0];
      sowType.ReferenceArchitectures = await this.getArchitecturesForType(id);

      return sowType;
    } catch (error) {
      console.error('Error fetching SOW type:', error);
      throw error;
    }
  }

  /**
   * Get reference architectures linked to a SOW type
   */
  static async getArchitecturesForType(sowTypeId: string): Promise<ReferenceArchitecture[]> {
    const query = `
      SELECT ra.Id, ra.Name, ra.Description, ra.Category, ra.IconName, ra.IsActive, ra.SortOrder
      FROM dbo.AssessmentReferenceArchitectures ra
      INNER JOIN dbo.SOWTypeArchitectures sta ON ra.Id = sta.ReferenceArchitectureId
      WHERE sta.SOWTypeId = @sowTypeId
      ORDER BY ra.SortOrder ASC, ra.Name ASC
    `;

    try {
      return await executeQuery<ReferenceArchitecture>(query, { sowTypeId });
    } catch (error) {
      console.error('Error fetching architectures for SOW type:', error);
      throw error;
    }
  }

  /**
   * Create new SOW type
   */
  static async create(sowType: SOWType): Promise<SOWType> {
    const id = uuidv4();
    const query = `
      INSERT INTO dbo.SOWTypes (
        Id, Name, Description, Category, TemplateFileName,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope, AITemperature,
        ResourceFolder, ContentSections,
        DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      )
      VALUES (
        @id, @name, @description, @category, @templateFileName,
        @overviewTemplate, @scopeTemplate, @methodologyTemplate, @deliverablesTemplate, @recommendationsTemplate,
        @aiPromptOverview, @aiPromptFindings, @aiPromptRecommendations, @aiPromptScope, @aiTemperature,
        @resourceFolder, @contentSections,
        @defaultHours, @defaultRate, @isActive, @sortOrder, GETUTCDATE(), GETUTCDATE()
      );

      SELECT Id, Name, Description, Category, TemplateFileName,
             OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
             AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope, AITemperature,
             ResourceFolder, ContentSections,
             DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.SOWTypes WHERE Id = @id;
    `;

    try {
      const results = await executeQuery<SOWType>(query, {
        id,
        name: sowType.Name,
        description: sowType.Description || null,
        category: sowType.Category || null,
        templateFileName: sowType.TemplateFileName || 'SOW-Template.docx',
        overviewTemplate: sowType.OverviewTemplate || null,
        scopeTemplate: sowType.ScopeTemplate || null,
        methodologyTemplate: sowType.MethodologyTemplate || null,
        deliverablesTemplate: sowType.DeliverablesTemplate || null,
        recommendationsTemplate: sowType.RecommendationsTemplate || null,
        aiPromptOverview: sowType.AIPromptOverview || null,
        aiPromptFindings: sowType.AIPromptFindings || null,
        aiPromptRecommendations: sowType.AIPromptRecommendations || null,
        aiPromptScope: sowType.AIPromptScope || null,
        aiTemperature: sowType.AITemperature ?? 0.7,
        resourceFolder: sowType.ResourceFolder || null,
        contentSections: sowType.ContentSections || null,
        defaultHours: sowType.DefaultHours ?? 0,
        defaultRate: sowType.DefaultRate ?? 175.00,
        isActive: sowType.IsActive ?? true,
        sortOrder: sowType.SortOrder ?? 0
      });

      const created = results[0];

      // Link reference architectures if provided
      if (sowType.ReferenceArchitectures && sowType.ReferenceArchitectures.length > 0) {
        await this.updateArchitectureLinks(id, sowType.ReferenceArchitectures.map(ra => ra.Id!));
        created.ReferenceArchitectures = await this.getArchitecturesForType(id);
      }

      return created;
    } catch (error) {
      console.error('Error creating SOW type:', error);
      throw error;
    }
  }

  /**
   * Update SOW type
   */
  static async update(id: string, sowType: Partial<SOWType>): Promise<SOWType | null> {
    const query = `
      UPDATE dbo.SOWTypes
      SET Name = @name,
          Description = @description,
          Category = @category,
          TemplateFileName = @templateFileName,
          OverviewTemplate = @overviewTemplate,
          ScopeTemplate = @scopeTemplate,
          MethodologyTemplate = @methodologyTemplate,
          DeliverablesTemplate = @deliverablesTemplate,
          RecommendationsTemplate = @recommendationsTemplate,
          AIPromptOverview = @aiPromptOverview,
          AIPromptFindings = @aiPromptFindings,
          AIPromptRecommendations = @aiPromptRecommendations,
          AIPromptScope = @aiPromptScope,
          AITemperature = @aiTemperature,
          ResourceFolder = @resourceFolder,
          ContentSections = @contentSections,
          DefaultHours = @defaultHours,
          DefaultRate = @defaultRate,
          IsActive = @isActive,
          SortOrder = @sortOrder,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @id;

      SELECT Id, Name, Description, Category, TemplateFileName,
             OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
             AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope, AITemperature,
             ResourceFolder, ContentSections,
             DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.SOWTypes WHERE Id = @id;
    `;

    try {
      const results = await executeQuery<SOWType>(query, {
        id,
        name: sowType.Name,
        description: sowType.Description || null,
        category: sowType.Category || null,
        templateFileName: sowType.TemplateFileName || 'SOW-Template.docx',
        overviewTemplate: sowType.OverviewTemplate || null,
        scopeTemplate: sowType.ScopeTemplate || null,
        methodologyTemplate: sowType.MethodologyTemplate || null,
        deliverablesTemplate: sowType.DeliverablesTemplate || null,
        recommendationsTemplate: sowType.RecommendationsTemplate || null,
        aiPromptOverview: sowType.AIPromptOverview || null,
        aiPromptFindings: sowType.AIPromptFindings || null,
        aiPromptRecommendations: sowType.AIPromptRecommendations || null,
        aiPromptScope: sowType.AIPromptScope || null,
        aiTemperature: sowType.AITemperature ?? 0.7,
        resourceFolder: sowType.ResourceFolder || null,
        contentSections: sowType.ContentSections || null,
        defaultHours: sowType.DefaultHours ?? 0,
        defaultRate: sowType.DefaultRate ?? 175.00,
        isActive: sowType.IsActive ?? true,
        sortOrder: sowType.SortOrder ?? 0
      });

      if (results.length === 0) return null;

      const updated = results[0];

      // Update reference architecture links if provided
      if (sowType.ReferenceArchitectures) {
        await this.updateArchitectureLinks(id, sowType.ReferenceArchitectures.map(ra => ra.Id!));
        updated.ReferenceArchitectures = await this.getArchitecturesForType(id);
      }

      return updated;
    } catch (error) {
      console.error('Error updating SOW type:', error);
      throw error;
    }
  }

  /**
   * Update reference architecture links for a SOW type
   */
  static async updateArchitectureLinks(sowTypeId: string, architectureIds: string[]): Promise<void> {
    // Delete existing links
    const deleteQuery = `DELETE FROM dbo.SOWTypeArchitectures WHERE SOWTypeId = @sowTypeId`;
    await executeQuery(deleteQuery, { sowTypeId });

    // Insert new links
    for (const architectureId of architectureIds) {
      const insertQuery = `
        INSERT INTO dbo.SOWTypeArchitectures (SOWTypeId, ReferenceArchitectureId, CreatedAt)
        VALUES (@sowTypeId, @architectureId, GETUTCDATE())
      `;
      await executeQuery(insertQuery, { sowTypeId, architectureId });
    }
  }

  /**
   * Delete SOW type
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM dbo.SOWTypes WHERE Id = @id`;

    try {
      await executeQuery(query, { id });
      return true;
    } catch (error) {
      console.error('Error deleting SOW type:', error);
      throw error;
    }
  }
}

// ================================================================
// GENERATED SOW SERVICE
// ================================================================

export class GeneratedSOWService {
  /**
   * Get all generated SOWs
   */
  static async getAll(): Promise<GeneratedSOW[]> {
    const query = `
      SELECT gs.Id, gs.SOWTypeId, gs.ReferenceArchitectureId, gs.QuoteId,
             gs.CustomerName, gs.CustomerContact, gs.CustomerEmail,
             gs.Title, gs.ExecutiveSummary, gs.Scope, gs.Methodology, gs.Findings, gs.Recommendations, gs.NextSteps,
             gs.EstimatedHours, gs.HourlyRate, gs.TotalPrice,
             gs.FileName, gs.FileSizeBytes, gs.Status, gs.GeneratedBy, gs.Notes,
             gs.CreatedAt, gs.UpdatedAt,
             st.Name AS SOWTypeName,
             ra.Name AS ReferenceArchitectureName
      FROM dbo.GeneratedSOWs gs
      LEFT JOIN dbo.SOWTypes st ON gs.SOWTypeId = st.Id
      LEFT JOIN dbo.AssessmentReferenceArchitectures ra ON gs.ReferenceArchitectureId = ra.Id
      ORDER BY gs.CreatedAt DESC
    `;

    try {
      return await executeQuery<GeneratedSOW>(query, {});
    } catch (error) {
      console.error('Error fetching generated SOWs:', error);
      throw error;
    }
  }

  /**
   * Get generated SOW by ID
   */
  static async getById(id: string): Promise<GeneratedSOW | null> {
    const query = `
      SELECT gs.Id, gs.SOWTypeId, gs.ReferenceArchitectureId, gs.QuoteId,
             gs.CustomerName, gs.CustomerContact, gs.CustomerEmail,
             gs.Title, gs.ExecutiveSummary, gs.Scope, gs.Methodology, gs.Findings, gs.Recommendations, gs.NextSteps,
             gs.EstimatedHours, gs.HourlyRate, gs.TotalPrice,
             gs.FileName, gs.FileSizeBytes, gs.Status, gs.GeneratedBy, gs.Notes,
             gs.CreatedAt, gs.UpdatedAt,
             st.Name AS SOWTypeName,
             ra.Name AS ReferenceArchitectureName
      FROM dbo.GeneratedSOWs gs
      LEFT JOIN dbo.SOWTypes st ON gs.SOWTypeId = st.Id
      LEFT JOIN dbo.AssessmentReferenceArchitectures ra ON gs.ReferenceArchitectureId = ra.Id
      WHERE gs.Id = @id
    `;

    try {
      const results = await executeQuery<GeneratedSOW>(query, { id });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error fetching generated SOW:', error);
      throw error;
    }
  }

  /**
   * Create generated SOW
   */
  static async create(sow: GeneratedSOW): Promise<GeneratedSOW> {
    const id = uuidv4();
    const totalPrice = (sow.EstimatedHours || 0) * (sow.HourlyRate || 175);

    const hasFileData = sow.FileData && sow.FileData.length > 0;

    const query = `
      INSERT INTO dbo.GeneratedSOWs (
        Id, SOWTypeId, ReferenceArchitectureId, QuoteId,
        CustomerName, CustomerContact, CustomerEmail,
        Title, ExecutiveSummary, Scope, Methodology, Findings, Recommendations, NextSteps,
        EstimatedHours, HourlyRate, TotalPrice,
        FileName, ${hasFileData ? 'FileData,' : ''} FileSizeBytes, Status, GeneratedBy, Notes,
        CreatedAt, UpdatedAt
      )
      VALUES (
        @id, @sowTypeId, @referenceArchitectureId, @quoteId,
        @customerName, @customerContact, @customerEmail,
        @title, @executiveSummary, @scope, @methodology, @findings, @recommendations, @nextSteps,
        @estimatedHours, @hourlyRate, @totalPrice,
        @fileName, ${hasFileData ? '@fileData,' : ''} @fileSizeBytes, @status, @generatedBy, @notes,
        GETUTCDATE(), GETUTCDATE()
      );
    `;

    const params: any = {
      id,
      sowTypeId: sow.SOWTypeId,
      referenceArchitectureId: sow.ReferenceArchitectureId,
      quoteId: sow.QuoteId || null,
      customerName: sow.CustomerName,
      customerContact: sow.CustomerContact || null,
      customerEmail: sow.CustomerEmail || null,
      title: sow.Title,
      executiveSummary: sow.ExecutiveSummary || null,
      scope: sow.Scope || null,
      methodology: sow.Methodology || null,
      findings: sow.Findings || null,
      recommendations: sow.Recommendations || null,
      nextSteps: sow.NextSteps || null,
      estimatedHours: sow.EstimatedHours || 0,
      hourlyRate: sow.HourlyRate || 175,
      totalPrice,
      fileName: sow.FileName || null,
      fileSizeBytes: sow.FileSizeBytes || 0,
      status: sow.Status || 'draft',
      generatedBy: sow.GeneratedBy || null,
      notes: sow.Notes || null
    };

    if (hasFileData) {
      params.fileData = sow.FileData;
    }

    try {
      await executeQuery(query, params);
      return (await this.getById(id))!;
    } catch (error) {
      console.error('Error creating generated SOW:', error);
      throw error;
    }
  }

  /**
   * Update generated SOW
   */
  static async update(id: string, sow: Partial<GeneratedSOW>): Promise<GeneratedSOW | null> {
    const totalPrice = (sow.EstimatedHours || 0) * (sow.HourlyRate || 175);

    const query = `
      UPDATE dbo.GeneratedSOWs
      SET CustomerName = @customerName,
          CustomerContact = @customerContact,
          CustomerEmail = @customerEmail,
          Title = @title,
          ExecutiveSummary = @executiveSummary,
          Scope = @scope,
          Methodology = @methodology,
          Findings = @findings,
          Recommendations = @recommendations,
          NextSteps = @nextSteps,
          EstimatedHours = @estimatedHours,
          HourlyRate = @hourlyRate,
          TotalPrice = @totalPrice,
          Status = @status,
          GeneratedBy = @generatedBy,
          Notes = @notes,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @id
    `;

    try {
      await executeQuery(query, {
        id,
        customerName: sow.CustomerName,
        customerContact: sow.CustomerContact || null,
        customerEmail: sow.CustomerEmail || null,
        title: sow.Title,
        executiveSummary: sow.ExecutiveSummary || null,
        scope: sow.Scope || null,
        methodology: sow.Methodology || null,
        findings: sow.Findings || null,
        recommendations: sow.Recommendations || null,
        nextSteps: sow.NextSteps || null,
        estimatedHours: sow.EstimatedHours || 0,
        hourlyRate: sow.HourlyRate || 175,
        totalPrice,
        status: sow.Status || 'draft',
        generatedBy: sow.GeneratedBy || null,
        notes: sow.Notes || null
      });

      return await this.getById(id);
    } catch (error) {
      console.error('Error updating generated SOW:', error);
      throw error;
    }
  }

  /**
   * Update SOW document
   */
  static async updateDocument(id: string, fileName: string, fileData: Buffer, fileSizeBytes: number): Promise<boolean> {
    const query = `
      UPDATE dbo.GeneratedSOWs
      SET FileName = @fileName,
          FileData = @fileData,
          FileSizeBytes = @fileSizeBytes,
          Status = 'generated',
          UpdatedAt = GETUTCDATE()
      WHERE Id = @id
    `;

    try {
      await executeQuery(query, { id, fileName, fileData, fileSizeBytes });
      return true;
    } catch (error) {
      console.error('Error updating SOW document:', error);
      throw error;
    }
  }

  /**
   * Get SOW document file
   */
  static async getFile(id: string): Promise<{ FileName: string; FileData: Buffer } | null> {
    const query = `SELECT FileName, FileData FROM dbo.GeneratedSOWs WHERE Id = @id`;

    try {
      const results = await executeQuery<{ FileName: string; FileData: Buffer }>(query, { id });
      return results.length > 0 && results[0].FileData ? results[0] : null;
    } catch (error) {
      console.error('Error fetching SOW file:', error);
      throw error;
    }
  }

  /**
   * Update SOW status
   */
  static async updateStatus(id: string, status: string): Promise<boolean> {
    const query = `
      UPDATE dbo.GeneratedSOWs
      SET Status = @status, UpdatedAt = GETUTCDATE()
      WHERE Id = @id
    `;

    try {
      await executeQuery(query, { id, status });
      return true;
    } catch (error) {
      console.error('Error updating SOW status:', error);
      throw error;
    }
  }

  /**
   * Delete generated SOW
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM dbo.GeneratedSOWs WHERE Id = @id`;

    try {
      await executeQuery(query, { id });
      return true;
    } catch (error) {
      console.error('Error deleting generated SOW:', error);
      throw error;
    }
  }
}
