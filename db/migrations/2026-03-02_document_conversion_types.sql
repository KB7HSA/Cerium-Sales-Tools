-- ============================================================================
-- Migration: Document Conversion Types
-- Date: 2026-03-02
-- Description: Create tables for Document Conversion feature
-- ============================================================================

-- Document Conversion Types table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DocumentConversionTypes')
BEGIN
  CREATE TABLE dbo.DocumentConversionTypes (
    Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Category NVARCHAR(100) NULL,
    TemplateFileName NVARCHAR(500) NULL,
    HeaderContent NVARCHAR(MAX) NULL,
    FooterContent NVARCHAR(MAX) NULL,
    OutputFileNamePattern NVARCHAR(500) NULL DEFAULT '{originalName}_converted',
    IsActive BIT NOT NULL DEFAULT 1,
    SortOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
  );
  PRINT 'Created DocumentConversionTypes table';
END
GO

-- Converted Documents table (history)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConvertedDocuments')
BEGIN
  CREATE TABLE dbo.ConvertedDocuments (
    Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ConversionTypeId UNIQUEIDENTIFIER NOT NULL,
    OriginalFileName NVARCHAR(500) NOT NULL,
    ConvertedFileName NVARCHAR(500) NULL,
    FileData VARBINARY(MAX) NULL,
    FileSizeBytes BIGINT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'completed',
    ConvertedBy NVARCHAR(200) NULL,
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_ConvertedDocuments_ConversionType FOREIGN KEY (ConversionTypeId) 
      REFERENCES dbo.DocumentConversionTypes(Id),
    CONSTRAINT CK_ConvertedDocuments_Status CHECK (Status IN ('processing', 'completed', 'failed', 'downloaded'))
  );
  PRINT 'Created ConvertedDocuments table';
END
GO

-- Seed data for default conversion types
IF NOT EXISTS (SELECT 1 FROM dbo.DocumentConversionTypes WHERE Name = 'Standard Document Conversion')
BEGIN
  INSERT INTO dbo.DocumentConversionTypes (Id, Name, Description, Category, TemplateFileName, OutputFileNamePattern, IsActive, SortOrder)
  VALUES (
    NEWID(),
    'Standard Document Conversion',
    'Converts a Word document to use standard company headers and footers',
    'General',
    'Standard-Template.docx',
    '{originalName}_converted',
    1,
    1
  );
  PRINT 'Inserted seed data: Standard Document Conversion';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.DocumentConversionTypes WHERE Name = 'Proposal Template')
BEGIN
  INSERT INTO dbo.DocumentConversionTypes (Id, Name, Description, Category, TemplateFileName, OutputFileNamePattern, IsActive, SortOrder)
  VALUES (
    NEWID(),
    'Proposal Template',
    'Converts a Word document to use the company proposal template with branded headers/footers',
    'Sales',
    'Proposal-Template.docx',
    '{originalName}_proposal',
    1,
    2
  );
  PRINT 'Inserted seed data: Proposal Template';
END
GO
