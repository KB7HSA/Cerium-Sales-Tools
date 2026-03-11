-- =====================================================
-- Add File Type Support to Document Conversion Types
-- Date: 2026-03-02
-- Description: Adds AcceptedFileTypes and ConversionMethod
--              columns to support DOCX and PDF uploads
--              with different conversion methods per type.
-- =====================================================

-- Add AcceptedFileTypes column (docx, pdf, or both)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'AcceptedFileTypes'
)
BEGIN
  ALTER TABLE dbo.DocumentConversionTypes
  ADD AcceptedFileTypes NVARCHAR(50) NOT NULL DEFAULT 'docx';
  PRINT 'Added AcceptedFileTypes column';
END
GO

-- Add ConversionMethod column (template-apply, pdf-to-docx, pdf-extract, etc.)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'ConversionMethod'
)
BEGIN
  ALTER TABLE dbo.DocumentConversionTypes
  ADD ConversionMethod NVARCHAR(50) NOT NULL DEFAULT 'template-apply';
  PRINT 'Added ConversionMethod column';
END
GO

-- Update existing seed data with defaults
UPDATE dbo.DocumentConversionTypes
SET AcceptedFileTypes = 'docx', ConversionMethod = 'template-apply'
WHERE AcceptedFileTypes IS NULL OR ConversionMethod IS NULL;
GO

PRINT 'File type support migration complete';
