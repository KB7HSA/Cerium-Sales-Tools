-- E-Rate Settings Schema
-- Migration: 2026-02-21_erate_settings.sql

-- Create table for storing E-Rate configuration settings
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ERateSettings')
BEGIN
    CREATE TABLE dbo.ERateSettings (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        SettingKey NVARCHAR(100) NOT NULL,
        SettingValue NVARCHAR(MAX) NOT NULL,
        Description NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        INDEX IX_ERateSettings_SettingKey UNIQUE NONCLUSTERED (SettingKey)
    );
    
    PRINT 'Created table dbo.ERateSettings';
    
    -- Insert default settings
    INSERT INTO dbo.ERateSettings (SettingKey, SettingValue, Description)
    VALUES 
        ('SODA_API_URL', 'https://opendata.usac.org/resource/jt8s-3q52.json', 'USAC SODA API URL for Form 470 data'),
        ('TARGET_STATES', 'ID,WA,OR,MT,AK', 'Comma-separated list of target state codes'),
        ('FUNDING_YEAR', '2026', 'Target funding year for data retrieval');
    
    PRINT 'Inserted default E-Rate settings';
END
GO

-- Create table for custom user status codes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ERateStatusCodes')
BEGIN
    CREATE TABLE dbo.ERateStatusCodes (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        StatusCode NVARCHAR(50) NOT NULL,
        DisplayName NVARCHAR(100) NOT NULL,
        ColorClass NVARCHAR(100) NULL, -- CSS class for styling
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        INDEX IX_ERateStatusCodes_StatusCode UNIQUE NONCLUSTERED (StatusCode)
    );
    
    PRINT 'Created table dbo.ERateStatusCodes';
    
    -- Insert default status codes
    INSERT INTO dbo.ERateStatusCodes (StatusCode, DisplayName, ColorClass, SortOrder, IsActive)
    VALUES 
        ('In Process', 'In Process', 'yellow', 1, 1),
        ('Reviewing', 'Reviewing', 'purple', 2, 1),
        ('Responded', 'Responded', 'green', 3, 1),
        ('Bypassed', 'Bypassed', 'gray', 4, 1),
        ('Not Interested', 'Not Interested', 'red', 5, 1);
    
    PRINT 'Inserted default status codes';
END
GO
