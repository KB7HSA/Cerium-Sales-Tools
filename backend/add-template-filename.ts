/**
 * Script to add TemplateFileName column to AssessmentTypes table
 * Run with: npx ts-node add-template-filename.ts
 */

import { executeQuery } from './src/config/database';

async function addTemplateFileName() {
  console.log('Adding TemplateFileName column to AssessmentTypes table...');
  
  try {
    // Check if column exists
    const checkQuery = `
      SELECT COUNT(*) as cnt 
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.AssessmentTypes') 
        AND name = 'TemplateFileName'
    `;
    
    const checkResult = await executeQuery<{ cnt: number }>(checkQuery, {});
    
    if (checkResult[0].cnt > 0) {
      console.log('TemplateFileName column already exists.');
    } else {
      // Add the column
      const addColumnQuery = `
        ALTER TABLE dbo.AssessmentTypes
        ADD TemplateFileName NVARCHAR(255) NULL
      `;
      
      await executeQuery(addColumnQuery, {});
      console.log('TemplateFileName column added successfully.');
    }
    
    // Update existing rows with default value
    const updateQuery = `
      UPDATE dbo.AssessmentTypes
      SET TemplateFileName = 'Assessment-Template.docx'
      WHERE TemplateFileName IS NULL
    `;
    
    await executeQuery(updateQuery, {});
    console.log('Default template filename set for existing assessment types.');
    
    // Verify
    const verifyQuery = `SELECT Id, Name, TemplateFileName FROM dbo.AssessmentTypes`;
    const results = await executeQuery<{ Id: string; Name: string; TemplateFileName: string }>(verifyQuery, {});
    
    console.log('\nCurrent Assessment Types:');
    results.forEach(r => {
      console.log(`  - ${r.Name}: ${r.TemplateFileName}`);
    });
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

addTemplateFileName();
