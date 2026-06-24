-- Migration: Add CreatedBy field to Quotes table
-- Date: 2026-02-22
-- Description: Track which user created each quote

USE CeriumSalesTools;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Quotes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
        SELECT * FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.Quotes')
        AND name = 'CreatedBy'
    )
    BEGIN
        ALTER TABLE dbo.Quotes ADD CreatedBy NVARCHAR(255) NULL;
        PRINT 'Added CreatedBy column to Quotes table';
    END

    IF NOT EXISTS (
        SELECT * FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.Quotes')
        AND name = 'CreatedByEmail'
    )
    BEGIN
        ALTER TABLE dbo.Quotes ADD CreatedByEmail NVARCHAR(255) NULL;
        PRINT 'Added CreatedByEmail column to Quotes table';
    END

    IF NOT EXISTS (
        SELECT * FROM sys.indexes
        WHERE name = 'IX_Quotes_CreatedByEmail'
        AND object_id = OBJECT_ID('dbo.Quotes')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Quotes_CreatedByEmail ON dbo.Quotes(CreatedByEmail);
        PRINT 'Created index IX_Quotes_CreatedByEmail';
    END
END
ELSE
BEGIN
    PRINT 'Quotes table not found — skipping CreatedBy migration.';
END
GO

PRINT 'CreatedBy migration completed';
GO
