/*
  Export Schema Configuration - February 20, 2026
  
  This migration creates tables to store configurable export schemas
  for different quote types (MSP, Labor Budget, etc.)
*/

USE CeriumSalesTools;
GO

-- ================================================================
-- CREATE EXPORT SCHEMAS TABLE
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ExportSchemas')
BEGIN
    CREATE TABLE dbo.ExportSchemas (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        QuoteType NVARCHAR(50) NOT NULL,  -- 'msp', 'labor', etc.
        Description NVARCHAR(500) NULL,
        IsDefault BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_ExportSchemas PRIMARY KEY CLUSTERED (Id)
    );
    
    CREATE NONCLUSTERED INDEX IX_ExportSchemas_QuoteType ON dbo.ExportSchemas(QuoteType);
    PRINT 'Created ExportSchemas table';
END
GO

-- ================================================================
-- CREATE EXPORT SCHEMA COLUMNS TABLE
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ExportSchemaColumns')
BEGIN
    CREATE TABLE dbo.ExportSchemaColumns (
        Id NVARCHAR(64) NOT NULL,
        SchemaId NVARCHAR(64) NOT NULL,
        SourceField NVARCHAR(100) NOT NULL,  -- Database/object field name
        ExportHeader NVARCHAR(100) NOT NULL,  -- CSV column header name
        DisplayOrder INT NOT NULL DEFAULT 0,
        IsIncluded BIT NOT NULL DEFAULT 1,
        FormatType NVARCHAR(50) NULL,  -- 'currency', 'date', 'number', 'text'
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_ExportSchemaColumns PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_ExportSchemaColumns_Schema FOREIGN KEY (SchemaId)
            REFERENCES dbo.ExportSchemas(Id) ON DELETE CASCADE
    );
    
    CREATE NONCLUSTERED INDEX IX_ExportSchemaColumns_SchemaId ON dbo.ExportSchemaColumns(SchemaId);
    PRINT 'Created ExportSchemaColumns table';
END
GO

-- ================================================================
-- INSERT DEFAULT MSP EXPORT SCHEMA
-- ================================================================

IF NOT EXISTS (SELECT 1 FROM dbo.ExportSchemas WHERE QuoteType = 'msp' AND IsDefault = 1)
BEGIN
    DECLARE @mspSchemaId NVARCHAR(64) = NEWID();
    
    INSERT INTO dbo.ExportSchemas (Id, Name, QuoteType, Description, IsDefault, IsActive)
    VALUES (@mspSchemaId, 'Default MSP Export', 'msp', 'Standard export format for MSP service quotes', 1, 1);
    
    -- Insert default columns for MSP quotes
    INSERT INTO dbo.ExportSchemaColumns (Id, SchemaId, SourceField, ExportHeader, DisplayOrder, IsIncluded, FormatType)
    VALUES 
        (NEWID(), @mspSchemaId, 'CustomerName', 'Customer Name', 1, 1, 'text'),
        (NEWID(), @mspSchemaId, 'ServiceName', 'Service', 2, 1, 'text'),
        (NEWID(), @mspSchemaId, 'ServiceLevelName', 'Service Level', 3, 1, 'text'),
        (NEWID(), @mspSchemaId, 'NumberOfUsers', 'Users', 4, 1, 'number'),
        (NEWID(), @mspSchemaId, 'DurationMonths', 'Contract Term (Months)', 5, 1, 'number'),
        (NEWID(), @mspSchemaId, 'BasePricePerUnit', 'Base Price/User', 6, 1, 'currency'),
        (NEWID(), @mspSchemaId, 'MonthlyPrice', 'Monthly Total', 7, 1, 'currency'),
        (NEWID(), @mspSchemaId, 'SetupFee', 'Setup Fee', 8, 1, 'currency'),
        (NEWID(), @mspSchemaId, 'TotalPrice', 'Total Contract Value', 9, 1, 'currency'),
        (NEWID(), @mspSchemaId, 'Status', 'Status', 10, 1, 'text'),
        (NEWID(), @mspSchemaId, 'CreatedDate', 'Quote Date', 11, 1, 'date');
    
    PRINT 'Inserted default MSP export schema';
END
GO

-- ================================================================
-- INSERT DEFAULT LABOR EXPORT SCHEMA
-- ================================================================

IF NOT EXISTS (SELECT 1 FROM dbo.ExportSchemas WHERE QuoteType = 'labor' AND IsDefault = 1)
BEGIN
    DECLARE @laborSchemaId NVARCHAR(64) = NEWID();
    
    INSERT INTO dbo.ExportSchemas (Id, Name, QuoteType, Description, IsDefault, IsActive)
    VALUES (@laborSchemaId, 'Default Labor Export', 'labor', 'Standard export format for labor budget quotes', 1, 1);
    
    -- Insert default columns for Labor quotes
    INSERT INTO dbo.ExportSchemaColumns (Id, SchemaId, SourceField, ExportHeader, DisplayOrder, IsIncluded, FormatType)
    VALUES 
        (NEWID(), @laborSchemaId, 'CustomerName', 'Customer Name', 1, 1, 'text'),
        (NEWID(), @laborSchemaId, 'Notes', 'Project Description', 2, 1, 'text'),
        (NEWID(), @laborSchemaId, 'TotalHours', 'Total Hours', 3, 1, 'number'),
        (NEWID(), @laborSchemaId, 'TotalPrice', 'Total Labor Cost', 4, 1, 'currency'),
        (NEWID(), @laborSchemaId, 'Status', 'Status', 5, 1, 'text'),
        (NEWID(), @laborSchemaId, 'CreatedDate', 'Quote Date', 6, 1, 'date');
    
    PRINT 'Inserted default Labor export schema';
END
GO

-- ================================================================
-- VERIFY SCHEMA CREATION
-- ================================================================

SELECT 
    es.Name AS SchemaName,
    es.QuoteType,
    es.IsDefault,
    COUNT(esc.Id) AS ColumnCount
FROM dbo.ExportSchemas es
LEFT JOIN dbo.ExportSchemaColumns esc ON es.Id = esc.SchemaId
GROUP BY es.Name, es.QuoteType, es.IsDefault;
GO

PRINT 'Export schema migration completed successfully';
GO
