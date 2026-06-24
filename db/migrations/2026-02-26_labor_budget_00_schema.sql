/*
  Labor budget tables
  Date: 2026-02-26
  Description: Ensures labor budgeting tables exist before column migrations.
  Note: Also defined in mssql-schema.sql; this migration covers fresh/partial deploys.
*/

USE CeriumSalesTools;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborItems' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.LaborItems (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        HoursPerUnit DECIMAL(10,2) NOT NULL DEFAULT 0,
        RatePerHour DECIMAL(10,2) NOT NULL DEFAULT 0,
        UnitPrice DECIMAL(10,2) NOT NULL DEFAULT 0,
        UnitOfMeasure NVARCHAR(100) NOT NULL,
        Section NVARCHAR(100) NOT NULL,
        ReferenceArchitecture NVARCHAR(100) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Tooltip NVARCHAR(MAX) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_LaborItems PRIMARY KEY CLUSTERED (Id)
    );

    CREATE NONCLUSTERED INDEX IX_LaborItems_Section ON dbo.LaborItems(Section);
    CREATE NONCLUSTERED INDEX IX_LaborItems_IsActive ON dbo.LaborItems(IsActive);
    PRINT 'Created LaborItems table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborSolutions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.LaborSolutions (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        OverheadPercent DECIMAL(6,2) NOT NULL DEFAULT 10,
        ContingencyPercent DECIMAL(6,2) NOT NULL DEFAULT 5,
        CreatedDate DATE NULL,
        LastModified DATE NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_LaborSolutions PRIMARY KEY CLUSTERED (Id)
    );
    PRINT 'Created LaborSolutions table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SolutionBlueprints' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.SolutionBlueprints (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        OverheadPercent DECIMAL(6,2) NOT NULL DEFAULT 10,
        ContingencyPercent DECIMAL(6,2) NOT NULL DEFAULT 5,
        ProjectManagementPercent DECIMAL(6,2) NOT NULL DEFAULT 10,
        ProjectManagementHours DECIMAL(10,2) NOT NULL DEFAULT 0,
        ProjectManagementRatePerHour DECIMAL(10,2) NOT NULL DEFAULT 225,
        ProjectManagementNotes NVARCHAR(MAX) NULL,
        AdoptionHours DECIMAL(10,2) NOT NULL DEFAULT 0,
        AdoptionRatePerHour DECIMAL(10,2) NOT NULL DEFAULT 175,
        AdoptionNotes NVARCHAR(MAX) NULL,
        ReferenceArchitecture NVARCHAR(255) NULL,
        IsPublic BIT NOT NULL DEFAULT 0,
        CreatedDate DATE NULL,
        LastModified DATE NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SolutionBlueprints PRIMARY KEY CLUSTERED (Id)
    );
    PRINT 'Created SolutionBlueprints table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborSolutionItems' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.LaborSolutionItems (
        Id NVARCHAR(64) NOT NULL,
        SolutionId NVARCHAR(64) NOT NULL,
        CatalogItemId NVARCHAR(64) NOT NULL,
        Quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        HoursPerUnit DECIMAL(10,2) NOT NULL DEFAULT 0,
        RatePerHour DECIMAL(10,2) NOT NULL DEFAULT 0,
        GroupName NVARCHAR(255) NULL DEFAULT 'Default',
        SortOrder INT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_LaborSolutionItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_LaborSolutionItems_Solutions FOREIGN KEY (SolutionId)
            REFERENCES dbo.LaborSolutions(Id) ON DELETE CASCADE,
        CONSTRAINT FK_LaborSolutionItems_Items FOREIGN KEY (CatalogItemId)
            REFERENCES dbo.LaborItems(Id)
    );

    CREATE NONCLUSTERED INDEX IX_LaborSolutionItems_SolutionId ON dbo.LaborSolutionItems(SolutionId);
    PRINT 'Created LaborSolutionItems table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SolutionBlueprintItems' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.SolutionBlueprintItems (
        Id NVARCHAR(64) NOT NULL,
        BlueprintId NVARCHAR(64) NOT NULL,
        CatalogItemId NVARCHAR(64) NOT NULL,
        Quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        HoursPerUnit DECIMAL(10,2) NOT NULL DEFAULT 0,
        RatePerHour DECIMAL(10,2) NOT NULL DEFAULT 0,
        CatalogSnapshot NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SolutionBlueprintItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_SolutionBlueprintItems_Blueprints FOREIGN KEY (BlueprintId)
            REFERENCES dbo.SolutionBlueprints(Id) ON DELETE CASCADE,
        CONSTRAINT FK_SolutionBlueprintItems_Items FOREIGN KEY (CatalogItemId)
            REFERENCES dbo.LaborItems(Id)
    );

    CREATE NONCLUSTERED INDEX IX_SolutionBlueprintItems_BlueprintId ON dbo.SolutionBlueprintItems(BlueprintId);
    PRINT 'Created SolutionBlueprintItems table';
END
GO
