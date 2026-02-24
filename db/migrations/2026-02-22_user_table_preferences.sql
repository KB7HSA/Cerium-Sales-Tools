-- ================================================================
-- Migration: Add UserTablePreferences table
-- Date: 2026-02-22
-- Purpose: Store per-user table layout preferences (column widths, etc.)
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserTablePreferences')
BEGIN
    CREATE TABLE dbo.UserTablePreferences (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        UserEmail NVARCHAR(255) NOT NULL,
        TableName NVARCHAR(100) NOT NULL,
        Preferences NVARCHAR(MAX) NOT NULL, -- JSON: { columnWidths: { col: px, ... } }
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_UserTablePreferences PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_UserTablePreferences_UserTable UNIQUE (UserEmail, TableName)
    );

    CREATE NONCLUSTERED INDEX IX_UserTablePreferences_UserEmail ON dbo.UserTablePreferences(UserEmail);
    PRINT 'Created UserTablePreferences table';
END
ELSE
BEGIN
    PRINT 'UserTablePreferences table already exists';
END
GO
