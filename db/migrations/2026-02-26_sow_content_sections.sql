-- =====================================================
-- Migration: Add ContentSections to SOWTypes
-- Date: 2026-02-26
-- Description: Adds a JSON column to SOWTypes for 
--   customizable content sections (text or image).
--   Each SOW type can define named sections that users
--   can include/exclude when generating SOWs.
-- =====================================================

-- Add ContentSections column (stores JSON array)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.SOWTypes') 
    AND name = 'ContentSections'
)
BEGIN
    ALTER TABLE dbo.SOWTypes
    ADD ContentSections NVARCHAR(MAX) NULL;
    
    PRINT 'Added ContentSections column to SOWTypes table.';
END
GO

/*
ContentSections JSON format:
[
  {
    "id": "unique-id",
    "name": "Section Name",
    "type": "text",           -- "text" or "image"
    "content": "Section content text or base64 image data",
    "imageFileName": null,    -- original filename for image type
    "templateTag": "myTag",   -- DOCX placeholder name e.g. {myTag}
    "sortOrder": 0,
    "enabledByDefault": true  -- whether checked by default in generator
  }
]
*/

PRINT 'SOW Content Sections migration complete.';
GO
