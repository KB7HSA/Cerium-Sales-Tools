/*
  MSP offerings table
  Date: 2026-05-06
  Description: Ensures MspOfferings exists before msp_offering_categories migration.
*/

USE CeriumSalesTools;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferings' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.MspOfferings (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        ImageUrl NVARCHAR(MAX) NULL,
        Category NVARCHAR(50) NOT NULL,
        BasePrice DECIMAL(12,2) NULL,
        PricingUnit NVARCHAR(50) NULL,
        SetupFee DECIMAL(12,2) NOT NULL DEFAULT 0,
        SetupFeeCost DECIMAL(12,2) NULL,
        SetupFeeMargin DECIMAL(6,2) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        DisplayOrder INT NOT NULL DEFAULT 0,
        CreatedDate DATE NULL,
        LastModified DATE NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_MspOfferings PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT CK_MspOfferings_Category CHECK (Category IN ('backup', 'support', 'database', 'consulting', 'security', 'cloud'))
    );

    CREATE NONCLUSTERED INDEX IX_MspOfferings_Category ON dbo.MspOfferings(Category);
    CREATE NONCLUSTERED INDEX IX_MspOfferings_IsActive ON dbo.MspOfferings(IsActive);
    PRINT 'Created MspOfferings table';
END
GO
