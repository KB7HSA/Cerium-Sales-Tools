/*
  SQL Server Update Triggers for Automatic Timestamp Management
  
  This script creates triggers to automatically update the UpdatedAt column
  whenever a record is modified, replicating MySQL's ON UPDATE CURRENT_TIMESTAMP behavior.
  
  Compatible with: SQL Server 2016+
  Database: CeriumSalesTools
*/

USE CeriumSalesTools;
GO

PRINT '============================================================';
PRINT 'Creating Update Timestamp Triggers';
PRINT '============================================================';
GO

-- ================================================================
-- AUTHENTICATION & AUTHORIZATION TRIGGERS
-- ================================================================

-- AuthUsers
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_AuthUsers_UpdateTimestamp')
    DROP TRIGGER dbo.trg_AuthUsers_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_AuthUsers_UpdateTimestamp
ON dbo.AuthUsers
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.AuthUsers
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.AuthUsers u
    INNER JOIN inserted i ON u.Id = i.Id
    WHERE u.UpdatedAt = i.UpdatedAt; -- Only update if not already changed
END
GO

PRINT 'Created trigger: trg_AuthUsers_UpdateTimestamp';
GO

-- AuthSessions
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_AuthSessions_UpdateTimestamp')
    DROP TRIGGER dbo.trg_AuthSessions_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_AuthSessions_UpdateTimestamp
ON dbo.AuthSessions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.AuthSessions
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.AuthSessions s
    INNER JOIN inserted i ON s.Id = i.Id
    WHERE s.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_AuthSessions_UpdateTimestamp';
GO

-- ================================================================
-- USER MANAGEMENT TRIGGERS
-- ================================================================

-- AdminUsers
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_AdminUsers_UpdateTimestamp')
    DROP TRIGGER dbo.trg_AdminUsers_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_AdminUsers_UpdateTimestamp
ON dbo.AdminUsers
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.AdminUsers
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.AdminUsers u
    INNER JOIN inserted i ON u.Id = i.Id
    WHERE u.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_AdminUsers_UpdateTimestamp';
GO

-- UserProfiles
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_UserProfiles_UpdateTimestamp')
    DROP TRIGGER dbo.trg_UserProfiles_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_UserProfiles_UpdateTimestamp
ON dbo.UserProfiles
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.UserProfiles
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.UserProfiles p
    INNER JOIN inserted i ON p.Id = i.Id
    WHERE p.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_UserProfiles_UpdateTimestamp';
GO

-- UserPreferences
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_UserPreferences_UpdateTimestamp')
    DROP TRIGGER dbo.trg_UserPreferences_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_UserPreferences_UpdateTimestamp
ON dbo.UserPreferences
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.UserPreferences
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.UserPreferences p
    INNER JOIN inserted i ON p.Id = i.Id
    WHERE p.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_UserPreferences_UpdateTimestamp';
GO

-- ================================================================
-- CUSTOMER MANAGEMENT TRIGGERS
-- ================================================================

-- Customers
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Customers_UpdateTimestamp')
    DROP TRIGGER dbo.trg_Customers_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_Customers_UpdateTimestamp
ON dbo.Customers
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.Customers
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.Customers c
    INNER JOIN inserted i ON c.Id = i.Id
    WHERE c.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_Customers_UpdateTimestamp';
GO

-- CustomerContacts
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_CustomerContacts_UpdateTimestamp')
    DROP TRIGGER dbo.trg_CustomerContacts_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_CustomerContacts_UpdateTimestamp
ON dbo.CustomerContacts
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.CustomerContacts
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.CustomerContacts c
    INNER JOIN inserted i ON c.Id = i.Id
    WHERE c.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_CustomerContacts_UpdateTimestamp';
GO

-- ================================================================
-- LABOR BUDGETING TRIGGERS
-- ================================================================

-- LaborUnits
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_LaborUnits_UpdateTimestamp')
    DROP TRIGGER dbo.trg_LaborUnits_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_LaborUnits_UpdateTimestamp
ON dbo.LaborUnits
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.LaborUnits
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.LaborUnits u
    INNER JOIN inserted i ON u.Id = i.Id
    WHERE u.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_LaborUnits_UpdateTimestamp';
GO

-- LaborSections
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_LaborSections_UpdateTimestamp')
    DROP TRIGGER dbo.trg_LaborSections_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_LaborSections_UpdateTimestamp
ON dbo.LaborSections
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.LaborSections
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.LaborSections s
    INNER JOIN inserted i ON s.Id = i.Id
    WHERE s.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_LaborSections_UpdateTimestamp';
GO

-- LaborItems
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_LaborItems_UpdateTimestamp')
    DROP TRIGGER dbo.trg_LaborItems_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_LaborItems_UpdateTimestamp
ON dbo.LaborItems
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.LaborItems
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.LaborItems i
    INNER JOIN inserted ins ON i.Id = ins.Id
    WHERE i.UpdatedAt = ins.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_LaborItems_UpdateTimestamp';
