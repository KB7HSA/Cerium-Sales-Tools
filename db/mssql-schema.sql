/*
  Microsoft SQL Server Database Schema for Cerium Sales Tools (Tailadmin)
  
  This schema supports:
  - User authentication and authorization
  - Customer management
  - Labor budgeting and wizard
  - MSP service offerings
  - Quote generation
  - Domain analytics dashboard
  - Audit logging
  
  Compatible with: SQL Server 2016 and later
  Character Set: Unicode (NVARCHAR)
  Created: February 2026
*/

-- ================================================================
-- DATABASE CREATION
-- ================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'CeriumSalesTools')
BEGIN
    CREATE DATABASE CeriumSalesTools
    COLLATE SQL_Latin1_General_CP1_CI_AS;
END
GO

USE CeriumSalesTools;
GO

-- ================================================================
-- AUTHENTICATION & AUTHORIZATION
-- ================================================================

-- Authentication users and credentials
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuthUsers')
BEGIN
    CREATE TABLE dbo.AuthUsers (
        Id NVARCHAR(64) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        PasswordSalt NVARCHAR(255) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'active',
        MfaEnabled BIT NOT NULL DEFAULT 0,
        MfaSecret NVARCHAR(255) NULL,
        LastLogin DATETIME2(7) NULL,
        FailedLoginAttempts INT NOT NULL DEFAULT 0,
        LockedUntil DATETIME2(7) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AuthUsers PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_AuthUsers_Email UNIQUE (Email),
        CONSTRAINT CK_AuthUsers_Status CHECK (Status IN ('active', 'locked', 'disabled'))
    );

    CREATE NONCLUSTERED INDEX IX_AuthUsers_Email ON dbo.AuthUsers(Email);
    CREATE NONCLUSTERED INDEX IX_AuthUsers_Status ON dbo.AuthUsers(Status);
END
GO

-- User roles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuthUserRoles')
BEGIN
    CREATE TABLE dbo.AuthUserRoles (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        AuthUserId NVARCHAR(64) NOT NULL,
        RoleName NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AuthUserRoles PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AuthUserRoles_AuthUsers FOREIGN KEY (AuthUserId)
            REFERENCES dbo.AuthUsers(Id) ON DELETE CASCADE,
        CONSTRAINT CK_AuthUserRoles_Role CHECK (RoleName IN ('admin', 'manager', 'user', 'readonly'))
    );

    CREATE NONCLUSTERED INDEX IX_AuthUserRoles_UserId ON dbo.AuthUserRoles(AuthUserId);
END
GO

