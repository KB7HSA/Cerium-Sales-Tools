/*
  RBAC (Role-Based Access Control) Schema Extension
  
  This migration adds module-specific role assignments for users.
  Supports granular permissions per module (Labor Budget, MSP Services, SOW, E-Rate, Quotes)
  
  Date: February 21, 2026
*/

USE CeriumSalesTools;
GO

-- User Role Assignments per Module
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserRoleAssignments')
BEGIN
    CREATE TABLE dbo.UserRoleAssignments (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        UserId NVARCHAR(64) NOT NULL,
        ModuleName NVARCHAR(50) NOT NULL,
        Permissions NVARCHAR(255) NOT NULL, -- Comma-separated: view,create,edit,delete,admin
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_UserRoleAssignments PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_UserRoleAssignments_AdminUsers FOREIGN KEY (UserId)
            REFERENCES dbo.AdminUsers(Id) ON DELETE CASCADE,
        CONSTRAINT CK_UserRoleAssignments_Module CHECK (
            ModuleName IN ('labor-budget', 'msp-services', 'sow-documents', 'e-rate', 'quote-management')
        ),
        -- Ensure one assignment per user per module
        CONSTRAINT UQ_UserRoleAssignments_UserModule UNIQUE (UserId, ModuleName)
    );

    CREATE NONCLUSTERED INDEX IX_UserRoleAssignments_UserId ON dbo.UserRoleAssignments(UserId);
    CREATE NONCLUSTERED INDEX IX_UserRoleAssignments_Module ON dbo.UserRoleAssignments(ModuleName);
    
    PRINT 'Created table: UserRoleAssignments';
END
GO

-- Add default role assignments for existing admin users
-- Admins get admin permission for all modules
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'AdminUsers')
AND EXISTS (SELECT * FROM sys.tables WHERE name = 'UserRoleAssignments')
BEGIN
    INSERT INTO dbo.UserRoleAssignments (UserId, ModuleName, Permissions)
    SELECT 
        au.Id,
        module.ModuleName,
        CASE 
            WHEN au.RoleName = 'admin' THEN 'view,create,edit,delete,admin'
            WHEN au.RoleName = 'manager' THEN 'view,create,edit,admin'
            ELSE 'view,create,edit'
        END as Permissions
    FROM dbo.AdminUsers au
    CROSS JOIN (
        SELECT 'labor-budget' as ModuleName
        UNION SELECT 'msp-services'
        UNION SELECT 'sow-documents'
        UNION SELECT 'e-rate'
        UNION SELECT 'quote-management'
    ) module
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.UserRoleAssignments ura 
        WHERE ura.UserId = au.Id AND ura.ModuleName = module.ModuleName
    );
    
    PRINT 'Added default role assignments for existing users';
END
GO

-- Trigger to auto-assign default permissions for new users
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_AdminUsers_DefaultRoles')
    DROP TRIGGER dbo.trg_AdminUsers_DefaultRoles;
GO

CREATE TRIGGER dbo.trg_AdminUsers_DefaultRoles
ON dbo.AdminUsers
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Assign default permissions based on role
    INSERT INTO dbo.UserRoleAssignments (UserId, ModuleName, Permissions)
    SELECT 
        i.Id,
        module.ModuleName,
        CASE 
            WHEN i.RoleName = 'admin' THEN 'view,create,edit,delete,admin'
            WHEN i.RoleName = 'manager' THEN 'view,create,edit,admin'
            ELSE 'view,create,edit'
        END as Permissions
    FROM inserted i
    CROSS JOIN (
        SELECT 'labor-budget' as ModuleName
        UNION SELECT 'msp-services'
        UNION SELECT 'sow-documents'
        UNION SELECT 'e-rate'
        UNION SELECT 'quote-management'
    ) module;
END
GO

PRINT 'Created trigger: trg_AdminUsers_DefaultRoles';
GO

-- Update trigger for UserRoleAssignments
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_UserRoleAssignments_UpdateTimestamp')
    DROP TRIGGER dbo.trg_UserRoleAssignments_UpdateTimestamp;
GO

CREATE TRIGGER dbo.trg_UserRoleAssignments_UpdateTimestamp
ON dbo.UserRoleAssignments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.UserRoleAssignments
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.UserRoleAssignments ura
    INNER JOIN inserted i ON ura.Id = i.Id;
END
GO

PRINT 'Created trigger: trg_UserRoleAssignments_UpdateTimestamp';
GO

PRINT '✅ RBAC Schema Migration Completed Successfully';
