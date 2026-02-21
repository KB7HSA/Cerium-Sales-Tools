-- Add UserStatus column to ERateForm470 table
-- Migration: 2026-02-21_add_user_status.sql

-- Add UserStatus column for tracking user-defined statuses
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ERateForm470') AND name = 'UserStatus')
BEGIN
    ALTER TABLE dbo.ERateForm470 ADD UserStatus NVARCHAR(50) NULL;
    PRINT 'Added UserStatus column to ERateForm470';
END
GO

-- Create index for filtering by status
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ERateForm470_UserStatus')
BEGIN
    CREATE NONCLUSTERED INDEX IX_ERateForm470_UserStatus ON dbo.ERateForm470 (UserStatus);
    PRINT 'Created index IX_ERateForm470_UserStatus';
END
GO

-- Clean up duplicate records keeping only the most recent version
-- This keeps the record with the highest LastSeenAt date
;WITH DuplicateCTE AS (
    SELECT 
        Id,
        PrimaryKey,
        ROW_NUMBER() OVER (PARTITION BY PrimaryKey ORDER BY LastSeenAt DESC, Id) as RowNum
    FROM dbo.ERateForm470
)
DELETE FROM dbo.ERateForm470 
WHERE Id IN (SELECT Id FROM DuplicateCTE WHERE RowNum > 1);

PRINT 'Cleaned up duplicate records';
GO
