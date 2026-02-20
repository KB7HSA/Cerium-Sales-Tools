-- ================================================================
-- MSP Offering Add-on Services Table
-- ================================================================
-- This script adds a new table for offering-level add-on services
-- that can be selected/deselected during the quoting process
--
-- Created: February 20, 2026
-- ================================================================

USE CeriumSalesTools;
GO

-- MSP offering add-on services (independent add-ons for the entire offering)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferingAddOns')
BEGIN
    CREATE TABLE dbo.MspOfferingAddOns (
        Id NVARCHAR(64) NOT NULL,
        OfferingId NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        MonthlyPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
        MonthlyCost DECIMAL(12,2) NULL,
        MarginPercent DECIMAL(6,2) NULL,
        OneTimePrice DECIMAL(12,2) NOT NULL DEFAULT 0,
        OneTimeCost DECIMAL(12,2) NULL,
        OneTimeMargin DECIMAL(6,2) NULL,
        PricingUnit NVARCHAR(50) NOT NULL DEFAULT 'per-user',
        IsActive BIT NOT NULL DEFAULT 1,
        IsDefaultSelected BIT NOT NULL DEFAULT 0,
        DisplayOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_MspOfferingAddOns PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_MspOfferingAddOns_Offerings FOREIGN KEY (OfferingId)
            REFERENCES dbo.MspOfferings(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_MspOfferingAddOns_OfferingId ON dbo.MspOfferingAddOns(OfferingId);
    CREATE NONCLUSTERED INDEX IX_MspOfferingAddOns_IsActive ON dbo.MspOfferingAddOns(IsActive);
    
    PRINT 'Table dbo.MspOfferingAddOns created successfully';
END
ELSE
BEGIN
    PRINT 'Table dbo.MspOfferingAddOns already exists';
END
GO

-- Create update timestamp trigger
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_MspOfferingAddOns_UpdateTimestamp')
    DROP TRIGGER dbo.trg_MspOfferingAddOns_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_MspOfferingAddOns_UpdateTimestamp
ON dbo.MspOfferingAddOns
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.MspOfferingAddOns
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.MspOfferingAddOns o
    INNER JOIN inserted i ON o.Id = i.Id;
END
GO

PRINT 'Created trigger: trg_MspOfferingAddOns_UpdateTimestamp';
GO

-- Example: Insert a sample add-on service
-- UNCOMMENT to test:
/*
INSERT INTO dbo.MspOfferingAddOns (
    Id, OfferingId, Name, Description, 
    MonthlyPrice, MonthlyCost, MarginPercent,
    OneTimePrice, OneTimeCost, OneTimeMargin,
    PricingUnit, IsActive, IsDefaultSelected, DisplayOrder
)
VALUES (
    NEWID(), 
    'YOUR_OFFERING_ID_HERE', 
    '24/7 Premium Support',
    'Round-the-clock priority support with 1-hour response time',
    50.00, 35.00, 42.86,
    100.00, 75.00, 33.33,
    'per-user',
    1,
    0,
    0
);
*/

PRINT 'MspOfferingAddOns table setup complete!';
GO
