-- Migration: Add GroupName and SortOrder columns to QuoteWorkItems
-- Date: 2026-02-23
-- Purpose: Support work item grouping (by blueprint name) in labor quotes

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.QuoteWorkItems') AND name = 'GroupName')
BEGIN
    ALTER TABLE dbo.QuoteWorkItems ADD GroupName NVARCHAR(255) NULL DEFAULT 'Default';
    PRINT 'Added GroupName column to QuoteWorkItems';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.QuoteWorkItems') AND name = 'SortOrder')
BEGIN
    ALTER TABLE dbo.QuoteWorkItems ADD SortOrder INT NOT NULL DEFAULT 0;
    PRINT 'Added SortOrder column to QuoteWorkItems';
END
GO
