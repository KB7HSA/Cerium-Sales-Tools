import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

export interface SolutionBlueprint {
  Id: string;
  Name: string;
  Description?: string;
  OverheadPercent: number;
  ContingencyPercent: number;
  ProjectManagementPercent: number;
  ProjectManagementHours: number;
  ProjectManagementRatePerHour: number;
  ProjectManagementNotes?: string;
  AdoptionHours: number;
  AdoptionRatePerHour: number;
  AdoptionNotes?: string;
  ReferenceArchitecture?: string;
  IsPublic: boolean;
  CreatedDate?: string;
  LastModified?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
  Items?: SolutionBlueprintItem[];
}

export interface SolutionBlueprintItem {
  Id: string;
  BlueprintId: string;
  CatalogItemId: string;
  Quantity: number;
  HoursPerUnit: number;
  RatePerHour: number;
  CatalogSnapshot?: string; // JSON
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class SolutionBlueprintService {

  // ─── GET ALL ─────────────────────────────────────────
  static async getAll(): Promise<SolutionBlueprint[]> {
    const blueprints = await executeQuery<SolutionBlueprint>(
      `SELECT * FROM dbo.SolutionBlueprints ORDER BY Name`
    );

    // Fetch items for each blueprint
    for (const bp of blueprints) {
      bp.Items = await executeQuery<SolutionBlueprintItem>(
        `SELECT * FROM dbo.SolutionBlueprintItems WHERE BlueprintId = @blueprintId ORDER BY Id`,
        { blueprintId: bp.Id }
      );
    }
    return blueprints;
  }

  // ─── GET BY ID ───────────────────────────────────────
  static async getById(id: string): Promise<SolutionBlueprint | null> {
    const results = await executeQuery<SolutionBlueprint>(
      `SELECT * FROM dbo.SolutionBlueprints WHERE Id = @id`,
      { id }
    );
    if (results.length === 0) return null;

    const bp = results[0];
    bp.Items = await executeQuery<SolutionBlueprintItem>(
      `SELECT * FROM dbo.SolutionBlueprintItems WHERE BlueprintId = @blueprintId ORDER BY Id`,
      { blueprintId: bp.Id }
    );
    return bp;
  }

  // ─── CREATE ──────────────────────────────────────────
  static async create(data: Partial<SolutionBlueprint> & { Items?: any[] }): Promise<SolutionBlueprint> {
    const id = data.Id || uuidv4();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    await executeQuery(
      `INSERT INTO dbo.SolutionBlueprints
       (Id, Name, Description, OverheadPercent, ContingencyPercent,
        ProjectManagementPercent, ProjectManagementHours, ProjectManagementRatePerHour, ProjectManagementNotes,
        AdoptionHours, AdoptionRatePerHour, AdoptionNotes,
        ReferenceArchitecture, IsPublic, CreatedDate, LastModified, CreatedAt, UpdatedAt)
       VALUES
       (@id, @name, @desc, @overhead, @contingency,
        @pmPercent, @pmHours, @pmRate, @pmNotes,
        @adoptHours, @adoptRate, @adoptNotes,
        @refArch, @isPublic, @createdDate, @lastModified, @createdAt, @updatedAt)`,
      {
        id,
        name: data.Name || 'Untitled Blueprint',
        desc: data.Description || null,
        overhead: data.OverheadPercent ?? 10,
        contingency: data.ContingencyPercent ?? 5,
        pmPercent: data.ProjectManagementPercent ?? 10,
        pmHours: data.ProjectManagementHours ?? 0,
        pmRate: data.ProjectManagementRatePerHour ?? 225,
        pmNotes: data.ProjectManagementNotes || null,
        adoptHours: data.AdoptionHours ?? 0,
        adoptRate: data.AdoptionRatePerHour ?? 175,
        adoptNotes: data.AdoptionNotes || null,
        refArch: data.ReferenceArchitecture || null,
        isPublic: data.IsPublic ? 1 : 0,
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
            `INSERT INTO dbo.SolutionBlueprintItems
             (Id, BlueprintId, CatalogItemId, Quantity, HoursPerUnit, RatePerHour, CatalogSnapshot, CreatedAt, UpdatedAt)
             VALUES (@id, @blueprintId, @catalogItemId, @qty, @hours, @rate, @snapshot, @createdAt, @updatedAt)`,
            {
              id: itemId,
              blueprintId: id,
              catalogItemId: item.CatalogItemId || item.catalogItemId || '',
              qty: item.Quantity ?? item.quantity ?? 1,
              hours: item.HoursPerUnit ?? item.hoursPerUnit ?? 0,
              rate: item.RatePerHour ?? item.ratePerHour ?? 0,
              snapshot: item.CatalogSnapshot || item.catalogSnapshot
                ? (typeof (item.CatalogSnapshot || item.catalogSnapshot) === 'string'
                    ? (item.CatalogSnapshot || item.catalogSnapshot)
                    : JSON.stringify(item.CatalogSnapshot || item.catalogSnapshot))
                : null,
              createdAt: now,
              updatedAt: now,
            }
          );
        } catch (itemErr: any) {
          console.warn(`[SolutionBlueprintService] Skipping item ${itemId} – ${itemErr.message}`);
        }
      }
    }

