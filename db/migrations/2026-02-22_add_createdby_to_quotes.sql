-- Migration: Add CreatedBy field to Quotes table
-- Date: 2026-02-22
-- Description: Track which user created each quote

USE CeriumSalesTools;
GO

-- Add CreatedBy column to Quotes table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Quotes') 
    AND name = 'CreatedBy'
)
BEGIN
    ALTER TABLE dbo.Quotes
    ADD CreatedBy NVARCHAR(255) NULL;
    
    PRINT 'Added CreatedBy column to Quotes table';
END
ELSE
BEGIN
    PRINT 'CreatedBy column already exists in Quotes table';
END
GO

-- Add CreatedByEmail column to Quotes table (for email address)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Quotes') 
    AND name = 'CreatedByEmail'
)
BEGIN
    ALTER TABLE dbo.Quotes
    ADD CreatedByEmail NVARCHAR(255) NULL;
    
    PRINT 'Added CreatedByEmail column to Quotes table';
END
ELSE
BEGIN
    PRINT 'CreatedByEmail column already exists in Quotes table';
END
GO

-- Create index on CreatedByEmail for faster lookups
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_Quotes_CreatedByEmail' 
    AND object_id = OBJECT_ID('dbo.Quotes')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Quotes_CreatedByEmail 
    ON dbo.Quotes(CreatedByEmail);
    
    PRINT 'Created index IX_Quotes_CreatedByEmail';
END
GO

PRINT '✅ CreatedBy Migration Completed Successfully';
GO
