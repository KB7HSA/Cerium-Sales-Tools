import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

export interface LaborSolution {
  Id: string;
  Name: string;
  Description?: string;
  OverheadPercent: number;
  ContingencyPercent: number;
  CreatedDate?: string;
  LastModified?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
  Items?: LaborSolutionItem[];
}

export interface LaborSolutionItem {
  Id: string;
  SolutionId: string;
  CatalogItemId: string;
  Quantity: number;
  HoursPerUnit: number;
  RatePerHour: number;
  GroupName?: string;
  SortOrder?: number;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class LaborSolutionService {

  // ─── GET ALL ─────────────────────────────────────────
  static async getAll(): Promise<LaborSolution[]> {
    const solutions = await executeQuery<LaborSolution>(
      `SELECT * FROM dbo.LaborSolutions ORDER BY Name`
    );

    for (const sol of solutions) {
      sol.Items = await executeQuery<LaborSolutionItem>(
        `SELECT * FROM dbo.LaborSolutionItems WHERE SolutionId = @solutionId ORDER BY SortOrder, Id`,
        { solutionId: sol.Id }
      );
    }
    return solutions;
  }

  // ─── GET BY ID ───────────────────────────────────────
  static async getById(id: string): Promise<LaborSolution | null> {
    const results = await executeQuery<LaborSolution>(
      `SELECT * FROM dbo.LaborSolutions WHERE Id = @id`,
      { id }
    );
    if (results.length === 0) return null;

    const sol = results[0];
    sol.Items = await executeQuery<LaborSolutionItem>(
      `SELECT * FROM dbo.LaborSolutionItems WHERE SolutionId = @solutionId ORDER BY SortOrder, Id`,
      { solutionId: sol.Id }
    );
    return sol;
  }

  // ─── CREATE ──────────────────────────────────────────
  static async create(data: Partial<LaborSolution> & { Items?: any[] }): Promise<LaborSolution> {
    const id = data.Id || uuidv4();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    await executeQuery(
      `INSERT INTO dbo.LaborSolutions
       (Id, Name, Description, OverheadPercent, ContingencyPercent, CreatedDate, LastModified, CreatedAt, UpdatedAt)
       VALUES
       (@id, @name, @desc, @overhead, @contingency, @createdDate, @lastModified, @createdAt, @updatedAt)`,
      {
        id,
        name: data.Name || 'Solution',
        desc: data.Description || null,
        overhead: data.OverheadPercent ?? 10,
        contingency: data.ContingencyPercent ?? 5,
        createdDate: data.CreatedDate || today,
        lastModified: data.LastModified || today,
        createdAt: now,
        updatedAt: now,
      }
    );

    // Insert items (tolerate FK errors for catalog items not yet in LaborItems table)
    if (data.Items && data.Items.length > 0) {
      for (const item of data.Items) {
        const itemId = item.Id || item.id || uuidv4();
        try {
          await executeQuery(
            `INSERT INTO dbo.LaborSolutionItems
             (Id, SolutionId, CatalogItemId, Quantity, HoursPerUnit, RatePerHour, GroupName, SortOrder, CreatedAt, UpdatedAt)
             VALUES (@id, @solutionId, @catalogItemId, @qty, @hours, @rate, @groupName, @sortOrder, @createdAt, @updatedAt)`,
            {
              id: itemId,
              solutionId: id,
              catalogItemId: item.CatalogItemId || item.catalogItemId || '',
              qty: item.Quantity ?? item.quantity ?? 1,
              hours: item.HoursPerUnit ?? item.hoursPerUnit ?? 0,
              rate: item.RatePerHour ?? item.ratePerHour ?? 0,
              groupName: item.GroupName || item.groupName || 'Default',
              sortOrder: item.SortOrder ?? item.sortOrder ?? 0,
              createdAt: now,
              updatedAt: now,
            }
          );
        } catch (itemErr: any) {
          console.warn(`[LaborSolutionService] Skipping item ${itemId} – ${itemErr.message}`);
        }
      }
    }

    return (await this.getById(id))!;
  }

  // ─── UPDATE ──────────────────────────────────────────
  static async update(id: string, data: Partial<LaborSolution> & { Items?: any[] }): Promise<LaborSolution | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    await executeQuery(
      `UPDATE dbo.LaborSolutions SET
        Name = @name,
        Description = @desc,
        OverheadPercent = @overhead,
        ContingencyPercent = @contingency,
        LastModified = @lastModified,
        UpdatedAt = @updatedAt
       WHERE Id = @id`,
      {
        id,
        name: data.Name ?? existing.Name,
        desc: data.Description !== undefined ? data.Description : existing.Description,
        overhead: data.OverheadPercent ?? existing.OverheadPercent,
        contingency: data.ContingencyPercent ?? existing.ContingencyPercent,
        lastModified: today,
        updatedAt: now,
      }
    );

    // Replace items if provided
    if (data.Items !== undefined) {
      await executeQuery(
        `DELETE FROM dbo.LaborSolutionItems WHERE SolutionId = @solutionId`,
        { solutionId: id }
      );

      for (const item of data.Items) {
        const itemId = item.Id || item.id || uuidv4();
        try {
          await executeQuery(
            `INSERT INTO dbo.LaborSolutionItems
             (Id, SolutionId, CatalogItemId, Quantity, HoursPerUnit, RatePerHour, GroupName, SortOrder, CreatedAt, UpdatedAt)
             VALUES (@id, @solutionId, @catalogItemId, @qty, @hours, @rate, @groupName, @sortOrder, @createdAt, @updatedAt)`,
            {
              id: itemId,
              solutionId: id,
              catalogItemId: item.CatalogItemId || item.catalogItemId || '',
              qty: item.Quantity ?? item.quantity ?? 1,
              hours: item.HoursPerUnit ?? item.hoursPerUnit ?? 0,
              rate: item.RatePerHour ?? item.ratePerHour ?? 0,
              groupName: item.GroupName || item.groupName || 'Default',
              sortOrder: item.SortOrder ?? item.sortOrder ?? 0,
              createdAt: now,
              updatedAt: now,
            }
          );
        } catch (itemErr: any) {
          console.warn(`[LaborSolutionService] Skipping item ${itemId} in update – ${itemErr.message}`);
        }
      }
    }

    return this.getById(id);
  }

  // ─── DELETE ──────────────────────────────────────────
  static async delete(id: string): Promise<boolean> {
    // Items are cascade-deleted by FK
    await executeQuery(
      `DELETE FROM dbo.LaborSolutions WHERE Id = @id`,
      { id }
    );
    return true;
  }

  // ─── BULK REPLACE ────────────────────────────────────
  // Replace all solutions at once (used for full sync from frontend)
  static async replaceAll(solutions: (Partial<LaborSolution> & { Items?: any[] })[]): Promise<LaborSolution[]> {
    // Delete all existing solutions (cascade deletes items)
    await executeQuery(`DELETE FROM dbo.LaborSolutionItems`);
    await executeQuery(`DELETE FROM dbo.LaborSolutions`);

    // Re-insert all
    for (const sol of solutions) {
      await this.create(sol);
    }

    return this.getAll();
  }
}