GO

-- LaborSolutions
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_LaborSolutions_UpdateTimestamp')
    DROP TRIGGER dbo.trg_LaborSolutions_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_LaborSolutions_UpdateTimestamp
ON dbo.LaborSolutions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.LaborSolutions
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.LaborSolutions s
    INNER JOIN inserted i ON s.Id = i.Id
    WHERE s.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_LaborSolutions_UpdateTimestamp';
GO

-- LaborSolutionItems
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_LaborSolutionItems_UpdateTimestamp')
    DROP TRIGGER dbo.trg_LaborSolutionItems_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_LaborSolutionItems_UpdateTimestamp
ON dbo.LaborSolutionItems
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.LaborSolutionItems
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.LaborSolutionItems s
    INNER JOIN inserted i ON s.Id = i.Id
    WHERE s.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_LaborSolutionItems_UpdateTimestamp';
GO

-- LaborWizardDrafts
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_LaborWizardDrafts_UpdateTimestamp')
    DROP TRIGGER dbo.trg_LaborWizardDrafts_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_LaborWizardDrafts_UpdateTimestamp
ON dbo.LaborWizardDrafts
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.LaborWizardDrafts
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.LaborWizardDrafts d
    INNER JOIN inserted i ON d.Id = i.Id
    WHERE d.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_LaborWizardDrafts_UpdateTimestamp';
GO

-- LaborWizardSolutions
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_LaborWizardSolutions_UpdateTimestamp')
    DROP TRIGGER dbo.trg_LaborWizardSolutions_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_LaborWizardSolutions_UpdateTimestamp
ON dbo.LaborWizardSolutions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.LaborWizardSolutions
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.LaborWizardSolutions s
    INNER JOIN inserted i ON s.Id = i.Id
    WHERE s.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_LaborWizardSolutions_UpdateTimestamp';
GO

-- LaborWizardItems
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_LaborWizardItems_UpdateTimestamp')
    DROP TRIGGER dbo.trg_LaborWizardItems_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_LaborWizardItems_UpdateTimestamp
ON dbo.LaborWizardItems
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.LaborWizardItems
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.LaborWizardItems i
    INNER JOIN inserted ins ON i.Id = ins.Id
    WHERE i.UpdatedAt = ins.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_LaborWizardItems_UpdateTimestamp';
GO

-- SolutionBlueprints
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_SolutionBlueprints_UpdateTimestamp')
    DROP TRIGGER dbo.trg_SolutionBlueprints_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_SolutionBlueprints_UpdateTimestamp
ON dbo.SolutionBlueprints
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.SolutionBlueprints
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.SolutionBlueprints b
    INNER JOIN inserted i ON b.Id = i.Id
    WHERE b.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_SolutionBlueprints_UpdateTimestamp';
GO

-- SolutionBlueprintItems
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_SolutionBlueprintItems_UpdateTimestamp')
    DROP TRIGGER dbo.trg_SolutionBlueprintItems_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_SolutionBlueprintItems_UpdateTimestamp
ON dbo.SolutionBlueprintItems
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.SolutionBlueprintItems
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.SolutionBlueprintItems b
    INNER JOIN inserted i ON b.Id = i.Id
    WHERE b.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_SolutionBlueprintItems_UpdateTimestamp';
GO

-- ================================================================
-- MSP SERVICES TRIGGERS
-- ================================================================

-- PricingUnits
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_PricingUnits_UpdateTimestamp')
    DROP TRIGGER dbo.trg_PricingUnits_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_PricingUnits_UpdateTimestamp
ON dbo.PricingUnits
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.PricingUnits
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.PricingUnits p
    INNER JOIN inserted i ON p.Id = i.Id
    WHERE p.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_PricingUnits_UpdateTimestamp';
GO

-- MspOfferings
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_MspOfferings_UpdateTimestamp')
    DROP TRIGGER dbo.trg_MspOfferings_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_MspOfferings_UpdateTimestamp
ON dbo.MspOfferings
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.MspOfferings
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.MspOfferings o
    INNER JOIN inserted i ON o.Id = i.Id
    WHERE o.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_MspOfferings_UpdateTimestamp';
GO

-- MspServiceLevels
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_MspServiceLevels_UpdateTimestamp')
    DROP TRIGGER dbo.trg_MspServiceLevels_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_MspServiceLevels_UpdateTimestamp
ON dbo.MspServiceLevels
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.MspServiceLevels
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.MspServiceLevels s
    INNER JOIN inserted i ON s.Id = i.Id
    WHERE s.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_MspServiceLevels_UpdateTimestamp';
GO

-- MspServiceLevelOptions
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_MspServiceLevelOptions_UpdateTimestamp')
    DROP TRIGGER dbo.trg_MspServiceLevelOptions_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_MspServiceLevelOptions_UpdateTimestamp
