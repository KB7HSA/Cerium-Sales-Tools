import 'dotenv/config';
import { getConnectionPool } from './src/config/database';

async function run() {
  const pool = await getConnectionPool();
  const check = await pool.request().query(
    `SELECT COUNT(*) as cnt FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DocumentConversionTypes') AND name = 'UseAdobeApi'`
  );
  if (check.recordset[0].cnt === 0) {
    await pool.request().query(
      `ALTER TABLE dbo.DocumentConversionTypes ADD UseAdobeApi BIT NOT NULL DEFAULT 0`
    );
    console.log('Added UseAdobeApi column');
  } else {
    console.log('UseAdobeApi column already exists');
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
