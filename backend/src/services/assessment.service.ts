import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

// ================================================================
// INTERFACES
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

export interface AssessmentType {
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
  ResourceFolder?: string;
  DefaultHours?: number;
  DefaultRate?: number;
  IsActive: boolean;
  SortOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  ReferenceArchitectures?: ReferenceArchitecture[];
}

export interface AssessmentTypeArchitecture {
  Id?: number;
  AssessmentTypeId: string;
  ReferenceArchitectureId: string;
  CustomTemplate?: string;
  CreatedAt?: Date;
}

export interface GeneratedAssessment {
  Id?: string;
  AssessmentTypeId: string;
  ReferenceArchitectureId: string;
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
  AssessmentTypeName?: string;
  ReferenceArchitectureName?: string;
}

// ================================================================
// REFERENCE ARCHITECTURE SERVICE
// ================================================================

export class ReferenceArchitectureService {
  /**
   * Get all reference architectures
   */
  static async getAll(activeOnly: boolean = false): Promise<ReferenceArchitecture[]> {
    let query = `
      SELECT Id, Name, Description, Category, IconName, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.AssessmentReferenceArchitectures
    `;
    if (activeOnly) {
      query += ` WHERE IsActive = 1`;
    }
    query += ` ORDER BY SortOrder ASC, Name ASC`;

    try {
      return await executeQuery<ReferenceArchitecture>(query, {});
    } catch (error) {
      console.error('Error fetching reference architectures:', error);
      throw error;
    }
  }

  /**
   * Get reference architecture by ID
   */
  static async getById(id: string): Promise<ReferenceArchitecture | null> {
    const query = `
      SELECT Id, Name, Description, Category, IconName, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.AssessmentReferenceArchitectures
      WHERE Id = @id
    `;

    try {
      const results = await executeQuery<ReferenceArchitecture>(query, { id });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error fetching reference architecture:', error);
      throw error;
    }
  }

  /**
   * Create new reference architecture
   */
  static async create(architecture: ReferenceArchitecture): Promise<ReferenceArchitecture> {
    const id = uuidv4();
    const query = `
      INSERT INTO dbo.AssessmentReferenceArchitectures (Id, Name, Description, Category, IconName, IsActive, SortOrder, CreatedAt, UpdatedAt)
      VALUES (@id, @name, @description, @category, @iconName, @isActive, @sortOrder, GETUTCDATE(), GETUTCDATE());
      
      SELECT Id, Name, Description, Category, IconName, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.AssessmentReferenceArchitectures WHERE Id = @id;
    `;

    try {
      const results = await executeQuery<ReferenceArchitecture>(query, {
        id,
        name: architecture.Name,
        description: architecture.Description || null,
        category: architecture.Category || null,
        iconName: architecture.IconName || null,
        isActive: architecture.IsActive ?? true,
        sortOrder: architecture.SortOrder ?? 0
      });
      return results[0];
    } catch (error) {
      console.error('Error creating reference architecture:', error);
      throw error;
    }
  }

  /**
   * Update reference architecture
   */
  static async update(id: string, architecture: Partial<ReferenceArchitecture>): Promise<ReferenceArchitecture | null> {
    const query = `
      UPDATE dbo.AssessmentReferenceArchitectures
      SET Name = @name,
          Description = @description,
          Category = @category,
          IconName = @iconName,
          IsActive = @isActive,
          SortOrder = @sortOrder,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @id;
      
      SELECT Id, Name, Description, Category, IconName, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.AssessmentReferenceArchitectures WHERE Id = @id;
    `;

    try {
      const results = await executeQuery<ReferenceArchitecture>(query, {
        id,
        name: architecture.Name,
        description: architecture.Description || null,
        category: architecture.Category || null,
        iconName: architecture.IconName || null,
        isActive: architecture.IsActive ?? true,
        sortOrder: architecture.SortOrder ?? 0
      });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error updating reference architecture:', error);
      throw error;
    }
  }

