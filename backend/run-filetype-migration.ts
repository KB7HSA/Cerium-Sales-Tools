import 'dotenv/config';
import { getConnectionPool } from './src/config/database';

async function run() {
  const pool = await getConnectionPool();

  // Add AcceptedFileTypes column
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'AcceptedFileTypes'
    )
    BEGIN
      ALTER TABLE dbo.DocumentConversionTypes
      ADD AcceptedFileTypes NVARCHAR(50) NOT NULL DEFAULT 'docx';
    END
  `);
  console.log('Added AcceptedFileTypes column');

  // Add ConversionMethod column
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'DocumentConversionTypes' AND COLUMN_NAME = 'ConversionMethod'
    )
    BEGIN
      ALTER TABLE dbo.DocumentConversionTypes
      ADD ConversionMethod NVARCHAR(50) NOT NULL DEFAULT 'template-apply';
    END
  `);
  console.log('Added ConversionMethod column');

  // Update existing records
  await pool.request().query(`
    UPDATE dbo.DocumentConversionTypes
    SET AcceptedFileTypes = 'docx', ConversionMethod = 'template-apply'
    WHERE AcceptedFileTypes IS NULL OR ConversionMethod IS NULL
  `);
  console.log('Updated existing records');

  // Verify
  const rows = await pool.request().query(
    'SELECT Id, Name, AcceptedFileTypes, ConversionMethod FROM dbo.DocumentConversionTypes'
  );
  console.log('Verification:', rows.recordset);

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
