-- =====================================================
-- Migration: Add ReferenceArchitecture to SolutionBlueprints
--            Add GroupName/SortOrder to LaborSolutionItems
-- Date: 2026-02-26
-- Description: 
--   1. Adds ReferenceArchitecture column to SolutionBlueprints
--      so blueprints can be tagged with a Cisco practice area.
--   2. Adds GroupName and SortOrder columns to LaborSolutionItems
--      to support grouping and ordering of items within solutions.
-- =====================================================

-- 1. ReferenceArchitecture on SolutionBlueprints
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.SolutionBlueprints') 
    AND name = 'ReferenceArchitecture'
)
BEGIN
    ALTER TABLE dbo.SolutionBlueprints
    ADD ReferenceArchitecture NVARCHAR(255) NULL;
    
    PRINT 'Added ReferenceArchitecture column to SolutionBlueprints table.';
END
GO

-- 2. GroupName on LaborSolutionItems
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.LaborSolutionItems') 
    AND name = 'GroupName'
)
BEGIN
    ALTER TABLE dbo.LaborSolutionItems
    ADD GroupName NVARCHAR(255) NULL DEFAULT 'Default';
    
    PRINT 'Added GroupName column to LaborSolutionItems table.';
END
GO

-- 3. SortOrder on LaborSolutionItems
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.LaborSolutionItems') 
    AND name = 'SortOrder'
)
BEGIN
    ALTER TABLE dbo.LaborSolutionItems
    ADD SortOrder INT NULL DEFAULT 0;
    
    PRINT 'Added SortOrder column to LaborSolutionItems table.';
END
GO

PRINT 'Labor budget persistence migration complete.';
GO