  /**
   * Delete reference architecture
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM dbo.AssessmentReferenceArchitectures WHERE Id = @id`;

    try {
      await executeQuery(query, { id });
      return true;
    } catch (error) {
      console.error('Error deleting reference architecture:', error);
      throw error;
    }
  }
}

// ================================================================
// ASSESSMENT TYPE SERVICE
// ================================================================

export class AssessmentTypeService {
  /**
   * Get all assessment types with their linked reference architectures
   */
  static async getAll(activeOnly: boolean = false): Promise<AssessmentType[]> {
    let query = `
      SELECT Id, Name, Description, Category, TemplateFileName,
             OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
             AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope,
             ResourceFolder,
             DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.AssessmentTypes
    `;
    if (activeOnly) {
      query += ` WHERE IsActive = 1`;
    }
    query += ` ORDER BY SortOrder ASC, Name ASC`;

    try {
      const assessmentTypes = await executeQuery<AssessmentType>(query, {});
      
      // Fetch reference architectures for each type
      for (const type of assessmentTypes) {
        type.ReferenceArchitectures = await this.getArchitecturesForType(type.Id!);
      }
      
      return assessmentTypes;
    } catch (error) {
      console.error('Error fetching assessment types:', error);
      throw error;
    }
  }

  /**
   * Get assessment type by ID
   */
  static async getById(id: string): Promise<AssessmentType | null> {
    const query = `
      SELECT Id, Name, Description, Category, TemplateFileName,
             OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
             AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope,
             ResourceFolder,
             DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.AssessmentTypes
      WHERE Id = @id
    `;

    try {
      const results = await executeQuery<AssessmentType>(query, { id });
      if (results.length === 0) return null;
      
      const assessmentType = results[0];
      assessmentType.ReferenceArchitectures = await this.getArchitecturesForType(id);
      
      return assessmentType;
    } catch (error) {
      console.error('Error fetching assessment type:', error);
      throw error;
    }
  }

  /**
   * Get reference architectures linked to an assessment type
   */
  static async getArchitecturesForType(assessmentTypeId: string): Promise<ReferenceArchitecture[]> {
    const query = `
      SELECT ra.Id, ra.Name, ra.Description, ra.Category, ra.IconName, ra.IsActive, ra.SortOrder
      FROM dbo.AssessmentReferenceArchitectures ra
      INNER JOIN dbo.AssessmentTypeArchitectures ata ON ra.Id = ata.ReferenceArchitectureId
      WHERE ata.AssessmentTypeId = @assessmentTypeId
      ORDER BY ra.SortOrder ASC, ra.Name ASC
    `;

    try {
      return await executeQuery<ReferenceArchitecture>(query, { assessmentTypeId });
    } catch (error) {
      console.error('Error fetching architectures for type:', error);
      throw error;
    }
  }

  /**
   * Create new assessment type
   */
  static async create(assessmentType: AssessmentType): Promise<AssessmentType> {
    const id = uuidv4();
    const query = `
      INSERT INTO dbo.AssessmentTypes (
        Id, Name, Description, Category, TemplateFileName,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope,
        ResourceFolder,
        DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      )
      VALUES (
        @id, @name, @description, @category, @templateFileName,
        @overviewTemplate, @scopeTemplate, @methodologyTemplate, @deliverablesTemplate, @recommendationsTemplate,
        @aiPromptOverview, @aiPromptFindings, @aiPromptRecommendations, @aiPromptScope,
        @resourceFolder,
        @defaultHours, @defaultRate, @isActive, @sortOrder, GETUTCDATE(), GETUTCDATE()
      );
      
      SELECT Id, Name, Description, Category, TemplateFileName,
             OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
             AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope,
             ResourceFolder,
             DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.AssessmentTypes WHERE Id = @id;
    `;

    try {
      const results = await executeQuery<AssessmentType>(query, {
        id,
        name: assessmentType.Name,
        description: assessmentType.Description || null,
        category: assessmentType.Category || null,
        templateFileName: assessmentType.TemplateFileName || 'Assessment-Template.docx',
        overviewTemplate: assessmentType.OverviewTemplate || null,
        scopeTemplate: assessmentType.ScopeTemplate || null,
        methodologyTemplate: assessmentType.MethodologyTemplate || null,
        deliverablesTemplate: assessmentType.DeliverablesTemplate || null,
        recommendationsTemplate: assessmentType.RecommendationsTemplate || null,
        aiPromptOverview: assessmentType.AIPromptOverview || null,
        aiPromptFindings: assessmentType.AIPromptFindings || null,
        aiPromptRecommendations: assessmentType.AIPromptRecommendations || null,
        aiPromptScope: assessmentType.AIPromptScope || null,
        resourceFolder: assessmentType.ResourceFolder || null,
        defaultHours: assessmentType.DefaultHours ?? 0,
        defaultRate: assessmentType.DefaultRate ?? 175.00,
        isActive: assessmentType.IsActive ?? true,
        sortOrder: assessmentType.SortOrder ?? 0
      });

      const created = results[0];

      // Link reference architectures if provided
      if (assessmentType.ReferenceArchitectures && assessmentType.ReferenceArchitectures.length > 0) {
        await this.updateArchitectureLinks(id, assessmentType.ReferenceArchitectures.map(ra => ra.Id!));
        created.ReferenceArchitectures = await this.getArchitecturesForType(id);
      }

      return created;
    } catch (error) {
      console.error('Error creating assessment type:', error);
      throw error;
    }
  }

