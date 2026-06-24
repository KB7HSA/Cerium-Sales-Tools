-- 2026-05-06: Add MSP offering categories table and remove fixed category check constraint

SET NOCOUNT ON;
GO

USE CeriumSalesTools;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferingCategories' AND schema_id = SCHEMA_ID('dbo'))
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
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferings' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.MspOfferings')
          AND name = 'CK_MspOfferings_Category'
    )
    BEGIN
        ALTER TABLE dbo.MspOfferings DROP CONSTRAINT CK_MspOfferings_Category;
    END
END
GO

INSERT INTO dbo.MspOfferingCategories (Id, Name, Slug, Description, IsActive, DisplayOrder)
SELECT NEWID(), v.Name, v.Slug, v.Description, 1, v.DisplayOrder
FROM (
    VALUES
      ('Backup Solutions', 'backup', 'Data backup and recovery services', 1),
      ('Support Services', 'support', 'Managed support and help desk services', 2),
      ('Database Management', 'database', 'Database operations and optimization', 3),
      ('Consulting', 'consulting', 'Advisory and professional services', 4),
      ('Security', 'security', 'Security monitoring and protection services', 5),
      ('Cloud', 'cloud', 'Cloud migration and operations services', 6)
) v(Name, Slug, Description, DisplayOrder)
WHERE EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferingCategories' AND schema_id = SCHEMA_ID('dbo'))
  AND NOT EXISTS (
    SELECT 1 FROM dbo.MspOfferingCategories c WHERE c.Slug = v.Slug
);
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferings' AND schema_id = SCHEMA_ID('dbo'))
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferingCategories' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
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
        SELECT 1 FROM dbo.MspOfferingCategories c WHERE c.Slug = LOWER(o.Category)
      )
    GROUP BY o.Category;
END
GO
