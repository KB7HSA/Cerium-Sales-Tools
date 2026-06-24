-- =====================================================
-- Migration: Add ReferenceArchitecture to SolutionBlueprints
--            Add GroupName/SortOrder to LaborSolutionItems
-- Date: 2026-02-26
-- Note: Filename sorts after 2026-02-26_labor_budget_00_schema.sql.
-- =====================================================

USE CeriumSalesTools;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'SolutionBlueprints' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.SolutionBlueprints')
        AND name = 'ReferenceArchitecture'
    )
    BEGIN
        ALTER TABLE dbo.SolutionBlueprints
        ADD ReferenceArchitecture NVARCHAR(255) NULL;

        PRINT 'Added ReferenceArchitecture column to SolutionBlueprints table.';
    END
END
ELSE
BEGIN
    PRINT 'SolutionBlueprints table not found — skipping ReferenceArchitecture migration.';
END
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborSolutionItems' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.LaborSolutionItems')
        AND name = 'GroupName'
    )
    BEGIN
        ALTER TABLE dbo.LaborSolutionItems
        ADD GroupName NVARCHAR(255) NULL DEFAULT 'Default';

        PRINT 'Added GroupName column to LaborSolutionItems table.';
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.LaborSolutionItems')
        AND name = 'SortOrder'
    )
    BEGIN
        ALTER TABLE dbo.LaborSolutionItems
        ADD SortOrder INT NULL DEFAULT 0;

        PRINT 'Added SortOrder column to LaborSolutionItems table.';
    END
END
ELSE
BEGIN
    PRINT 'LaborSolutionItems table not found — skipping GroupName/SortOrder migration.';
END
GO

PRINT 'Labor budget persistence migration complete.';
GO