  /**
   * Update assessment type
   */
  static async update(id: string, assessmentType: Partial<AssessmentType>): Promise<AssessmentType | null> {
    const query = `
      UPDATE dbo.AssessmentTypes
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
          ResourceFolder = @resourceFolder,
          DefaultHours = @defaultHours,
          DefaultRate = @defaultRate,
          IsActive = @isActive,
          SortOrder = @sortOrder,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @id;
      
      SELECT Id, Name, Description, Category, TemplateFileName,
             OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
             AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope,
             ResourceFolder,
             DefaultHours, DefaultRate, IsActive, SortOrder, CreatedAt, UpdatedAt
      FROM dbo.AssessmentTypes WHERE Id = @id;
    `;

    try {
      const results = await executeQuery<AssessmentType>(query, {
        id,
        name: assessmentType.Name,
        description: assessmentType.Description || null,
        category: assessmentType.Category || null,
        templateFileName: assessmentType.TemplateFileName || 'Assessment-Template.docx',
        overviewTemplate: assessmentType.OverviewTemplate || null,
        scopeTemplate: assessmentType.ScopeTemplate || null,
        methodologyTemplate: assessmentType.MethodologyTemplate || null,
        deliverablesTemplate: assessmentType.DeliverablesTemplate || null,
        recommendationsTemplate: assessmentType.RecommendationsTemplate || null,
        aiPromptOverview: assessmentType.AIPromptOverview || null,
        aiPromptFindings: assessmentType.AIPromptFindings || null,
        aiPromptRecommendations: assessmentType.AIPromptRecommendations || null,
        aiPromptScope: assessmentType.AIPromptScope || null,
        resourceFolder: assessmentType.ResourceFolder || null,
        defaultHours: assessmentType.DefaultHours ?? 0,
        defaultRate: assessmentType.DefaultRate ?? 175.00,
        isActive: assessmentType.IsActive ?? true,
        sortOrder: assessmentType.SortOrder ?? 0
      });

      if (results.length === 0) return null;

      const updated = results[0];

      // Update reference architecture links if provided
      if (assessmentType.ReferenceArchitectures) {
        await this.updateArchitectureLinks(id, assessmentType.ReferenceArchitectures.map(ra => ra.Id!));
        updated.ReferenceArchitectures = await this.getArchitecturesForType(id);
      }

      return updated;
    } catch (error) {
      console.error('Error updating assessment type:', error);
      throw error;
    }
  }

  /**
   * Update reference architecture links for an assessment type
   */
  static async updateArchitectureLinks(assessmentTypeId: string, architectureIds: string[]): Promise<void> {
    // Delete existing links
    const deleteQuery = `DELETE FROM dbo.AssessmentTypeArchitectures WHERE AssessmentTypeId = @assessmentTypeId`;
    await executeQuery(deleteQuery, { assessmentTypeId });

    // Insert new links
    for (const architectureId of architectureIds) {
      const insertQuery = `
        INSERT INTO dbo.AssessmentTypeArchitectures (AssessmentTypeId, ReferenceArchitectureId, CreatedAt)
        VALUES (@assessmentTypeId, @architectureId, GETUTCDATE())
      `;
      await executeQuery(insertQuery, { assessmentTypeId, architectureId });
    }
  }

