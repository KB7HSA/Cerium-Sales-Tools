-- =====================================================
-- Migration: Add ContentSections to SOWTypes
-- Date: 2026-02-26
-- Note: Filename sorts after 2026-02-24_sow_types_00_create.sql.
-- =====================================================

USE CeriumSalesTools;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'SOWTypes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.SOWTypes')
        AND name = 'ContentSections'
    )
    BEGIN
        ALTER TABLE dbo.SOWTypes
        ADD ContentSections NVARCHAR(MAX) NULL;

        PRINT 'Added ContentSections column to SOWTypes table.';
    END
END
ELSE
BEGIN
    PRINT 'SOWTypes table not found — skipping ContentSections migration.';
END
GO

PRINT 'SOW Content Sections migration complete.';
GO
