-- Migration: Add GroupName and SortOrder columns to QuoteWorkItems
-- Date: 2026-02-23
-- Note: Filename sorts after 2026-02-20_quote_workitems.sql (creates QuoteWorkItems).

USE CeriumSalesTools;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'QuoteWorkItems' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.QuoteWorkItems') AND name = 'GroupName')
    BEGIN
        ALTER TABLE dbo.QuoteWorkItems ADD GroupName NVARCHAR(255) NULL DEFAULT 'Default';
        PRINT 'Added GroupName column to QuoteWorkItems';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.QuoteWorkItems') AND name = 'SortOrder')
    BEGIN
        ALTER TABLE dbo.QuoteWorkItems ADD SortOrder INT NOT NULL DEFAULT 0;
        PRINT 'Added SortOrder column to QuoteWorkItems';
    END
END
ELSE
BEGIN
    PRINT 'QuoteWorkItems table not found — skipping GroupName/SortOrder migration.';
END
GO
