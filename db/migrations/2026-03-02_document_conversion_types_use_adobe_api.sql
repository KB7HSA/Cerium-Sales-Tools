-- Migration: Add UseAdobeApi column to DocumentConversionTypes
-- Date: 2026-03-02
-- Note: Filename sorts after 2026-03-02_document_conversion_types_00_create.sql.

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'DocumentConversionTypes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
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
END
ELSE
BEGIN
    PRINT 'DocumentConversionTypes table not found — skipping UseAdobeApi migration.';
END
GO
