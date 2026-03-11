-- Migration: Add UseAdobeApi column to DocumentConversionTypes
-- Date: 2026-03-02
-- Description: Allows per-type toggle between Adobe PDF Services API and local conversion

-- Add UseAdobeApi column (defaults to 0 = local conversion)
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.DocumentConversionTypes') AND name = 'UseAdobeApi'
)
BEGIN
  ALTER TABLE dbo.DocumentConversionTypes
  ADD UseAdobeApi BIT NOT NULL DEFAULT 0;
  PRINT 'Added UseAdobeApi column to DocumentConversionTypes';
END
ELSE
BEGIN
  PRINT 'UseAdobeApi column already exists';
END
GO
