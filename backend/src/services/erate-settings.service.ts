import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

// ================================================================
// INTERFACES
// ================================================================

export interface ERateSetting {
  Id: string;
  SettingKey: string;
  SettingValue: string;
  Description?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export interface ERateStatusCode {
  Id: string;
  StatusCode: string;
  DisplayName: string;
  ColorClass?: string;
  SortOrder: number;
  IsActive: boolean;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

// ================================================================
// E-RATE SETTINGS SERVICE
// ================================================================

export class ERateSettingsService {
  
  /**
   * Get all settings
   */
  static async getAllSettings(): Promise<ERateSetting[]> {
    return await executeQuery<ERateSetting>(
      `SELECT Id, SettingKey, SettingValue, Description, CreatedAt, UpdatedAt
       FROM dbo.ERateSettings
       ORDER BY SettingKey`,
      {}
    );
  }
  
  /**
   * Get a setting by key
   */
  static async getSetting(key: string): Promise<string | null> {
    const results = await executeQuery<{ SettingValue: string }>(
      `SELECT SettingValue FROM dbo.ERateSettings WHERE SettingKey = @key`,
      { key }
    );
    return results[0]?.SettingValue || null;
  }
  
  /**
   * Update or create a setting
   */
  static async upsertSetting(key: string, value: string, description?: string): Promise<ERateSetting> {
    // Check if exists
    const existing = await executeQuery<{ Id: string }>(
      `SELECT Id FROM dbo.ERateSettings WHERE SettingKey = @key`,
      { key }
    );
    
    if (existing.length > 0) {
      // Update
      await executeQuery(
        `UPDATE dbo.ERateSettings 
         SET SettingValue = @value, Description = COALESCE(@description, Description), UpdatedAt = GETUTCDATE()
         WHERE SettingKey = @key`,
        { key, value, description }
      );
      const updated = await executeQuery<ERateSetting>(
        `SELECT Id, SettingKey, SettingValue, Description, CreatedAt, UpdatedAt
         FROM dbo.ERateSettings WHERE SettingKey = @key`,
        { key }
      );
      return updated[0];
    } else {
      // Insert
      const id = uuidv4();
      await executeQuery(
        `INSERT INTO dbo.ERateSettings (Id, SettingKey, SettingValue, Description)
         VALUES (@id, @key, @value, @description)`,
        { id, key, value, description }
      );
      const inserted = await executeQuery<ERateSetting>(
        `SELECT Id, SettingKey, SettingValue, Description, CreatedAt, UpdatedAt
         FROM dbo.ERateSettings WHERE Id = @id`,
        { id }
      );
      return inserted[0];
    }
  }
  
  /**
   * Delete a setting
   */
  static async deleteSetting(key: string): Promise<boolean> {
    await executeQuery(
      `DELETE FROM dbo.ERateSettings WHERE SettingKey = @key`,
      { key }
    );
    return true;
  }
  
  // ================================================================
  // STATUS CODES
  // ================================================================
  
  /**
   * Get all status codes
   */
  static async getAllStatusCodes(): Promise<ERateStatusCode[]> {
    return await executeQuery<ERateStatusCode>(
      `SELECT Id, StatusCode, DisplayName, ColorClass, SortOrder, IsActive, CreatedAt, UpdatedAt
       FROM dbo.ERateStatusCodes
       ORDER BY SortOrder, DisplayName`,
      {}
    );
  }
  
  /**
   * Get active status codes only
   */
  static async getActiveStatusCodes(): Promise<ERateStatusCode[]> {
    return await executeQuery<ERateStatusCode>(
      `SELECT Id, StatusCode, DisplayName, ColorClass, SortOrder, IsActive, CreatedAt, UpdatedAt
       FROM dbo.ERateStatusCodes
       WHERE IsActive = 1
       ORDER BY SortOrder, DisplayName`,
      {}
    );
  }
  
  /**
   * Create a new status code
   */
  static async createStatusCode(statusCode: string, displayName: string, colorClass?: string, sortOrder?: number): Promise<ERateStatusCode> {
    const id = uuidv4();
    const order = sortOrder ?? 99;
    
    await executeQuery(
      `INSERT INTO dbo.ERateStatusCodes (Id, StatusCode, DisplayName, ColorClass, SortOrder, IsActive)
       VALUES (@id, @statusCode, @displayName, @colorClass, @sortOrder, 1)`,
      { id, statusCode, displayName, colorClass, sortOrder: order }
    );
    
    const inserted = await executeQuery<ERateStatusCode>(
      `SELECT Id, StatusCode, DisplayName, ColorClass, SortOrder, IsActive, CreatedAt, UpdatedAt
       FROM dbo.ERateStatusCodes WHERE Id = @id`,
      { id }
    );
    return inserted[0];
  }
  
  /**
   * Update a status code
   */
  static async updateStatusCode(id: string, updates: Partial<ERateStatusCode>): Promise<ERateStatusCode | null> {
    const setClauses: string[] = ['UpdatedAt = GETUTCDATE()'];
    const params: Record<string, any> = { id };
    
    if (updates.StatusCode !== undefined) {
      setClauses.push('StatusCode = @statusCode');
      params.statusCode = updates.StatusCode;
    }
    if (updates.DisplayName !== undefined) {
      setClauses.push('DisplayName = @displayName');
      params.displayName = updates.DisplayName;
    }
    if (updates.ColorClass !== undefined) {
      setClauses.push('ColorClass = @colorClass');
      params.colorClass = updates.ColorClass;
    }
    if (updates.SortOrder !== undefined) {
      setClauses.push('SortOrder = @sortOrder');
      params.sortOrder = updates.SortOrder;
    }
    if (updates.IsActive !== undefined) {
      setClauses.push('IsActive = @isActive');
      params.isActive = updates.IsActive ? 1 : 0;
    }
    
    await executeQuery(
      `UPDATE dbo.ERateStatusCodes SET ${setClauses.join(', ')} WHERE Id = @id`,
      params
    );
    
    const updated = await executeQuery<ERateStatusCode>(
      `SELECT Id, StatusCode, DisplayName, ColorClass, SortOrder, IsActive, CreatedAt, UpdatedAt
       FROM dbo.ERateStatusCodes WHERE Id = @id`,
      { id }
    );
    return updated[0] || null;
  }
  
  /**
   * Delete a status code
   */
  static async deleteStatusCode(id: string): Promise<boolean> {
    await executeQuery(
      `DELETE FROM dbo.ERateStatusCodes WHERE Id = @id`,
      { id }
    );
    return true;
  }
  
  /**
   * Ensure settings tables exist
   */
  static async ensureTablesExist(): Promise<string[]> {
    const results: string[] = [];
    
    // Check ERateSettings table
    const settingsExists = await executeQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'ERateSettings'`,
      {}
    );
    
    if (settingsExists[0].cnt === 0) {
      await executeQuery(`
        CREATE TABLE dbo.ERateSettings (
          Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
          SettingKey NVARCHAR(100) NOT NULL,
          SettingValue NVARCHAR(MAX) NOT NULL,
          Description NVARCHAR(500) NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
        )
      `, {});
      await executeQuery(`CREATE UNIQUE NONCLUSTERED INDEX IX_ERateSettings_SettingKey ON dbo.ERateSettings (SettingKey)`, {});
      
      // Insert defaults
      await executeQuery(`
        INSERT INTO dbo.ERateSettings (SettingKey, SettingValue, Description)
        VALUES 
          ('SODA_API_URL', 'https://opendata.usac.org/resource/jt8s-3q52.json', 'USAC SODA API URL for Form 470 data'),
          ('TARGET_STATES', 'ID,WA,OR,MT,AK', 'Comma-separated list of target state codes'),
          ('FUNDING_YEAR', '2026', 'Target funding year for data retrieval')
      `, {});
      
      results.push('Created ERateSettings table with defaults');
    } else {
      results.push('ERateSettings table already exists');
    }
    
    // Check ERateStatusCodes table
    const statusCodesExists = await executeQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'ERateStatusCodes'`,
      {}
    );
    
    if (statusCodesExists[0].cnt === 0) {
      await executeQuery(`
        CREATE TABLE dbo.ERateStatusCodes (
          Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
          StatusCode NVARCHAR(50) NOT NULL,
          DisplayName NVARCHAR(100) NOT NULL,
          ColorClass NVARCHAR(100) NULL,
          SortOrder INT NOT NULL DEFAULT 0,
          IsActive BIT NOT NULL DEFAULT 1,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
        )
      `, {});
      await executeQuery(`CREATE UNIQUE NONCLUSTERED INDEX IX_ERateStatusCodes_StatusCode ON dbo.ERateStatusCodes (StatusCode)`, {});
      
      // Insert defaults
      await executeQuery(`
        INSERT INTO dbo.ERateStatusCodes (StatusCode, DisplayName, ColorClass, SortOrder, IsActive)
        VALUES 
          ('In Process', 'In Process', 'yellow', 1, 1),
          ('Reviewing', 'Reviewing', 'purple', 2, 1),
          ('Responded', 'Responded', 'green', 3, 1),
          ('Bypassed', 'Bypassed', 'gray', 4, 1),
          ('Not Interested', 'Not Interested', 'red', 5, 1)
      `, {});
      
      results.push('Created ERateStatusCodes table with defaults');
    } else {
      results.push('ERateStatusCodes table already exists');
    }
    
    return results;
  }
}
