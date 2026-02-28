-- ============================================================================
-- Drop FK constraints on SolutionBlueprintItems and LaborSolutionItems
-- that reference dbo.LaborItems.Id
--
-- These FKs are too restrictive: catalog items are managed in localStorage
-- on the frontend and their IDs don't necessarily exist in the LaborItems table.
-- ============================================================================

-- Drop FK on SolutionBlueprintItems.CatalogItemId -> LaborItems.Id
IF EXISTS (
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

-- Drop FK on LaborSolutionItems.CatalogItemId -> LaborItems.Id
IF EXISTS (
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