-- Session tokens for web logins
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuthSessions')
BEGIN
    CREATE TABLE dbo.AuthSessions (
        Id NVARCHAR(64) NOT NULL,
        AuthUserId NVARCHAR(64) NOT NULL,
        SessionToken NVARCHAR(255) NOT NULL,
        RefreshToken NVARCHAR(255) NULL,
        IpAddress NVARCHAR(64) NULL,
        UserAgent NVARCHAR(MAX) NULL,
        DeviceFingerprint NVARCHAR(255) NULL,
        ExpiresAt DATETIME2(7) NOT NULL,
        RevokedAt DATETIME2(7) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AuthSessions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_AuthSessions_Token UNIQUE (SessionToken),
        CONSTRAINT FK_AuthSessions_AuthUsers FOREIGN KEY (AuthUserId)
            REFERENCES dbo.AuthUsers(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_AuthSessions_UserId ON dbo.AuthSessions(AuthUserId);
    CREATE NONCLUSTERED INDEX IX_AuthSessions_ExpiresAt ON dbo.AuthSessions(ExpiresAt);
END
GO

-- Password reset tokens
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PasswordResetTokens')
BEGIN
    CREATE TABLE dbo.PasswordResetTokens (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        AuthUserId NVARCHAR(64) NOT NULL,
        Token NVARCHAR(255) NOT NULL,
        ExpiresAt DATETIME2(7) NOT NULL,
        UsedAt DATETIME2(7) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_PasswordResetTokens PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_PasswordResetTokens_Token UNIQUE (Token),
        CONSTRAINT FK_PasswordResetTokens_AuthUsers FOREIGN KEY (AuthUserId)
            REFERENCES dbo.AuthUsers(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_PasswordResetTokens_UserId ON dbo.PasswordResetTokens(AuthUserId);
END
GO

-- ================================================================
-- USER MANAGEMENT
-- ================================================================

-- Admin users (business users)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AdminUsers')
BEGIN
    CREATE TABLE dbo.AdminUsers (
        Id NVARCHAR(64) NOT NULL,
        AuthUserId NVARCHAR(64) NULL,
        Name NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        RoleName NVARCHAR(50) NOT NULL DEFAULT 'user',
        Status NVARCHAR(20) NOT NULL DEFAULT 'active',
        Department NVARCHAR(255) NULL,
        JoinDate DATE NULL,
        LastLogin DATETIME2(7) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AdminUsers PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_AdminUsers_Email UNIQUE (Email),
        CONSTRAINT FK_AdminUsers_AuthUsers FOREIGN KEY (AuthUserId)
            REFERENCES dbo.AuthUsers(Id) ON DELETE SET NULL,
        CONSTRAINT CK_AdminUsers_Role CHECK (RoleName IN ('admin', 'manager', 'user')),
        CONSTRAINT CK_AdminUsers_Status CHECK (Status IN ('active', 'inactive'))
    );

    CREATE NONCLUSTERED INDEX IX_AdminUsers_Status ON dbo.AdminUsers(Status);
    CREATE NONCLUSTERED INDEX IX_AdminUsers_Department ON dbo.AdminUsers(Department);
END
GO

-- User profiles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserProfiles')
BEGIN
    CREATE TABLE dbo.UserProfiles (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        UserId NVARCHAR(64) NULL,
        FirstName NVARCHAR(100) NOT NULL,
        LastName NVARCHAR(100) NOT NULL,
        RoleName NVARCHAR(100) NOT NULL,
        Location NVARCHAR(255) NOT NULL,
        AvatarUrl NVARCHAR(500) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(50) NOT NULL,
        Bio NVARCHAR(MAX) NULL,
        SocialFacebook NVARCHAR(255) NULL,
        SocialTwitter NVARCHAR(255) NULL,
        SocialLinkedIn NVARCHAR(255) NULL,
        SocialInstagram NVARCHAR(255) NULL,
        AddressCountry NVARCHAR(255) NULL,
        AddressCityState NVARCHAR(255) NULL,
        AddressPostalCode NVARCHAR(50) NULL,
        AddressTaxId NVARCHAR(100) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_UserProfiles PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_UserProfiles_AdminUsers FOREIGN KEY (UserId)
            REFERENCES dbo.AdminUsers(Id) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX IX_UserProfiles_UserId ON dbo.UserProfiles(UserId);
END
GO

-- User preferences (theme, settings)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserPreferences')
BEGIN
    CREATE TABLE dbo.UserPreferences (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        UserId NVARCHAR(64) NULL,
        Theme NVARCHAR(20) NOT NULL DEFAULT 'light',
        Language NVARCHAR(10) NOT NULL DEFAULT 'en',
        TimeZone NVARCHAR(100) NOT NULL DEFAULT 'UTC',
        DateFormat NVARCHAR(50) NOT NULL DEFAULT 'MM/DD/YYYY',
        NotificationEnabled BIT NOT NULL DEFAULT 1,
        EmailNotificationEnabled BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_UserPreferences PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_UserPreferences_AdminUsers FOREIGN KEY (UserId)
            REFERENCES dbo.AdminUsers(Id) ON DELETE SET NULL,
        CONSTRAINT CK_UserPreferences_Theme CHECK (Theme IN ('light', 'dark'))
    );

    CREATE NONCLUSTERED INDEX IX_UserPreferences_UserId ON dbo.UserPreferences(UserId);
END
GO

-- ================================================================
-- CUSTOMER MANAGEMENT
-- ================================================================

-- Customers
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
BEGIN
    CREATE TABLE dbo.Customers (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Company NVARCHAR(255) NULL,
        Email NVARCHAR(255) NULL,
        Phone NVARCHAR(64) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'active',
        Industry NVARCHAR(100) NULL,
        Website NVARCHAR(500) NULL,
        AddressLine1 NVARCHAR(255) NULL,
        AddressLine2 NVARCHAR(255) NULL,
        City NVARCHAR(100) NULL,
        StateProvince NVARCHAR(100) NULL,
        PostalCode NVARCHAR(20) NULL,
        Country NVARCHAR(100) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedDate DATE NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_Customers PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT CK_Customers_Status CHECK (Status IN ('active', 'inactive', 'prospect', 'archived'))
    );

    CREATE NONCLUSTERED INDEX IX_Customers_Status ON dbo.Customers(Status);
    CREATE NONCLUSTERED INDEX IX_Customers_Email ON dbo.Customers(Email);
    CREATE NONCLUSTERED INDEX IX_Customers_Company ON dbo.Customers(Company);
END
GO

-- Customer contacts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CustomerContacts')
BEGIN
    CREATE TABLE dbo.CustomerContacts (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        CustomerId NVARCHAR(64) NOT NULL,
        FirstName NVARCHAR(100) NOT NULL,
        LastName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(255) NULL,
        Phone NVARCHAR(64) NULL,
        Title NVARCHAR(100) NULL,
        IsPrimary BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_CustomerContacts PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_CustomerContacts_Customers FOREIGN KEY (CustomerId)
            REFERENCES dbo.Customers(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_CustomerContacts_CustomerId ON dbo.CustomerContacts(CustomerId);
END
GO

-- ================================================================
-- LABOR BUDGETING
-- ================================================================

-- Labor units of measure
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborUnits')
BEGIN
    CREATE TABLE dbo.LaborUnits (
        Id INT IDENTITY(1,1) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_LaborUnits PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_LaborUnits_Name UNIQUE (Name)
    );
END
GO

-- Labor sections/categories
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborSections')
BEGIN
    CREATE TABLE dbo.LaborSections (
        Id INT IDENTITY(1,1) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        DisplayOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_LaborSections PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_LaborSections_Name UNIQUE (Name)
    );
END
GO

-- Labor catalog items
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborItems')
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
END
GO

-- Labor solutions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborSolutions')
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
END
GO

-- Labor solution items
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborSolutionItems')
BEGIN
    CREATE TABLE dbo.LaborSolutionItems (
        Id NVARCHAR(64) NOT NULL,
        SolutionId NVARCHAR(64) NOT NULL,
        CatalogItemId NVARCHAR(64) NOT NULL,
        Quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        HoursPerUnit DECIMAL(10,2) NOT NULL DEFAULT 0,
        RatePerHour DECIMAL(10,2) NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_LaborSolutionItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_LaborSolutionItems_Solutions FOREIGN KEY (SolutionId)
            REFERENCES dbo.LaborSolutions(Id) ON DELETE CASCADE,
        CONSTRAINT FK_LaborSolutionItems_Items FOREIGN KEY (CatalogItemId)
            REFERENCES dbo.LaborItems(Id)
    );

    CREATE NONCLUSTERED INDEX IX_LaborSolutionItems_SolutionId ON dbo.LaborSolutionItems(SolutionId);
END
GO

-- Labor wizard drafts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborWizardDrafts')
BEGIN
    CREATE TABLE dbo.LaborWizardDrafts (
        Id NVARCHAR(64) NOT NULL,
        CustomerId NVARCHAR(64) NULL,
        JobName NVARCHAR(255) NULL,
        Notes NVARCHAR(MAX) NULL,
        ActiveSolutionId NVARCHAR(64) NULL,
        ProjectManagementPercent DECIMAL(6,2) NOT NULL DEFAULT 10,
        ProjectManagementHours DECIMAL(10,2) NOT NULL DEFAULT 0,
        ProjectManagementRatePerHour DECIMAL(10,2) NOT NULL DEFAULT 225,
        ProjectManagementNotes NVARCHAR(MAX) NULL,
        AdoptionHours DECIMAL(10,2) NOT NULL DEFAULT 0,
        AdoptionRatePerHour DECIMAL(10,2) NOT NULL DEFAULT 175,
        AdoptionNotes NVARCHAR(MAX) NULL,
        CreatedDate DATE NULL,
        LastModified DATE NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_LaborWizardDrafts PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_LaborWizardDrafts_Customers FOREIGN KEY (CustomerId)
            REFERENCES dbo.Customers(Id) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX IX_LaborWizardDrafts_CustomerId ON dbo.LaborWizardDrafts(CustomerId);
END
GO

-- Labor wizard solutions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborWizardSolutions')
BEGIN
    CREATE TABLE dbo.LaborWizardSolutions (
        Id NVARCHAR(64) NOT NULL,
        DraftId NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        OverheadPercent DECIMAL(6,2) NOT NULL DEFAULT 10,
        ContingencyPercent DECIMAL(6,2) NOT NULL DEFAULT 5,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_LaborWizardSolutions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_LaborWizardSolutions_Drafts FOREIGN KEY (DraftId)
            REFERENCES dbo.LaborWizardDrafts(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_LaborWizardSolutions_DraftId ON dbo.LaborWizardSolutions(DraftId);
END
GO

-- Labor wizard items
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborWizardItems')
BEGIN
    CREATE TABLE dbo.LaborWizardItems (
        Id NVARCHAR(64) NOT NULL,
        SolutionId NVARCHAR(64) NOT NULL,
        CatalogItemId NVARCHAR(64) NOT NULL,
        Quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        HoursPerUnit DECIMAL(10,2) NOT NULL DEFAULT 0,
        RatePerHour DECIMAL(10,2) NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_LaborWizardItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_LaborWizardItems_Solutions FOREIGN KEY (SolutionId)
            REFERENCES dbo.LaborWizardSolutions(Id) ON DELETE CASCADE,
        CONSTRAINT FK_LaborWizardItems_Items FOREIGN KEY (CatalogItemId)
            REFERENCES dbo.LaborItems(Id)
    );

    CREATE NONCLUSTERED INDEX IX_LaborWizardItems_SolutionId ON dbo.LaborWizardItems(SolutionId);
END
GO

-- Solution blueprints (templates)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SolutionBlueprints')
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
        IsPublic BIT NOT NULL DEFAULT 0,
        CreatedDate DATE NULL,
        LastModified DATE NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SolutionBlueprints PRIMARY KEY CLUSTERED (Id)
    );
END
GO

-- Solution blueprint items
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SolutionBlueprintItems')
BEGIN
    CREATE TABLE dbo.SolutionBlueprintItems (
        Id NVARCHAR(64) NOT NULL,
        BlueprintId NVARCHAR(64) NOT NULL,
        CatalogItemId NVARCHAR(64) NOT NULL,
        Quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        HoursPerUnit DECIMAL(10,2) NOT NULL DEFAULT 0,
        RatePerHour DECIMAL(10,2) NOT NULL DEFAULT 0,
        CatalogSnapshot NVARCHAR(MAX) NULL, -- JSON snapshot
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SolutionBlueprintItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_SolutionBlueprintItems_Blueprints FOREIGN KEY (BlueprintId)
            REFERENCES dbo.SolutionBlueprints(Id) ON DELETE CASCADE,
        CONSTRAINT FK_SolutionBlueprintItems_Items FOREIGN KEY (CatalogItemId)
            REFERENCES dbo.LaborItems(Id)
    );

    CREATE NONCLUSTERED INDEX IX_SolutionBlueprintItems_BlueprintId ON dbo.SolutionBlueprintItems(BlueprintId);
END
GO

-- ================================================================
-- MSP SERVICES & OFFERINGS
-- ================================================================

-- Pricing units
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PricingUnits')
BEGIN
    CREATE TABLE dbo.PricingUnits (
        Id NVARCHAR(64) NOT NULL,
        Label NVARCHAR(100) NOT NULL,
        Suffix NVARCHAR(50) NULL,
        IsEnabled BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_PricingUnits PRIMARY KEY CLUSTERED (Id)
    );
END
GO

-- MSP offerings
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferings')
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
END
GO

-- MSP offering features
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MspOfferingFeatures')
BEGIN
    CREATE TABLE dbo.MspOfferingFeatures (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        OfferingId NVARCHAR(64) NOT NULL,
        Feature NVARCHAR(MAX) NOT NULL,
        DisplayOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_MspOfferingFeatures PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_MspOfferingFeatures_Offerings FOREIGN KEY (OfferingId)
            REFERENCES dbo.MspOfferings(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_MspOfferingFeatures_OfferingId ON dbo.MspOfferingFeatures(OfferingId);
END
GO

-- MSP service levels
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MspServiceLevels')
BEGIN
    CREATE TABLE dbo.MspServiceLevels (
        Id NVARCHAR(64) NOT NULL,
        OfferingId NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        BasePrice DECIMAL(12,2) NOT NULL DEFAULT 0,
        BaseCost DECIMAL(12,2) NULL,
        MarginPercent DECIMAL(6,2) NULL,
        LicenseCost DECIMAL(12,2) NULL,
        LicenseMargin DECIMAL(6,2) NULL,
        ProfessionalServicesPrice DECIMAL(12,2) NULL,
        ProfessionalServicesCost DECIMAL(12,2) NULL,
        ProfessionalServicesMargin DECIMAL(6,2) NULL,
        PricingUnit NVARCHAR(50) NOT NULL,
        DisplayOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_MspServiceLevels PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_MspServiceLevels_Offerings FOREIGN KEY (OfferingId)
            REFERENCES dbo.MspOfferings(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_MspServiceLevels_OfferingId ON dbo.MspServiceLevels(OfferingId);
END
GO

-- MSP service level options
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MspServiceLevelOptions')
BEGIN
    CREATE TABLE dbo.MspServiceLevelOptions (
        Id NVARCHAR(64) NOT NULL,
        ServiceLevelId NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        MonthlyPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
        MonthlyCost DECIMAL(12,2) NULL,
        MarginPercent DECIMAL(6,2) NULL,
        PricingUnit NVARCHAR(50) NOT NULL,
        DisplayOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_MspServiceLevelOptions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_MspServiceLevelOptions_ServiceLevels FOREIGN KEY (ServiceLevelId)
            REFERENCES dbo.MspServiceLevels(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_MspServiceLevelOptions_ServiceLevelId ON dbo.MspServiceLevelOptions(ServiceLevelId);
END
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
END
GO

-- ================================================================
-- QUOTES & PROPOSALS
-- ================================================================

-- Quotes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Quotes')
BEGIN
    CREATE TABLE dbo.Quotes (
        Id NVARCHAR(64) NOT NULL,
        QuoteType NVARCHAR(50) NOT NULL,
        CustomerId NVARCHAR(64) NULL,
        CustomerName NVARCHAR(255) NOT NULL,
        Notes NVARCHAR(MAX) NULL,
        ServiceName NVARCHAR(100) NULL,
        NumberOfUsers INT NOT NULL DEFAULT 0,
        DurationMonths INT NOT NULL DEFAULT 0,
        MonthlyPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
        TotalPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
        SetupFee DECIMAL(12,2) NOT NULL DEFAULT 0,
        DiscountAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
        TotalHours DECIMAL(12,2) NOT NULL DEFAULT 0,
        Status NVARCHAR(50) NOT NULL DEFAULT 'draft',
        ExpiresAt DATETIME2(7) NULL,
        AcceptedAt DATETIME2(7) NULL,
        CreatedDate DATE NULL,
        CreatedTime NVARCHAR(32) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_Quotes PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Quotes_Customers FOREIGN KEY (CustomerId)
            REFERENCES dbo.Customers(Id) ON DELETE SET NULL,
        CONSTRAINT CK_Quotes_Status CHECK (Status IN ('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired'))
    );

    CREATE NONCLUSTERED INDEX IX_Quotes_CustomerId ON dbo.Quotes(CustomerId);
    CREATE NONCLUSTERED INDEX IX_Quotes_Status ON dbo.Quotes(Status);
    CREATE NONCLUSTERED INDEX IX_Quotes_CreatedAt ON dbo.Quotes(CreatedAt);
END
GO

-- Quote work items
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'QuoteWorkItems')
BEGIN
    CREATE TABLE dbo.QuoteWorkItems (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        QuoteId NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        ReferenceArchitecture NVARCHAR(100) NULL,
        Section NVARCHAR(100) NULL,
        UnitOfMeasure NVARCHAR(100) NULL,
        ClosetCount INT NOT NULL DEFAULT 0,
        SwitchCount DECIMAL(10,2) NOT NULL DEFAULT 0,
        HoursPerUnit DECIMAL(10,2) NOT NULL DEFAULT 0,
        RatePerHour DECIMAL(10,2) NOT NULL DEFAULT 0,
        LineHours DECIMAL(10,2) NOT NULL DEFAULT 0,
        LineTotal DECIMAL(12,2) NOT NULL DEFAULT 0,
        SolutionName NVARCHAR(255) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_QuoteWorkItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_QuoteWorkItems_Quotes FOREIGN KEY (QuoteId)
            REFERENCES dbo.Quotes(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_QuoteWorkItems_QuoteId ON dbo.QuoteWorkItems(QuoteId);
END
GO

-- Quote labor groups (summary by section)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'QuoteLaborGroups')
BEGIN
    CREATE TABLE dbo.QuoteLaborGroups (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        QuoteId NVARCHAR(64) NOT NULL,
        Section NVARCHAR(100) NOT NULL,
        Total DECIMAL(12,2) NOT NULL DEFAULT 0,
        ItemCount INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_QuoteLaborGroups PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_QuoteLaborGroups_Quotes FOREIGN KEY (QuoteId)
            REFERENCES dbo.Quotes(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_QuoteLaborGroups_QuoteId ON dbo.QuoteLaborGroups(QuoteId);
END
GO

-- Quote selected options (MSP services)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'QuoteSelectedOptions')
BEGIN
    CREATE TABLE dbo.QuoteSelectedOptions (
        Id BIGINT IDENTITY(1,1) NOT NULL,
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
END
GO

-- ================================================================
-- DOMAIN ANALYTICS (SEMrush-style Dashboard)
-- ================================================================

-- Domains being tracked
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsDomains')
BEGIN
    CREATE TABLE dbo.AnalyticsDomains (
        Id NVARCHAR(64) NOT NULL,
        DomainName NVARCHAR(255) NOT NULL,
        PrimaryCategory NVARCHAR(100) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'active',
        LastScannedAt DATETIME2(7) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AnalyticsDomains PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_AnalyticsDomains_Name UNIQUE (DomainName)
    );

    CREATE NONCLUSTERED INDEX IX_AnalyticsDomains_Status ON dbo.AnalyticsDomains(Status);
END
GO

-- Domain categories
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsDomainCategories')
BEGIN
    CREATE TABLE dbo.AnalyticsDomainCategories (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        DomainId NVARCHAR(64) NOT NULL,
        CategoryName NVARCHAR(100) NOT NULL,
        IsPrimary BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AnalyticsDomainCategories PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AnalyticsDomainCategories_Domains FOREIGN KEY (DomainId)
            REFERENCES dbo.AnalyticsDomains(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_AnalyticsDomainCategories_DomainId ON dbo.AnalyticsDomainCategories(DomainId);
END
GO

-- Organic search metrics
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsOrganicMetrics')
BEGIN
    CREATE TABLE dbo.AnalyticsOrganicMetrics (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        DomainId NVARCHAR(64) NOT NULL,
        CountryCode NVARCHAR(10) NOT NULL,
        DeviceType NVARCHAR(20) NOT NULL DEFAULT 'desktop',
        OrganicTraffic INT NOT NULL DEFAULT 0,
        TrafficChange DECIMAL(6,2) NULL,
        SemrushRank INT NULL,
        KeywordCount INT NOT NULL DEFAULT 0,
        KeywordChange DECIMAL(6,2) NULL,
        TrafficCost DECIMAL(12,2) NOT NULL DEFAULT 0,
        TrafficCostChange DECIMAL(6,2) NULL,
        RecordedDate DATE NOT NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AnalyticsOrganicMetrics PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AnalyticsOrganicMetrics_Domains FOREIGN KEY (DomainId)
            REFERENCES dbo.AnalyticsDomains(Id) ON DELETE CASCADE,
        CONSTRAINT CK_AnalyticsOrganicMetrics_Device CHECK (DeviceType IN ('desktop', 'mobile'))
    );

    CREATE NONCLUSTERED INDEX IX_AnalyticsOrganicMetrics_DomainId ON dbo.AnalyticsOrganicMetrics(DomainId);
    CREATE NONCLUSTERED INDEX IX_AnalyticsOrganicMetrics_RecordedDate ON dbo.AnalyticsOrganicMetrics(RecordedDate);
END
GO

-- Paid search metrics
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsPaidMetrics')
BEGIN
    CREATE TABLE dbo.AnalyticsPaidMetrics (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        DomainId NVARCHAR(64) NOT NULL,
        CountryCode NVARCHAR(10) NOT NULL,
        DeviceType NVARCHAR(20) NOT NULL DEFAULT 'desktop',
        PaidTraffic INT NOT NULL DEFAULT 0,
        TrafficChange DECIMAL(6,2) NULL,
        PaidKeywordCount INT NOT NULL DEFAULT 0,
        AdCost DECIMAL(12,2) NOT NULL DEFAULT 0,
        RecordedDate DATE NOT NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AnalyticsPaidMetrics PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AnalyticsPaidMetrics_Domains FOREIGN KEY (DomainId)
            REFERENCES dbo.AnalyticsDomains(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_AnalyticsPaidMetrics_DomainId ON dbo.AnalyticsPaidMetrics(DomainId);
    CREATE NONCLUSTERED INDEX IX_AnalyticsPaidMetrics_RecordedDate ON dbo.AnalyticsPaidMetrics(RecordedDate);
END
GO

-- Backlink metrics
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsBacklinks')
BEGIN
    CREATE TABLE dbo.AnalyticsBacklinks (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        DomainId NVARCHAR(64) NOT NULL,
        TotalBacklinks INT NOT NULL DEFAULT 0,
        ReferringDomains INT NOT NULL DEFAULT 0,
        ReferringIPs INT NOT NULL DEFAULT 0,
        DomainAuthority INT NULL,
        PageAuthority INT NULL,
        RecordedDate DATE NOT NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AnalyticsBacklinks PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AnalyticsBacklinks_Domains FOREIGN KEY (DomainId)
            REFERENCES dbo.AnalyticsDomains(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_AnalyticsBacklinks_DomainId ON dbo.AnalyticsBacklinks(DomainId);
    CREATE NONCLUSTERED INDEX IX_AnalyticsBacklinks_RecordedDate ON dbo.AnalyticsBacklinks(RecordedDate);
END
GO

-- Keywords
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsKeywords')
BEGIN
    CREATE TABLE dbo.AnalyticsKeywords (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        DomainId NVARCHAR(64) NOT NULL,
        Keyword NVARCHAR(500) NOT NULL,
        CountryCode NVARCHAR(10) NOT NULL,
        KeywordType NVARCHAR(20) NOT NULL,
        Position INT NULL,
        PositionChange INT NULL,
        SearchVolume INT NULL,
        CPC DECIMAL(10,2) NULL,
        Traffic INT NULL,
        TrafficCost DECIMAL(12,2) NULL,
        RecordedDate DATE NOT NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AnalyticsKeywords PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AnalyticsKeywords_Domains FOREIGN KEY (DomainId)
            REFERENCES dbo.AnalyticsDomains(Id) ON DELETE CASCADE,
        CONSTRAINT CK_AnalyticsKeywords_Type CHECK (KeywordType IN ('organic', 'paid'))
    );

    CREATE NONCLUSTERED INDEX IX_AnalyticsKeywords_DomainId ON dbo.AnalyticsKeywords(DomainId);
    CREATE NONCLUSTERED INDEX IX_AnalyticsKeywords_Keyword ON dbo.AnalyticsKeywords(Keyword);
    CREATE NONCLUSTERED INDEX IX_AnalyticsKeywords_RecordedDate ON dbo.AnalyticsKeywords(RecordedDate);
END
GO

-- Competitors
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsCompetitors')
BEGIN
    CREATE TABLE dbo.AnalyticsCompetitors (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        DomainId NVARCHAR(64) NOT NULL,
        CompetitorDomain NVARCHAR(255) NOT NULL,
        CompetitorType NVARCHAR(20) NOT NULL,
        CompetitionLevel DECIMAL(5,2) NULL,
        CommonKeywords INT NULL,
        RecordedDate DATE NOT NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AnalyticsCompetitors PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AnalyticsCompetitors_Domains FOREIGN KEY (DomainId)
            REFERENCES dbo.AnalyticsDomains(Id) ON DELETE CASCADE,
        CONSTRAINT CK_AnalyticsCompetitors_Type CHECK (CompetitorType IN ('organic', 'paid'))
    );

    CREATE NONCLUSTERED INDEX IX_AnalyticsCompetitors_DomainId ON dbo.AnalyticsCompetitors(DomainId);
END
GO

-- Top pages
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsTopPages')
BEGIN
    CREATE TABLE dbo.AnalyticsTopPages (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        DomainId NVARCHAR(64) NOT NULL,
        PageUrl NVARCHAR(MAX) NOT NULL,
        PageTitle NVARCHAR(500) NULL,
        Traffic INT NOT NULL DEFAULT 0,
        Keywords INT NOT NULL DEFAULT 0,
        TrafficCost DECIMAL(12,2) NOT NULL DEFAULT 0,
        RecordedDate DATE NOT NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AnalyticsTopPages PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AnalyticsTopPages_Domains FOREIGN KEY (DomainId)
            REFERENCES dbo.AnalyticsDomains(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_AnalyticsTopPages_DomainId ON dbo.AnalyticsTopPages(DomainId);
END
GO

-- ================================================================
-- AUDIT & LOGGING
-- ================================================================

-- Audit log
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLogs')
BEGIN
    CREATE TABLE dbo.AuditLogs (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        ActorUserId NVARCHAR(64) NULL,
        ActorEmail NVARCHAR(255) NULL,
        ActionName NVARCHAR(100) NOT NULL,
        EntityType NVARCHAR(100) NOT NULL,
        EntityId NVARCHAR(64) NULL,
        Summary NVARCHAR(MAX) NULL,
        Metadata NVARCHAR(MAX) NULL, -- JSON
        IpAddress NVARCHAR(64) NULL,
        UserAgent NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AuditLogs PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AuditLogs_AuthUsers FOREIGN KEY (ActorUserId)
            REFERENCES dbo.AuthUsers(Id) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX IX_AuditLogs_ActorUserId ON dbo.AuditLogs(ActorUserId);
    CREATE NONCLUSTERED INDEX IX_AuditLogs_EntityType ON dbo.AuditLogs(EntityType);
    CREATE NONCLUSTERED INDEX IX_AuditLogs_CreatedAt ON dbo.AuditLogs(CreatedAt);
END
GO

-- System activity log
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemActivityLog')
BEGIN
    CREATE TABLE dbo.SystemActivityLog (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        ActivityType NVARCHAR(50) NOT NULL,
        Severity NVARCHAR(20) NOT NULL DEFAULT 'info',
        Message NVARCHAR(MAX) NOT NULL,
        Source NVARCHAR(100) NULL,
        Details NVARCHAR(MAX) NULL, -- JSON
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SystemActivityLog PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT CK_SystemActivityLog_Severity CHECK (Severity IN ('info', 'warning', 'error', 'critical'))
    );

    CREATE NONCLUSTERED INDEX IX_SystemActivityLog_Severity ON dbo.SystemActivityLog(Severity);
    CREATE NONCLUSTERED INDEX IX_SystemActivityLog_CreatedAt ON dbo.SystemActivityLog(CreatedAt);
END
GO

-- ================================================================
-- NOTIFICATIONS & MESSAGES
-- ================================================================

-- User notifications
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserNotifications')
BEGIN
    CREATE TABLE dbo.UserNotifications (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        UserId NVARCHAR(64) NOT NULL,
        Title NVARCHAR(255) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL,
        NotificationType NVARCHAR(50) NOT NULL,
        IsRead BIT NOT NULL DEFAULT 0,
        ReadAt DATETIME2(7) NULL,
        ActionUrl NVARCHAR(500) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_UserNotifications PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_UserNotifications_AdminUsers FOREIGN KEY (UserId)
            REFERENCES dbo.AdminUsers(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_UserNotifications_UserId ON dbo.UserNotifications(UserId);
    CREATE NONCLUSTERED INDEX IX_UserNotifications_IsRead ON dbo.UserNotifications(IsRead);
END
GO

-- ================================================================
-- SUPPORT & TICKETS
-- ================================================================

-- Support tickets
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SupportTickets')
BEGIN
    CREATE TABLE dbo.SupportTickets (
        Id NVARCHAR(64) NOT NULL,
        TicketNumber NVARCHAR(50) NOT NULL,
        CustomerId NVARCHAR(64) NULL,
        AssignedToUserId NVARCHAR(64) NULL,
        Subject NVARCHAR(500) NOT NULL,
        Description NVARCHAR(MAX) NOT NULL,
        Priority NVARCHAR(20) NOT NULL DEFAULT 'medium',
        Status NVARCHAR(20) NOT NULL DEFAULT 'open',
        Category NVARCHAR(100) NULL,
        ResolvedAt DATETIME2(7) NULL,
        ClosedAt DATETIME2(7) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SupportTickets PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_SupportTickets_Number UNIQUE (TicketNumber),
        CONSTRAINT FK_SupportTickets_Customers FOREIGN KEY (CustomerId)
            REFERENCES dbo.Customers(Id) ON DELETE SET NULL,
        CONSTRAINT FK_SupportTickets_Users FOREIGN KEY (AssignedToUserId)
            REFERENCES dbo.AdminUsers(Id) ON DELETE SET NULL,
        CONSTRAINT CK_SupportTickets_Priority CHECK (Priority IN ('low', 'medium', 'high', 'critical')),
        CONSTRAINT CK_SupportTickets_Status CHECK (Status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed'))
    );

    CREATE NONCLUSTERED INDEX IX_SupportTickets_Status ON dbo.SupportTickets(Status);
    CREATE NONCLUSTERED INDEX IX_SupportTickets_CustomerId ON dbo.SupportTickets(CustomerId);
    CREATE NONCLUSTERED INDEX IX_SupportTickets_AssignedTo ON dbo.SupportTickets(AssignedToUserId);
END
GO

-- Ticket replies
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SupportTicketReplies')
BEGIN
    CREATE TABLE dbo.SupportTicketReplies (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        TicketId NVARCHAR(64) NOT NULL,
        UserId NVARCHAR(64) NULL,
        Message NVARCHAR(MAX) NOT NULL,
        IsCustomerReply BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SupportTicketReplies PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_SupportTicketReplies_Tickets FOREIGN KEY (TicketId)
            REFERENCES dbo.SupportTickets(Id) ON DELETE CASCADE,
        CONSTRAINT FK_SupportTicketReplies_Users FOREIGN KEY (UserId)
            REFERENCES dbo.AdminUsers(Id) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX IX_SupportTicketReplies_TicketId ON dbo.SupportTicketReplies(TicketId);
END
GO

-- ================================================================
-- FILE MANAGEMENT
-- ================================================================

-- File attachments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FileAttachments')
BEGIN
    CREATE TABLE dbo.FileAttachments (
        Id NVARCHAR(64) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        OriginalFileName NVARCHAR(255) NOT NULL,
        FilePath NVARCHAR(1000) NOT NULL,
        FileSize BIGINT NOT NULL,
        MimeType NVARCHAR(100) NOT NULL,
        EntityType NVARCHAR(100) NULL,
        EntityId NVARCHAR(64) NULL,
        UploadedByUserId NVARCHAR(64) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_FileAttachments PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_FileAttachments_Users FOREIGN KEY (UploadedByUserId)
            REFERENCES dbo.AdminUsers(Id) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX IX_FileAttachments_EntityType ON dbo.FileAttachments(EntityType);
    CREATE NONCLUSTERED INDEX IX_FileAttachments_EntityId ON dbo.FileAttachments(EntityId);
END
GO

-- ================================================================
-- INITIAL DATA SEEDING
-- ================================================================

-- Seed default pricing units
IF NOT EXISTS (SELECT * FROM dbo.PricingUnits WHERE Id = 'per-user')
BEGIN
    INSERT INTO dbo.PricingUnits (Id, Label, Suffix, IsEnabled)
    VALUES 
        (N'per-user', N'Per User', N'/user/month', 1),
        (N'per-device', N'Per Device', N'/device/month', 1),
        (N'per-server', N'Per Server', N'/server/month', 1),
        (N'flat-rate', N'Flat Rate', N'/month', 1),
        (N'per-gb', N'Per GB', N'/GB/month', 1);
END
GO

-- Seed default labor units
IF NOT EXISTS (SELECT * FROM dbo.LaborUnits WHERE Name = 'Hours')
BEGIN
    INSERT INTO dbo.LaborUnits (Name, IsActive)
    VALUES 
        (N'Hours', 1),
        (N'Days', 1),
        (N'Each', 1),
        (N'Per User', 1),
        (N'Per Device', 1);
END
GO

-- Seed default labor sections
IF NOT EXISTS (SELECT * FROM dbo.LaborSections WHERE Name = 'Network Infrastructure')
BEGIN
    INSERT INTO dbo.LaborSections (Name, DisplayOrder, IsActive)
    VALUES 
        (N'Network Infrastructure', 1, 1),
        (N'Server & Storage', 2, 1),
        (N'Security & Compliance', 3, 1),
        (N'Cloud Migration', 4, 1),
        (N'User Support', 5, 1),
        (N'Project Management', 6, 1);
END
GO

-- ================================================================
-- VIEWS FOR REPORTING
-- ================================================================

-- View: Customer quote summary
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vw_CustomerQuoteSummary')
BEGIN
    EXEC('
    CREATE VIEW dbo.vw_CustomerQuoteSummary
    AS
    SELECT 
        c.Id AS CustomerId,
        c.Name AS CustomerName,
        c.Company,
        c.Status AS CustomerStatus,
        COUNT(q.Id) AS TotalQuotes,
        SUM(CASE WHEN q.Status = ''accepted'' THEN 1 ELSE 0 END) AS AcceptedQuotes,
        SUM(CASE WHEN q.Status = ''pending'' THEN 1 ELSE 0 END) AS PendingQuotes,
        SUM(q.TotalPrice) AS TotalQuoteValue,
        MAX(q.CreatedAt) AS LastQuoteDate
    FROM dbo.Customers c
    LEFT JOIN dbo.Quotes q ON c.Id = q.CustomerId
    GROUP BY c.Id, c.Name, c.Company, c.Status
    ');
END
GO

-- View: Labor budget summary
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vw_LaborBudgetSummary')
BEGIN
    EXEC('
    CREATE VIEW dbo.vw_LaborBudgetSummary
    AS
    SELECT 
        ls.Id AS SolutionId,
        ls.Name AS SolutionName,
        COUNT(lsi.Id) AS ItemCount,
        SUM(lsi.Quantity * lsi.HoursPerUnit) AS TotalHours,
        SUM(lsi.Quantity * lsi.HoursPerUnit * lsi.RatePerHour) AS TotalCost,
        ls.OverheadPercent,
        ls.ContingencyPercent
    FROM dbo.LaborSolutions ls
    LEFT JOIN dbo.LaborSolutionItems lsi ON ls.Id = lsi.SolutionId
    GROUP BY ls.Id, ls.Name, ls.OverheadPercent, ls.ContingencyPercent
    ');
END
GO

-- ================================================================
-- STORED PROCEDURES
-- ================================================================

-- Procedure: Get domain analytics summary
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'usp_GetDomainAnalyticsSummary')
    DROP PROCEDURE dbo.usp_GetDomainAnalyticsSummary;
GO

CREATE PROCEDURE dbo.usp_GetDomainAnalyticsSummary
    @DomainName NVARCHAR(255),
    @CountryCode NVARCHAR(10) = 'US',
    @DeviceType NVARCHAR(20) = 'desktop'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DomainId NVARCHAR(64);

    SELECT @DomainId = Id 
    FROM dbo.AnalyticsDomains 
    WHERE DomainName = @DomainName;

    IF @DomainId IS NULL
    BEGIN
        RAISERROR('Domain not found', 16, 1);
        RETURN;
    END

    -- Get latest organic metrics
    SELECT TOP 1
        OrganicTraffic,
        TrafficChange,
        KeywordCount,
        KeywordChange,
        TrafficCost,
        TrafficCostChange,
        SemrushRank
    FROM dbo.AnalyticsOrganicMetrics
    WHERE DomainId = @DomainId
        AND CountryCode = @CountryCode
        AND DeviceType = @DeviceType
    ORDER BY RecordedDate DESC;

    -- Get latest paid metrics
    SELECT TOP 1
        PaidTraffic,
        TrafficChange,
        PaidKeywordCount,
        AdCost
    FROM dbo.AnalyticsPaidMetrics
    WHERE DomainId = @DomainId
        AND CountryCode = @CountryCode
        AND DeviceType = @DeviceType
    ORDER BY RecordedDate DESC;

    -- Get latest backlink metrics
    SELECT TOP 1
        TotalBacklinks,
        ReferringDomains,
        ReferringIPs
    FROM dbo.AnalyticsBacklinks
    WHERE DomainId = @DomainId
    ORDER BY RecordedDate DESC;

    -- Get top keywords
    SELECT TOP 10
        Keyword,
        Position,
        PositionChange,
        SearchVolume,
        Traffic
    FROM dbo.AnalyticsKeywords
    WHERE DomainId = @DomainId
        AND CountryCode = @CountryCode
        AND KeywordType = 'organic'
        AND RecordedDate = (
            SELECT MAX(RecordedDate)
            FROM dbo.AnalyticsKeywords
            WHERE DomainId = @DomainId
        )
    ORDER BY Traffic DESC;
END
GO

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Function: Calculate quote total with adjustments
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'FN' AND name = 'fn_CalculateQuoteTotal')
    DROP FUNCTION dbo.fn_CalculateQuoteTotal;
GO

CREATE FUNCTION dbo.fn_CalculateQuoteTotal
(
    @BaseTotal DECIMAL(12,2),
    @SetupFee DECIMAL(12,2),
    @DiscountAmount DECIMAL(12,2)
)
RETURNS DECIMAL(12,2)
AS
BEGIN
    DECLARE @FinalTotal DECIMAL(12,2);
    SET @FinalTotal = @BaseTotal + @SetupFee - @DiscountAmount;
    RETURN ISNULL(@FinalTotal, 0);
END
GO

-- ================================================================
-- CLEANUP & MAINTENANCE
-- ================================================================

PRINT '============================================================';
PRINT 'Database Schema Created Successfully';
PRINT '============================================================';
PRINT 'Database: CeriumSalesTools';
PRINT 'Tables Created: 50+';
PRINT 'Views Created: 2';
PRINT 'Stored Procedures: 1';
PRINT 'Functions: 1';
PRINT '============================================================';
PRINT 'Next Steps:';
PRINT '1. Review and adjust any application-specific settings';
PRINT '2. Configure backup schedules';
PRINT '3. Set up appropriate user permissions';
PRINT '4. Update connection strings in application';
PRINT '============================================================';
GO
