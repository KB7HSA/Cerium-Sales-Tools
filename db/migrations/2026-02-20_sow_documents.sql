/*
  Migration: SOW Documents Table
  Date: 2026-02-20
  Description: Creates table for storing generated Statement of Work documents
*/

USE CeriumSalesTools;
GO

-- SOW Documents table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SOWDocuments')
BEGIN
    CREATE TABLE dbo.SOWDocuments (
        Id NVARCHAR(64) NOT NULL,
        QuoteId NVARCHAR(64) NOT NULL,
        CustomerName NVARCHAR(255) NOT NULL,
        ServiceName NVARCHAR(255) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        FileData VARBINARY(MAX) NOT NULL,
        FileSizeBytes BIGINT NOT NULL,
        TotalValue DECIMAL(18, 2) NOT NULL DEFAULT 0,
        MonthlyValue DECIMAL(18, 2) NOT NULL DEFAULT 0,
        DurationMonths INT NOT NULL DEFAULT 0,
        GeneratedBy NVARCHAR(255) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'generated',
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SOWDocuments PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT CK_SOWDocuments_Status CHECK (Status IN ('generated', 'sent', 'signed', 'expired', 'cancelled'))
    );

    CREATE NONCLUSTERED INDEX IX_SOWDocuments_QuoteId ON dbo.SOWDocuments(QuoteId);
    CREATE NONCLUSTERED INDEX IX_SOWDocuments_CustomerName ON dbo.SOWDocuments(CustomerName);
    CREATE NONCLUSTERED INDEX IX_SOWDocuments_Status ON dbo.SOWDocuments(Status);
    CREATE NONCLUSTERED INDEX IX_SOWDocuments_CreatedAt ON dbo.SOWDocuments(CreatedAt DESC);

    PRINT 'SOWDocuments table created successfully.';
END
ELSE
BEGIN
    PRINT 'SOWDocuments table already exists.';
END
GO
