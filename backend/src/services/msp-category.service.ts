import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database';

export interface MSPCategory {
  Id?: string;
  Name: string;
  Slug: string;
  Description?: string | null;
  IsActive: boolean;
  DisplayOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export class MSPCategoryService {
  private static initialized = false;

  private static async ensureTable(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await executeQuery(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferingCategories')
      BEGIN
        CREATE TABLE dbo.MspOfferingCategories (
          Id NVARCHAR(64) NOT NULL PRIMARY KEY,
          Name NVARCHAR(100) NOT NULL,
          Slug NVARCHAR(100) NOT NULL UNIQUE,
          Description NVARCHAR(500) NULL,
          IsActive BIT NOT NULL DEFAULT 1,
          DisplayOrder INT NOT NULL DEFAULT 0,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
        );

        CREATE NONCLUSTERED INDEX IX_MspOfferingCategories_IsActive
          ON dbo.MspOfferingCategories(IsActive);
      END
    `, {});

    await executeQuery(`
      IF EXISTS (
        SELECT 1
        FROM sys.check_constraints cc
        WHERE cc.parent_object_id = OBJECT_ID('dbo.MspOfferings')
          AND cc.name = 'CK_MspOfferings_Category'
      )
      BEGIN
        ALTER TABLE dbo.MspOfferings DROP CONSTRAINT CK_MspOfferings_Category;
      END
    `, {});

    const defaultCategories: Array<{ name: string; slug: string; description: string; sort: number }> = [
      { name: 'Backup Solutions', slug: 'backup', description: 'Data backup and recovery services', sort: 1 },
      { name: 'Support Services', slug: 'support', description: 'Managed support and help desk services', sort: 2 },
      { name: 'Database Management', slug: 'database', description: 'Database operations and optimization', sort: 3 },
      { name: 'Consulting', slug: 'consulting', description: 'Advisory and professional services', sort: 4 },
      { name: 'Security', slug: 'security', description: 'Security monitoring and protection services', sort: 5 },
      { name: 'Cloud', slug: 'cloud', description: 'Cloud migration and operations services', sort: 6 },
    ];

    for (const item of defaultCategories) {
      await executeQuery(
        `
          IF NOT EXISTS (SELECT 1 FROM dbo.MspOfferingCategories WHERE Slug = @slug)
          BEGIN
            INSERT INTO dbo.MspOfferingCategories (Id, Name, Slug, Description, IsActive, DisplayOrder)
            VALUES (@id, @name, @slug, @description, 1, @displayOrder)
          END
        `,
        {
          id: uuidv4(),
          name: item.name,
          slug: item.slug,
          description: item.description,
          displayOrder: item.sort,
        }
      );
    }

    await executeQuery(`
      INSERT INTO dbo.MspOfferingCategories (Id, Name, Slug, Description, IsActive, DisplayOrder)
      SELECT NEWID(),
             CONCAT(UPPER(LEFT(o.Category, 1)), LOWER(SUBSTRING(o.Category, 2, 99))),
             LOWER(o.Category),
             NULL,
             1,
             100
      FROM dbo.MspOfferings o
      WHERE o.Category IS NOT NULL
        AND LTRIM(RTRIM(o.Category)) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.MspOfferingCategories c
          WHERE c.Slug = LOWER(o.Category)
        )
      GROUP BY o.Category
    `, {});

    this.initialized = true;
  }

  private static normalizeSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  static async getAllCategories(activeOnly: boolean = false): Promise<MSPCategory[]> {
    await this.ensureTable();

    let query = `
      SELECT Id, Name, Slug, Description, IsActive, DisplayOrder, CreatedAt, UpdatedAt
      FROM dbo.MspOfferingCategories
    `;

    if (activeOnly) {
      query += ' WHERE IsActive = 1';
    }

    query += ' ORDER BY DisplayOrder ASC, Name ASC';

    const results = await executeQuery<MSPCategory>(query, {});
    return results || [];
  }

  static async createCategory(payload: any): Promise<MSPCategory> {
    await this.ensureTable();

    const name = (payload.Name || payload.name || '').toString().trim();
    const rawSlug = (payload.Slug || payload.slug || name).toString();
    const slug = this.normalizeSlug(rawSlug);

    if (!name) {
      throw new Error('Category name is required');
    }
    if (!slug) {
      throw new Error('Category slug is required');
    }

    const exists = await executeQuery<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM dbo.MspOfferingCategories WHERE Slug = @slug',
      { slug }
    );
    if ((exists[0]?.cnt || 0) > 0) {
      throw new Error('A category with this slug already exists');
    }

    const id = uuidv4();
    const description = payload.Description ?? payload.description ?? null;
    const isActive = (payload.IsActive ?? payload.isActive) !== false;
    const displayOrder = payload.DisplayOrder ?? payload.displayOrder ?? 0;

    const created = await executeQuery<MSPCategory>(
      `
        INSERT INTO dbo.MspOfferingCategories (Id, Name, Slug, Description, IsActive, DisplayOrder)
        VALUES (@id, @name, @slug, @description, @isActive, @displayOrder);

        SELECT Id, Name, Slug, Description, IsActive, DisplayOrder, CreatedAt, UpdatedAt
        FROM dbo.MspOfferingCategories
        WHERE Id = @id
      `,
      {
        id,
        name,
        slug,
        description,
        isActive: isActive ? 1 : 0,
        displayOrder,
      }
    );

    if (!created || created.length === 0) {
      throw new Error('Failed to create category');
    }

    return created[0];
  }

  static async updateCategory(id: string, payload: any): Promise<MSPCategory | null> {
    await this.ensureTable();

    const existing = await executeQuery<MSPCategory>(
      'SELECT Id, Name, Slug, Description, IsActive, DisplayOrder, CreatedAt, UpdatedAt FROM dbo.MspOfferingCategories WHERE Id = @id',
      { id }
    );

    if (!existing || existing.length === 0) {
      return null;
    }

    const current = existing[0];

    const name = payload.Name !== undefined || payload.name !== undefined
      ? (payload.Name || payload.name || '').toString().trim()
      : current.Name;

    if (!name) {
      throw new Error('Category name is required');
    }

    const requestedSlug = payload.Slug !== undefined || payload.slug !== undefined
      ? this.normalizeSlug((payload.Slug || payload.slug || '').toString())
      : current.Slug;

    if (!requestedSlug) {
      throw new Error('Category slug is required');
    }

    if (requestedSlug !== current.Slug) {
      const conflict = await executeQuery<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM dbo.MspOfferingCategories WHERE Slug = @slug AND Id <> @id',
        { slug: requestedSlug, id }
      );

      if ((conflict[0]?.cnt || 0) > 0) {
        throw new Error('A category with this slug already exists');
      }

      const usage = await executeQuery<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM dbo.MspOfferings WHERE Category = @slug',
        { slug: current.Slug }
      );

      if ((usage[0]?.cnt || 0) > 0) {
        throw new Error('Cannot change slug for a category that is already used by offerings');
      }
    }

    const description = payload.Description !== undefined || payload.description !== undefined
      ? (payload.Description ?? payload.description ?? null)
      : current.Description;

    const isActive = payload.IsActive !== undefined || payload.isActive !== undefined
      ? ((payload.IsActive ?? payload.isActive) !== false)
      : !!current.IsActive;

    const displayOrder = payload.DisplayOrder !== undefined || payload.displayOrder !== undefined
      ? (payload.DisplayOrder ?? payload.displayOrder ?? 0)
      : (current.DisplayOrder || 0);

    const updated = await executeQuery<MSPCategory>(
      `
        UPDATE dbo.MspOfferingCategories
        SET Name = @name,
            Slug = @slug,
            Description = @description,
            IsActive = @isActive,
            DisplayOrder = @displayOrder,
            UpdatedAt = GETUTCDATE()
        WHERE Id = @id;

        SELECT Id, Name, Slug, Description, IsActive, DisplayOrder, CreatedAt, UpdatedAt
        FROM dbo.MspOfferingCategories
        WHERE Id = @id
      `,
      {
        id,
        name,
        slug: requestedSlug,
        description,
        isActive: isActive ? 1 : 0,
        displayOrder,
      }
    );

    return updated?.[0] || null;
  }

  static async deleteCategory(id: string): Promise<void> {
    await this.ensureTable();

    const found = await executeQuery<MSPCategory>(
      'SELECT Id, Slug FROM dbo.MspOfferingCategories WHERE Id = @id',
      { id }
    );

    if (!found || found.length === 0) {
      throw new Error('Category not found');
    }

    const inUse = await executeQuery<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM dbo.MspOfferings WHERE Category = @slug',
      { slug: found[0].Slug }
    );

    if ((inUse[0]?.cnt || 0) > 0) {
      throw new Error('Cannot delete category because it is used by one or more offerings');
    }

    await executeQuery('DELETE FROM dbo.MspOfferingCategories WHERE Id = @id', { id });
  }
}