  /**
   * Delete assessment type
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM dbo.AssessmentTypes WHERE Id = @id`;

    try {
      await executeQuery(query, { id });
      return true;
    } catch (error) {
      console.error('Error deleting assessment type:', error);
      throw error;
    }
  }
}

// ================================================================
// GENERATED ASSESSMENT SERVICE
// ================================================================

export class GeneratedAssessmentService {
  /**
   * Get all generated assessments
   */
  static async getAll(): Promise<GeneratedAssessment[]> {
    const query = `
      SELECT ga.Id, ga.AssessmentTypeId, ga.ReferenceArchitectureId,
             ga.CustomerName, ga.CustomerContact, ga.CustomerEmail,
             ga.Title, ga.ExecutiveSummary, ga.Scope, ga.Methodology, ga.Findings, ga.Recommendations, ga.NextSteps,
             ga.EstimatedHours, ga.HourlyRate, ga.TotalPrice,
             ga.FileName, ga.FileSizeBytes, ga.Status, ga.GeneratedBy, ga.Notes,
             ga.CreatedAt, ga.UpdatedAt,
             at.Name AS AssessmentTypeName,
             ra.Name AS ReferenceArchitectureName
      FROM dbo.GeneratedAssessments ga
      LEFT JOIN dbo.AssessmentTypes at ON ga.AssessmentTypeId = at.Id
      LEFT JOIN dbo.AssessmentReferenceArchitectures ra ON ga.ReferenceArchitectureId = ra.Id
      ORDER BY ga.CreatedAt DESC
    `;

    try {
      return await executeQuery<GeneratedAssessment>(query, {});
    } catch (error) {
      console.error('Error fetching generated assessments:', error);
      throw error;
    }
  }

  /**
   * Get generated assessment by ID
   */
  static async getById(id: string): Promise<GeneratedAssessment | null> {
    const query = `
      SELECT ga.Id, ga.AssessmentTypeId, ga.ReferenceArchitectureId,
             ga.CustomerName, ga.CustomerContact, ga.CustomerEmail,
             ga.Title, ga.ExecutiveSummary, ga.Scope, ga.Methodology, ga.Findings, ga.Recommendations, ga.NextSteps,
             ga.EstimatedHours, ga.HourlyRate, ga.TotalPrice,
             ga.FileName, ga.FileSizeBytes, ga.Status, ga.GeneratedBy, ga.Notes,
             ga.CreatedAt, ga.UpdatedAt,
             at.Name AS AssessmentTypeName,
             ra.Name AS ReferenceArchitectureName
      FROM dbo.GeneratedAssessments ga
      LEFT JOIN dbo.AssessmentTypes at ON ga.AssessmentTypeId = at.Id
      LEFT JOIN dbo.AssessmentReferenceArchitectures ra ON ga.ReferenceArchitectureId = ra.Id
      WHERE ga.Id = @id
    `;

    try {
      const results = await executeQuery<GeneratedAssessment>(query, { id });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error fetching generated assessment:', error);
      throw error;
    }
  }

