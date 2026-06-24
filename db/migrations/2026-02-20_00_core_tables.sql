/*
  Core tables required by quote, customer, and RBAC migrations.
  Date: 2026-02-20
  Description: Ensures foundational tables exist if mssql-schema.sql did not fully apply.
*/

USE CeriumSalesTools;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers' AND schema_id = SCHEMA_ID('dbo'))
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
    PRINT 'Created Customers table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Quotes' AND schema_id = SCHEMA_ID('dbo'))
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
        CreatedBy NVARCHAR(255) NULL,
        CreatedByEmail NVARCHAR(255) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_Quotes PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT CK_Quotes_Status CHECK (Status IN ('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired'))
    );

    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers' AND schema_id = SCHEMA_ID('dbo'))
    BEGIN
        ALTER TABLE dbo.Quotes
        ADD CONSTRAINT FK_Quotes_Customers FOREIGN KEY (CustomerId)
            REFERENCES dbo.Customers(Id) ON DELETE SET NULL;
    END

    CREATE NONCLUSTERED INDEX IX_Quotes_CustomerId ON dbo.Quotes(CustomerId);
    CREATE NONCLUSTERED INDEX IX_Quotes_Status ON dbo.Quotes(Status);
    CREATE NONCLUSTERED INDEX IX_Quotes_CreatedAt ON dbo.Quotes(CreatedAt);
    PRINT 'Created Quotes table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AdminUsers' AND schema_id = SCHEMA_ID('dbo'))
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
        CONSTRAINT CK_AdminUsers_Role CHECK (RoleName IN ('admin', 'manager', 'user')),
        CONSTRAINT CK_AdminUsers_Status CHECK (Status IN ('active', 'inactive'))
    );

    CREATE NONCLUSTERED INDEX IX_AdminUsers_Status ON dbo.AdminUsers(Status);
    CREATE NONCLUSTERED INDEX IX_AdminUsers_Department ON dbo.AdminUsers(Department);
    PRINT 'Created AdminUsers table';
END
GO
