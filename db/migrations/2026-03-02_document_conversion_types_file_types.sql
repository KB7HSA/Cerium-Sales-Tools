-- =====================================================
-- Add File Type Support to Document Conversion Types
-- Date: 2026-03-02
-- Note: Filename sorts after 2026-03-02_document_conversion_types_00_create.sql.
-- =====================================================

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'DocumentConversionTypes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'AcceptedFileTypes'
    )
    BEGIN
      ALTER TABLE dbo.DocumentConversionTypes
      ADD AcceptedFileTypes NVARCHAR(50) NOT NULL DEFAULT 'docx';
      PRINT 'Added AcceptedFileTypes column';
    END

    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'ConversionMethod'
    )
    BEGIN
      ALTER TABLE dbo.DocumentConversionTypes
      ADD ConversionMethod NVARCHAR(50) NOT NULL DEFAULT 'template-apply';
      PRINT 'Added ConversionMethod column';
    END

    UPDATE dbo.DocumentConversionTypes
    SET AcceptedFileTypes = 'docx', ConversionMethod = 'template-apply'
    WHERE AcceptedFileTypes IS NULL OR ConversionMethod IS NULL;

    PRINT 'File type support migration complete';
END
ELSE
BEGIN
    PRINT 'DocumentConversionTypes table not found — skipping file type support migration.';
END
GO
