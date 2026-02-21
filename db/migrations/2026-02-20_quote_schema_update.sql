/*
  Quote Schema Migration - February 20, 2026
  
  This migration adds missing columns to the Quotes table to store
  complete quote information including pricing breakdown, service level
  details, and add-on data.
*/

USE CeriumSalesTools;
GO

-- ================================================================
-- ADD MISSING COLUMNS TO QUOTES TABLE
-- ================================================================

-- Service Level and Pricing Information
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'ServiceLevelName')
BEGIN
    ALTER TABLE dbo.Quotes ADD ServiceLevelName NVARCHAR(255) NULL;
    PRINT 'Added ServiceLevelName column to Quotes table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'PricingUnitLabel')
BEGIN
    ALTER TABLE dbo.Quotes ADD PricingUnitLabel NVARCHAR(50) NULL;
    PRINT 'Added PricingUnitLabel column to Quotes table';
END
GO

-- Per-unit pricing breakdown
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'BasePricePerUnit')
BEGIN
    ALTER TABLE dbo.Quotes ADD BasePricePerUnit DECIMAL(12,2) NOT NULL DEFAULT 0;
    PRINT 'Added BasePricePerUnit column to Quotes table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'ProfessionalServicesPrice')
BEGIN
    ALTER TABLE dbo.Quotes ADD ProfessionalServicesPrice DECIMAL(12,2) NOT NULL DEFAULT 0;
    PRINT 'Added ProfessionalServicesPrice column to Quotes table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'ProfessionalServicesTotal')
BEGIN
    ALTER TABLE dbo.Quotes ADD ProfessionalServicesTotal DECIMAL(12,2) NOT NULL DEFAULT 0;
    PRINT 'Added ProfessionalServicesTotal column to Quotes table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'PerUnitTotal')
BEGIN
    ALTER TABLE dbo.Quotes ADD PerUnitTotal DECIMAL(12,2) NOT NULL DEFAULT 0;
    PRINT 'Added PerUnitTotal column to Quotes table';
END
GO

-- Add-on pricing totals
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'AddOnMonthlyTotal')
BEGIN
    ALTER TABLE dbo.Quotes ADD AddOnMonthlyTotal DECIMAL(12,2) NOT NULL DEFAULT 0;
    PRINT 'Added AddOnMonthlyTotal column to Quotes table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'AddOnOneTimeTotal')
BEGIN
    ALTER TABLE dbo.Quotes ADD AddOnOneTimeTotal DECIMAL(12,2) NOT NULL DEFAULT 0;
    PRINT 'Added AddOnOneTimeTotal column to Quotes table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'AddOnPerUnitTotal')
BEGIN
    ALTER TABLE dbo.Quotes ADD AddOnPerUnitTotal DECIMAL(12,2) NOT NULL DEFAULT 0;
    PRINT 'Added AddOnPerUnitTotal column to Quotes table';
END
GO

-- Discount tracking
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Quotes') AND name = 'AnnualDiscountApplied')
BEGIN
    ALTER TABLE dbo.Quotes ADD AnnualDiscountApplied BIT NOT NULL DEFAULT 0;
    PRINT 'Added AnnualDiscountApplied column to Quotes table';
END
GO

-- ================================================================
-- UPDATE QuoteSelectedOptions TABLE TO USE NVARCHAR ID
-- ================================================================

-- Check if QuoteSelectedOptions exists and update Id column if needed
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'QuoteSelectedOptions')
BEGIN
    -- Drop existing table and recreate with correct schema
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.QuoteSelectedOptions') AND name = 'Id' AND system_type_id = 127) -- BIGINT
    BEGIN
        -- Drop the existing table (will cascade delete any data)
        DROP TABLE dbo.QuoteSelectedOptions;
        PRINT 'Dropped existing QuoteSelectedOptions table with BIGINT Id';
        
        -- Recreate with NVARCHAR Id
        CREATE TABLE dbo.QuoteSelectedOptions (
            Id NVARCHAR(64) NOT NULL,
            QuoteId NVARCHAR(64) NOT NULL,
            OptionId NVARCHAR(64) NOT NULL,
            Name NVARCHAR(255) NOT NULL,
            MonthlyPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
            PricingUnit NVARCHAR(50) NOT NULL,
            CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
            CONSTRAINT PK_QuoteSelectedOptions PRIMARY KEY CLUSTERED (Id),
            CONSTRAINT FK_QuoteSelectedOptions_Quotes FOREIGN KEY (QuoteId)
                REFERENCES dbo.Quotes(Id) ON DELETE CASCADE
        );
        
        CREATE NONCLUSTERED INDEX IX_QuoteSelectedOptions_QuoteId ON dbo.QuoteSelectedOptions(QuoteId);
        PRINT 'Recreated QuoteSelectedOptions table with NVARCHAR Id';
    END
END
GO

-- ================================================================
-- VERIFY SCHEMA CHANGES
-- ================================================================

-- Display current Quotes table schema
SELECT 
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable,
    ISNULL(dc.definition, '') AS DefaultValue
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
WHERE c.object_id = OBJECT_ID('dbo.Quotes')
ORDER BY c.column_id;
GO

PRINT 'Quote schema migration completed successfully';
GO