ON dbo.MspServiceLevelOptions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.MspServiceLevelOptions
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.MspServiceLevelOptions o
    INNER JOIN inserted i ON o.Id = i.Id
    WHERE o.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_MspServiceLevelOptions_UpdateTimestamp';
GO

-- ================================================================
-- QUOTES & PROPOSALS TRIGGERS
-- ================================================================

-- Quotes
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Quotes_UpdateTimestamp')
    DROP TRIGGER dbo.trg_Quotes_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_Quotes_UpdateTimestamp
ON dbo.Quotes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.Quotes
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.Quotes q
    INNER JOIN inserted i ON q.Id = i.Id
    WHERE q.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_Quotes_UpdateTimestamp';
GO

-- ================================================================
-- DOMAIN ANALYTICS TRIGGERS
-- ================================================================

-- AnalyticsDomains
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_AnalyticsDomains_UpdateTimestamp')
    DROP TRIGGER dbo.trg_AnalyticsDomains_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_AnalyticsDomains_UpdateTimestamp
ON dbo.AnalyticsDomains
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.AnalyticsDomains
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.AnalyticsDomains d
    INNER JOIN inserted i ON d.Id = i.Id
    WHERE d.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_AnalyticsDomains_UpdateTimestamp';
GO

-- ================================================================
-- SUPPORT & OPERATIONS TRIGGERS
-- ================================================================

-- SupportTickets
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_SupportTickets_UpdateTimestamp')
    DROP TRIGGER dbo.trg_SupportTickets_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_SupportTickets_UpdateTimestamp
ON dbo.SupportTickets
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.SupportTickets
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.SupportTickets t
    INNER JOIN inserted i ON t.Id = i.Id
    WHERE t.UpdatedAt = i.UpdatedAt;
END
GO

PRINT 'Created trigger: trg_SupportTickets_UpdateTimestamp';
GO

-- ================================================================
-- VALIDATION & TESTING
-- ================================================================

PRINT '';
PRINT '============================================================';
PRINT 'Trigger Creation Complete';
PRINT '============================================================';
PRINT '';

-- List all created triggers
SELECT 
    OBJECT_NAME(parent_id) AS TableName,
    name AS TriggerName,
    create_date AS CreatedDate,
    modify_date AS ModifiedDate
FROM sys.triggers
WHERE parent_class = 1 -- Object triggers
    AND name LIKE 'trg_%UpdateTimestamp'
ORDER BY OBJECT_NAME(parent_id);

PRINT '';
PRINT 'Total Triggers Created: ';
SELECT COUNT(*) AS TriggerCount
FROM sys.triggers
WHERE parent_class = 1
    AND name LIKE 'trg_%UpdateTimestamp';

PRINT '';
PRINT '============================================================';
PRINT 'Testing Triggers';
PRINT '============================================================';
PRINT '';

-- Test trigger on Customers table
DECLARE @TestCustomerId NVARCHAR(64) = NEWID();
DECLARE @OldTimestamp DATETIME2(7);
DECLARE @NewTimestamp DATETIME2(7);

BEGIN TRY
    -- Insert test record
    INSERT INTO dbo.Customers (Id, Name, Status)
    VALUES (@TestCustomerId, N'Test Customer for Trigger', N'active');
    
    SELECT @OldTimestamp = UpdatedAt FROM dbo.Customers WHERE Id = @TestCustomerId;
    
    -- Wait a moment to ensure timestamp difference
    WAITFOR DELAY '00:00:01';
    
    -- Update record (should trigger timestamp update)
    UPDATE dbo.Customers
    SET Name = N'Updated Test Customer'
    WHERE Id = @TestCustomerId;
    
    SELECT @NewTimestamp = UpdatedAt FROM dbo.Customers WHERE Id = @TestCustomerId;
    
    -- Verify trigger worked
    IF @NewTimestamp > @OldTimestamp
    BEGIN
        PRINT 'SUCCESS: Trigger test passed. UpdatedAt was automatically updated.';
        PRINT 'Old Timestamp: ' + CONVERT(NVARCHAR, @OldTimestamp, 121);
        PRINT 'New Timestamp: ' + CONVERT(NVARCHAR, @NewTimestamp, 121);
    END
    ELSE
    BEGIN
        PRINT 'WARNING: Trigger may not be working correctly.';
    END
    
    -- Clean up test data
    DELETE FROM dbo.Customers WHERE Id = @TestCustomerId;
    PRINT 'Test data cleaned up.';
    
END TRY
BEGIN CATCH
    PRINT 'ERROR during trigger testing:';
    PRINT ERROR_MESSAGE();
    
    -- Attempt cleanup
    IF EXISTS (SELECT 1 FROM dbo.Customers WHERE Id = @TestCustomerId)
        DELETE FROM dbo.Customers WHERE Id = @TestCustomerId;
END CATCH

PRINT '';
PRINT '============================================================';
PRINT 'All Triggers Installed and Tested Successfully';
PRINT '============================================================';
GO
