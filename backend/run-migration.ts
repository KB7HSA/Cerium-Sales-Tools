import { getConnectionPool } from './src/config/database';

async function runMigration() {
  console.log('Starting migration...');
  
  try {
    const pool = await getConnectionPool();
    
    // ================================================================
    // QUOTE TABLE COLUMNS
    // ================================================================
    const quoteColumnsToAdd = [
      { name: 'ServiceLevelName', type: 'NVARCHAR(255)', default: null },
      { name: 'PricingUnitLabel', type: 'NVARCHAR(100)', default: null },
      { name: 'BasePricePerUnit', type: 'DECIMAL(18,2)', default: null },
      { name: 'ProfessionalServicesPrice', type: 'DECIMAL(18,2)', default: null },
      { name: 'ProfessionalServicesTotal', type: 'DECIMAL(18,2)', default: null },
      { name: 'PerUnitTotal', type: 'DECIMAL(18,2)', default: null },
      { name: 'AddOnMonthlyTotal', type: 'DECIMAL(18,2)', default: null },
      { name: 'AddOnOneTimeTotal', type: 'DECIMAL(18,2)', default: null },
      { name: 'AddOnPerUnitTotal', type: 'DECIMAL(18,2)', default: null },
      { name: 'AnnualDiscountApplied', type: 'BIT', default: '0' },
    ];
    
    console.log('\n--- Checking Quote table columns ---');
    for (const col of quoteColumnsToAdd) {
      const checkResult = await pool.request().query(`
        SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Quotes' AND COLUMN_NAME = '${col.name}'
      `);
      
      if (checkResult.recordset[0].cnt === 0) {
        console.log(`Adding column ${col.name}...`);
        const defaultClause = col.default !== null ? `DEFAULT ${col.default}` : '';
        await pool.request().query(`
          ALTER TABLE Quotes ADD ${col.name} ${col.type} NULL ${defaultClause}
        `);
        console.log(`  Column ${col.name} added successfully`);
      } else {
        console.log(`  Column ${col.name} already exists, skipping`);
      }
    }

    // ================================================================
    // EXPORT SCHEMAS TABLE
    // ================================================================
    console.log('\n--- Creating ExportSchemas table ---');
    const exportSchemasExists = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'ExportSchemas'
    `);
    
    if (exportSchemasExists.recordset[0].cnt === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.ExportSchemas (
          Id NVARCHAR(64) NOT NULL,
          Name NVARCHAR(100) NOT NULL,
          QuoteType NVARCHAR(50) NOT NULL,
          Description NVARCHAR(500) NULL,
          IsDefault BIT NOT NULL DEFAULT 0,
          IsActive BIT NOT NULL DEFAULT 1,
          CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
          UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
          CONSTRAINT PK_ExportSchemas PRIMARY KEY CLUSTERED (Id)
        )
      `);
      await pool.request().query(`
        CREATE NONCLUSTERED INDEX IX_ExportSchemas_QuoteType ON dbo.ExportSchemas(QuoteType)
      `);
      console.log('  ExportSchemas table created');
    } else {
      console.log('  ExportSchemas table already exists');
    }

    // ================================================================
    // EXPORT SCHEMA COLUMNS TABLE
    // ================================================================
    console.log('\n--- Creating ExportSchemaColumns table ---');
    const exportColumnsExists = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'ExportSchemaColumns'
    `);
    
    if (exportColumnsExists.recordset[0].cnt === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.ExportSchemaColumns (
          Id NVARCHAR(64) NOT NULL,
          SchemaId NVARCHAR(64) NOT NULL,
          SourceField NVARCHAR(100) NOT NULL,
          ExportHeader NVARCHAR(100) NOT NULL,
          DisplayOrder INT NOT NULL DEFAULT 0,
          IsIncluded BIT NOT NULL DEFAULT 1,
          FormatType NVARCHAR(50) NULL,
          CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
          CONSTRAINT PK_ExportSchemaColumns PRIMARY KEY CLUSTERED (Id),
          CONSTRAINT FK_ExportSchemaColumns_Schema FOREIGN KEY (SchemaId)
            REFERENCES dbo.ExportSchemas(Id) ON DELETE CASCADE
        )
      `);
      await pool.request().query(`
        CREATE NONCLUSTERED INDEX IX_ExportSchemaColumns_SchemaId ON dbo.ExportSchemaColumns(SchemaId)
      `);
      console.log('  ExportSchemaColumns table created');
    } else {
      console.log('  ExportSchemaColumns table already exists');
    }

    // ================================================================
    // INSERT DEFAULT MSP EXPORT SCHEMA
    // ================================================================
    console.log('\n--- Checking default export schemas ---');
    const mspDefaultExists = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM dbo.ExportSchemas WHERE QuoteType = 'msp' AND IsDefault = 1
    `);
    
    if (mspDefaultExists.recordset[0].cnt === 0) {
      const mspSchemaId = 'export-msp-default';
      await pool.request().query(`
        INSERT INTO dbo.ExportSchemas (Id, Name, QuoteType, Description, IsDefault, IsActive)
        VALUES ('${mspSchemaId}', 'Default MSP Export', 'msp', 'Standard export format for MSP service quotes', 1, 1)
      `);
      
      const mspColumns = [
        { field: 'CustomerName', header: 'Customer Name', order: 1, format: 'text' },
        { field: 'ServiceName', header: 'Service', order: 2, format: 'text' },
        { field: 'ServiceLevelName', header: 'Service Level', order: 3, format: 'text' },
        { field: 'NumberOfUsers', header: 'Users', order: 4, format: 'number' },
        { field: 'DurationMonths', header: 'Contract Term (Months)', order: 5, format: 'number' },
        { field: 'BasePricePerUnit', header: 'Base Price/User', order: 6, format: 'currency' },
        { field: 'MonthlyPrice', header: 'Monthly Total', order: 7, format: 'currency' },
        { field: 'SetupFee', header: 'Setup Fee', order: 8, format: 'currency' },
        { field: 'TotalPrice', header: 'Total Contract Value', order: 9, format: 'currency' },
        { field: 'Status', header: 'Status', order: 10, format: 'text' },
        { field: 'CreatedDate', header: 'Quote Date', order: 11, format: 'date' },
      ];
      
      for (const col of mspColumns) {
        await pool.request().query(`
          INSERT INTO dbo.ExportSchemaColumns (Id, SchemaId, SourceField, ExportHeader, DisplayOrder, IsIncluded, FormatType)
          VALUES (NEWID(), '${mspSchemaId}', '${col.field}', '${col.header}', ${col.order}, 1, '${col.format}')
        `);
      }
      console.log('  Default MSP export schema created');
    } else {
      console.log('  Default MSP export schema already exists');
    }

    // ================================================================
    // INSERT DEFAULT LABOR EXPORT SCHEMA
    // ================================================================
    const laborDefaultExists = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM dbo.ExportSchemas WHERE QuoteType = 'labor' AND IsDefault = 1
    `);
    
    if (laborDefaultExists.recordset[0].cnt === 0) {
      const laborSchemaId = 'export-labor-default';
      await pool.request().query(`
        INSERT INTO dbo.ExportSchemas (Id, Name, QuoteType, Description, IsDefault, IsActive)
        VALUES ('${laborSchemaId}', 'Default Labor Export', 'labor', 'Standard export format for labor budget quotes', 1, 1)
      `);
      
      const laborColumns = [
        { field: 'CustomerName', header: 'Customer Name', order: 1, format: 'text' },
        { field: 'Notes', header: 'Project Description', order: 2, format: 'text' },
        { field: 'TotalHours', header: 'Total Hours', order: 3, format: 'number' },
        { field: 'TotalPrice', header: 'Total Labor Cost', order: 4, format: 'currency' },
        { field: 'Status', header: 'Status', order: 5, format: 'text' },
        { field: 'CreatedDate', header: 'Quote Date', order: 6, format: 'date' },
      ];
      
      for (const col of laborColumns) {
        await pool.request().query(`
          INSERT INTO dbo.ExportSchemaColumns (Id, SchemaId, SourceField, ExportHeader, DisplayOrder, IsIncluded, FormatType)
          VALUES (NEWID(), '${laborSchemaId}', '${col.field}', '${col.header}', ${col.order}, 1, '${col.format}')
        `);
      }
      console.log('  Default Labor export schema created');
    } else {
      console.log('  Default Labor export schema already exists');
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
