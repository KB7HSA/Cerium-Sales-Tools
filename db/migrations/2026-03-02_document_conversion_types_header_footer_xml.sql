-- ================================================================
-- Add HeaderXml and FooterXml columns to DocumentConversionTypes
-- Note: Filename sorts after 2026-03-02_document_conversion_types_00_create.sql.
-- ================================================================

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'DocumentConversionTypes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'HeaderXml'
    )
    BEGIN
      ALTER TABLE dbo.DocumentConversionTypes ADD HeaderXml NVARCHAR(MAX) NULL;
      PRINT 'Added HeaderXml column to DocumentConversionTypes';
    END

    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'FooterXml'
    )
    BEGIN
      ALTER TABLE dbo.DocumentConversionTypes ADD FooterXml NVARCHAR(MAX) NULL;
      PRINT 'Added FooterXml column to DocumentConversionTypes';
    END
END
ELSE
BEGIN
    PRINT 'DocumentConversionTypes table not found — skipping header/footer XML migration.';
END
GO
