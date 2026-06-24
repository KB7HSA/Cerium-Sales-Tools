/*
  SOW Types table
  Date: 2026-02-24
  Description: Ensures SOWTypes exists before later SOW migrations.
  Note: Full SOW feature tables are in 2026-02-24_sow_types.sql.
*/

USE CeriumSalesTools;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SOWTypes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.SOWTypes (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Category NVARCHAR(100) NULL,
        TemplateFileName NVARCHAR(255) NULL DEFAULT 'SOW-Template.docx',
        OverviewTemplate NVARCHAR(MAX) NULL,
        ScopeTemplate NVARCHAR(MAX) NULL,
        MethodologyTemplate NVARCHAR(MAX) NULL,
        DeliverablesTemplate NVARCHAR(MAX) NULL,
        RecommendationsTemplate NVARCHAR(MAX) NULL,
        AIPromptOverview NVARCHAR(MAX) NULL,
        AIPromptFindings NVARCHAR(MAX) NULL,
        AIPromptRecommendations NVARCHAR(MAX) NULL,
        AIPromptScope NVARCHAR(MAX) NULL,
        AITemperature DECIMAL(3,1) NULL DEFAULT 0.7,
        ResourceFolder NVARCHAR(500) NULL,
        ContentSections NVARCHAR(MAX) NULL,
        DefaultHours DECIMAL(10,2) NULL DEFAULT 0,
        DefaultRate DECIMAL(10,2) NULL DEFAULT 175.00,
        IsActive BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SOWTypes PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_SOWTypes_Name UNIQUE (Name)
    );

    CREATE NONCLUSTERED INDEX IX_SOWTypes_Category ON dbo.SOWTypes(Category);
    CREATE NONCLUSTERED INDEX IX_SOWTypes_IsActive ON dbo.SOWTypes(IsActive);

    PRINT 'SOWTypes table created.';
END
ELSE
BEGIN
    PRINT 'SOWTypes table already exists.';
END
GO
