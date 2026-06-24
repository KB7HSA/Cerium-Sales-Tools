-- ============================================================================
-- Drop FK constraints on SolutionBlueprintItems and LaborSolutionItems
-- that reference dbo.LaborItems.Id
-- ============================================================================

USE CeriumSalesTools;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'SolutionBlueprintItems' AND schema_id = SCHEMA_ID('dbo'))
   AND EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_SolutionBlueprintItems_Items'
    AND parent_object_id = OBJECT_ID('dbo.SolutionBlueprintItems')
)
BEGIN
  ALTER TABLE dbo.SolutionBlueprintItems
    DROP CONSTRAINT FK_SolutionBlueprintItems_Items;
  PRINT 'Dropped FK_SolutionBlueprintItems_Items';
END
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'LaborSolutionItems' AND schema_id = SCHEMA_ID('dbo'))
   AND EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_LaborSolutionItems_Items'
    AND parent_object_id = OBJECT_ID('dbo.LaborSolutionItems')
)
BEGIN
  ALTER TABLE dbo.LaborSolutionItems
    DROP CONSTRAINT FK_LaborSolutionItems_Items;
  PRINT 'Dropped FK_LaborSolutionItems_Items';
END
GO