    return (await this.getById(id))!;
  }

  // ─── UPDATE ──────────────────────────────────────────
  static async update(id: string, data: Partial<SolutionBlueprint> & { Items?: any[] }): Promise<SolutionBlueprint | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    await executeQuery(
      `UPDATE dbo.SolutionBlueprints SET
        Name = @name,
        Description = @desc,
        OverheadPercent = @overhead,
        ContingencyPercent = @contingency,
        ProjectManagementPercent = @pmPercent,
        ProjectManagementHours = @pmHours,
        ProjectManagementRatePerHour = @pmRate,
        ProjectManagementNotes = @pmNotes,
        AdoptionHours = @adoptHours,
        AdoptionRatePerHour = @adoptRate,
        AdoptionNotes = @adoptNotes,
        ReferenceArchitecture = @refArch,
        IsPublic = @isPublic,
        LastModified = @lastModified,
        UpdatedAt = @updatedAt
       WHERE Id = @id`,
      {
        id,
        name: data.Name ?? existing.Name,
        desc: data.Description !== undefined ? data.Description : existing.Description,
        overhead: data.OverheadPercent ?? existing.OverheadPercent,
        contingency: data.ContingencyPercent ?? existing.ContingencyPercent,
        pmPercent: data.ProjectManagementPercent ?? existing.ProjectManagementPercent,
        pmHours: data.ProjectManagementHours ?? existing.ProjectManagementHours,
        pmRate: data.ProjectManagementRatePerHour ?? existing.ProjectManagementRatePerHour,
        pmNotes: data.ProjectManagementNotes !== undefined ? data.ProjectManagementNotes : existing.ProjectManagementNotes,
        adoptHours: data.AdoptionHours ?? existing.AdoptionHours,
        adoptRate: data.AdoptionRatePerHour ?? existing.AdoptionRatePerHour,
        adoptNotes: data.AdoptionNotes !== undefined ? data.AdoptionNotes : existing.AdoptionNotes,
        refArch: data.ReferenceArchitecture !== undefined ? data.ReferenceArchitecture : existing.ReferenceArchitecture,
        isPublic: data.IsPublic !== undefined ? (data.IsPublic ? 1 : 0) : (existing.IsPublic ? 1 : 0),
        lastModified: today,
        updatedAt: now,
      }
    );

    // Replace items if provided
    if (data.Items !== undefined) {
      // Delete old items
      await executeQuery(
        `DELETE FROM dbo.SolutionBlueprintItems WHERE BlueprintId = @blueprintId`,
        { blueprintId: id }
      );

      // Insert new items (tolerate FK errors)
      for (const item of data.Items) {
        const itemId = item.Id || item.id || uuidv4();
        try {
          await executeQuery(
            `INSERT INTO dbo.SolutionBlueprintItems
             (Id, BlueprintId, CatalogItemId, Quantity, HoursPerUnit, RatePerHour, CatalogSnapshot, CreatedAt, UpdatedAt)
             VALUES (@id, @blueprintId, @catalogItemId, @qty, @hours, @rate, @snapshot, @createdAt, @updatedAt)`,
            {
              id: itemId,
              blueprintId: id,
              catalogItemId: item.CatalogItemId || item.catalogItemId || '',
              qty: item.Quantity ?? item.quantity ?? 1,
              hours: item.HoursPerUnit ?? item.hoursPerUnit ?? 0,
              rate: item.RatePerHour ?? item.ratePerHour ?? 0,
              snapshot: item.CatalogSnapshot || item.catalogSnapshot
                ? (typeof (item.CatalogSnapshot || item.catalogSnapshot) === 'string'
                    ? (item.CatalogSnapshot || item.catalogSnapshot)
                    : JSON.stringify(item.CatalogSnapshot || item.catalogSnapshot))
                : null,
              createdAt: now,
              updatedAt: now,
            }
          );
        } catch (itemErr: any) {
          console.warn(`[SolutionBlueprintService] Skipping item ${itemId} in update – ${itemErr.message}`);
        }
      }
    }

    return this.getById(id);
  }

  // ─── DELETE ──────────────────────────────────────────
  static async delete(id: string): Promise<boolean> {
    // Items are cascade-deleted by FK
    await executeQuery(
      `DELETE FROM dbo.SolutionBlueprints WHERE Id = @id`,
      { id }
    );
    return true;
  }
}
