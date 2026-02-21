/*
  Migration: Add TemplateFileName to AssessmentTypes
  Date: 2026-02-20
  Description: Adds template file name field to allow custom DOCX templates per assessment type
*/

USE CeriumSalesTools;
GO

-- Add TemplateFileName column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.AssessmentTypes') AND name = 'TemplateFileName')
BEGIN
    ALTER TABLE dbo.AssessmentTypes
    ADD TemplateFileName NVARCHAR(255) NULL DEFAULT 'Assessment-Template.docx';
    
    PRINT 'TemplateFileName column added to AssessmentTypes table.';
END
GO

-- Update existing assessment types with default template
UPDATE dbo.AssessmentTypes
SET TemplateFileName = 'Assessment-Template.docx'
WHERE TemplateFileName IS NULL;

PRINT 'Default template filename set for existing assessment types.';
GO