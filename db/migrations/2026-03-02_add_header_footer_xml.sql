-- ================================================================
-- Add HeaderXml and FooterXml columns to DocumentConversionTypes
-- These store raw OOXML for header/footer that get applied directly
-- to ConvertAPI raw DOCX output (bypassing template merge).
-- ================================================================

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'HeaderXml'
)
BEGIN
  ALTER TABLE dbo.DocumentConversionTypes ADD HeaderXml NVARCHAR(MAX) NULL;
  PRINT 'Added HeaderXml column to DocumentConversionTypes';
END
GO

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'FooterXml'
)
BEGIN
  ALTER TABLE dbo.DocumentConversionTypes ADD FooterXml NVARCHAR(MAX) NULL;
  PRINT 'Added FooterXml column to DocumentConversionTypes';
END
GO