  /**
   * Create generated assessment
   */
  static async create(assessment: GeneratedAssessment): Promise<GeneratedAssessment> {
    const id = uuidv4();
    const totalPrice = (assessment.EstimatedHours || 0) * (assessment.HourlyRate || 175);
    
    // Build query dynamically to handle FileData properly (VARBINARY requires special handling)
    const hasFileData = assessment.FileData && assessment.FileData.length > 0;
    
    const query = `
      INSERT INTO dbo.GeneratedAssessments (
        Id, AssessmentTypeId, ReferenceArchitectureId,
        CustomerName, CustomerContact, CustomerEmail,
        Title, ExecutiveSummary, Scope, Methodology, Findings, Recommendations, NextSteps,
        EstimatedHours, HourlyRate, TotalPrice,
        FileName, ${hasFileData ? 'FileData,' : ''} FileSizeBytes, Status, GeneratedBy, Notes,
        CreatedAt, UpdatedAt
      )
      VALUES (
        @id, @assessmentTypeId, @referenceArchitectureId,
        @customerName, @customerContact, @customerEmail,
        @title, @executiveSummary, @scope, @methodology, @findings, @recommendations, @nextSteps,
        @estimatedHours, @hourlyRate, @totalPrice,
        @fileName, ${hasFileData ? '@fileData,' : ''} @fileSizeBytes, @status, @generatedBy, @notes,
        GETUTCDATE(), GETUTCDATE()
      );
    `;

    const params: any = {
      id,
      assessmentTypeId: assessment.AssessmentTypeId,
      referenceArchitectureId: assessment.ReferenceArchitectureId,
      customerName: assessment.CustomerName,
      customerContact: assessment.CustomerContact || null,
      customerEmail: assessment.CustomerEmail || null,
      title: assessment.Title,
      executiveSummary: assessment.ExecutiveSummary || null,
      scope: assessment.Scope || null,
      methodology: assessment.Methodology || null,
      findings: assessment.Findings || null,
      recommendations: assessment.Recommendations || null,
      nextSteps: assessment.NextSteps || null,
      estimatedHours: assessment.EstimatedHours || 0,
      hourlyRate: assessment.HourlyRate || 175,
      totalPrice,
      fileName: assessment.FileName || null,
      fileSizeBytes: assessment.FileSizeBytes || 0,
      status: assessment.Status || 'draft',
      generatedBy: assessment.GeneratedBy || null,
      notes: assessment.Notes || null
    };

    if (hasFileData) {
      params.fileData = assessment.FileData;
    }

    try {
      await executeQuery(query, params);

      return (await this.getById(id))!;
    } catch (error) {
      console.error('Error creating generated assessment:', error);
      throw error;
    }
  }

  /**
   * Update generated assessment
   */
  static async update(id: string, assessment: Partial<GeneratedAssessment>): Promise<GeneratedAssessment | null> {
    const totalPrice = (assessment.EstimatedHours || 0) * (assessment.HourlyRate || 175);
    
    const query = `
      UPDATE dbo.GeneratedAssessments
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
        customerName: assessment.CustomerName,
        customerContact: assessment.CustomerContact || null,
        customerEmail: assessment.CustomerEmail || null,
        title: assessment.Title,
        executiveSummary: assessment.ExecutiveSummary || null,
        scope: assessment.Scope || null,
        methodology: assessment.Methodology || null,
        findings: assessment.Findings || null,
        recommendations: assessment.Recommendations || null,
        nextSteps: assessment.NextSteps || null,
        estimatedHours: assessment.EstimatedHours || 0,
        hourlyRate: assessment.HourlyRate || 175,
        totalPrice,
        status: assessment.Status || 'draft',
        generatedBy: assessment.GeneratedBy || null,
        notes: assessment.Notes || null
      });

      return await this.getById(id);
    } catch (error) {
      console.error('Error updating generated assessment:', error);
      throw error;
    }
  }

  /**
   * Update assessment document
   */
  static async updateDocument(id: string, fileName: string, fileData: Buffer, fileSizeBytes: number): Promise<boolean> {
    const query = `
      UPDATE dbo.GeneratedAssessments
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
      console.error('Error updating assessment document:', error);
      throw error;
    }
  }

  /**
   * Get assessment document file
   */
  static async getFile(id: string): Promise<{ FileName: string; FileData: Buffer } | null> {
    const query = `SELECT FileName, FileData FROM dbo.GeneratedAssessments WHERE Id = @id`;

    try {
      const results = await executeQuery<{ FileName: string; FileData: Buffer }>(query, { id });
      return results.length > 0 && results[0].FileData ? results[0] : null;
    } catch (error) {
      console.error('Error fetching assessment file:', error);
      throw error;
    }
  }

  /**
   * Update assessment status
   */
  static async updateStatus(id: string, status: string): Promise<boolean> {
    const query = `
      UPDATE dbo.GeneratedAssessments
      SET Status = @status, UpdatedAt = GETUTCDATE()
      WHERE Id = @id
    `;

    try {
      await executeQuery(query, { id, status });
      return true;
    } catch (error) {
      console.error('Error updating assessment status:', error);
      throw error;
    }
  }

  /**
   * Delete generated assessment
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM dbo.GeneratedAssessments WHERE Id = @id`;

    try {
      await executeQuery(query, { id });
      return true;
    } catch (error) {
      console.error('Error deleting generated assessment:', error);
      throw error;
    }
  }
}
