import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

/**
 * Labor Items Service - Handle labor catalog items
 */

export interface LaborItem {
  Id: string;
  Name: string;
  HoursPerUnit: number;
  RatePerHour: number;
  UnitPrice: number;
  UnitOfMeasure: string;
  Section: string;
  ReferenceArchitecture: string;
  Description?: string;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class LaborItemService {
  /**
   * Get all active labor items
   */
  static async getAllLaborItems(section?: string): Promise<LaborItem[]> {
    let query = `SELECT * FROM dbo.LaborItems WHERE IsActive = 1`;
    const params: Record<string, any> = {};

    if (section) {
      query += ` AND Section = @section`;
      params.section = section;
    }

    query += ` ORDER BY Section, Name`;
    return await executeQuery<LaborItem>(query, params);
  }

  /**
   * Get labor items by section
   */
  static async getLaborItemsBySection(section: string): Promise<LaborItem[]> {
    const query = `
      SELECT * FROM dbo.LaborItems
      WHERE Section = @section AND IsActive = 1
      ORDER BY Name
    `;
    return await executeQuery<LaborItem>(query, { section });
  }

  /**
   * Get labor item by ID
   */
  static async getLaborItemById(id: string): Promise<LaborItem | null> {
    const query = `SELECT * FROM dbo.LaborItems WHERE Id = @id`;
    const results = await executeQuery<LaborItem>(query, { id });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all labor sections
   */
  static async getAllSections(): Promise<any[]> {
    const query = `
      SELECT DISTINCT Section FROM dbo.LaborItems
      WHERE IsActive = 1
      ORDER BY Section
    `;
    return await executeQuery(query);
  }

  /**
   * Create labor item
   */
  static async createLaborItem(item: Partial<LaborItem>): Promise<LaborItem> {
    const id = uuidv4();
    const now = new Date();
    const query = `
      INSERT INTO dbo.LaborItems 
      (Id, Name, HoursPerUnit, RatePerHour, UnitPrice, UnitOfMeasure, Section, ReferenceArchitecture, Description, IsActive, CreatedAt, UpdatedAt)
      VALUES 
      (@id, @name, @hours, @rate, @price, @uom, @section, @refArch, @desc, @active, @createdAt, @updatedAt);
      
      SELECT * FROM dbo.LaborItems WHERE Id = @id
    `;

    const params = {
      id,
      name: item.Name || '',
      hours: item.HoursPerUnit || 0,
      rate: item.RatePerHour || 0,
      price: item.UnitPrice || 0,
      uom: item.UnitOfMeasure || 'Hours',
      section: item.Section || 'General',
      refArch: item.ReferenceArchitecture || null,
      desc: item.Description || null,
      active: 1,
      createdAt: now,
      updatedAt: now,
    };

    const results = await executeQuery<LaborItem>(query, params);
    return results[0];
  }

  /**
   * Update labor item
   */
  static async updateLaborItem(id: string, updates: Partial<LaborItem>): Promise<LaborItem | null> {
    const fields: string[] = [];
    const params: Record<string, any> = { id };

    Object.keys(updates).forEach((key) => {
      if (key !== 'Id' && key !== 'CreatedAt' && key !== 'UpdatedAt') {
        fields.push(`${key} = @${key}`);
        params[key] = (updates as any)[key];
      }
    });

    if (fields.length === 0) {
      return this.getLaborItemById(id);
    }

    params.updatedAt = new Date();
    fields.push('UpdatedAt = @updatedAt');

    const query = `
      UPDATE dbo.LaborItems 
      SET ${fields.join(', ')}
      WHERE Id = @id;
      
      SELECT * FROM dbo.LaborItems WHERE Id = @id
    `;

    const results = await executeQuery<LaborItem>(query, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Delete labor item (soft delete - set IsActive to 0)
   */
  static async deleteLaborItem(id: string): Promise<boolean> {
    const query = `UPDATE dbo.LaborItems SET IsActive = 0 WHERE Id = @id`;
    await executeQuery(query, { id });
    return true;
  }

  /**
   * Search labor items by name
   */
  static async searchLaborItems(searchTerm: string): Promise<LaborItem[]> {
    const query = `
      SELECT * FROM dbo.LaborItems
      WHERE (Name LIKE @search OR Description LIKE @search) AND IsActive = 1
      ORDER BY Section, Name
    `;
    const searchPattern = `%${searchTerm}%`;
    return await executeQuery<LaborItem>(query, { search: searchPattern });
  }
}
