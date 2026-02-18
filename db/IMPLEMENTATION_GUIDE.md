# SQL Server Implementation Guide

## Deployment Checklist

Complete these steps in order to deploy your SQL Server database.

---

## Phase 1: Preparation (Before Deployment)

### Step 1: Verify SQL Server Installation

```powershell
# Check if SQL Server is running
Get-Service MSSQLSERVER | Select-Object Status

# Connect to SQL Server
sqlcmd -S localhost -U sa -P YourPassword -Q "SELECT @@VERSION;"
```

**Expected Output:**
```
Microsoft SQL Server 2019 (RTM-CU XX) - 15.0.XXXX.X
```

### Step 2: Backup Existing MySQL Database (if migrating)

```bash
# Export all data
mysqldump -u root -p CeriumSalesTools > backup-mysql.sql

# Export structure only
mysqldump -u root -p --no-data CeriumSalesTools > schema-mysql.sql

# Export data only
mysqldump -u root -p --no-create-info CeriumSalesTools > data-mysql.sql
```

### Step 3: Review Schema Files

Ensure these files are present:
- ✅ `db/mssql-schema.sql` - Main schema (50+ tables)
- ✅ `db/mssql-triggers.sql` - Update timestamp triggers
- ✅ `db/MSSQL_MIGRATION_GUIDE.md` - Migration documentation
- ✅ `db/MYSQL_VS_MSSQL_REFERENCE.md` - Quick reference

---

## Phase 2: Database Creation

### Step 1: Execute Main Schema Script

**Option A: Using PowerShell**

```powershell
$server = "localhost"
$user = "sa"
$password = "YourPassword"
$database = "CeriumSalesTools"
$scriptPath = "db\mssql-schema.sql"

# Read and execute script
$script = Get-Content -Path $scriptPath -Raw
$connectionString = "Server=$server;User ID=$user;Password=$password;Connection Timeout=30;"

$connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
$connection.Open()

$command = $connection.CreateCommand()
$command.CommandText = $script
$command.CommandTimeout = 300

try {
    $command.ExecuteNonQuery()
    Write-Host "✓ Schema created successfully"
} catch {
    Write-Host "✗ Error creating schema:"
    Write-Host $_.Exception.Message
} finally {
    $connection.Close()
}
```

**Option B: Using sqlcmd (Command Line)**

```powershell
# Single file execution
sqlcmd -S localhost -U sa -P YourPassword -i db\mssql-schema.sql

# With output logging
sqlcmd -S localhost -U sa -P YourPassword -i db\mssql-schema.sql -o db\schema-creation.log
```

**Option C: Using SQL Server Management Studio**

1. Open SQL Server Management Studio (SSMS)
2. Connect to: `localhost` or `.` (local instance)
3. File → Open → File → Select `db\mssql-schema.sql`
4. Click "Execute" (F5)
5. Check for errors in the "Messages" tab

### Step 2: Verify Schema Creation

```sql
-- Connect to CeriumSalesTools database
USE CeriumSalesTools;
GO

-- Verify tables
SELECT COUNT(*) AS TableCount FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Expected: 40+ tables
SELECT name FROM sys.tables ORDER BY name;

-- Verify views
SELECT name FROM sys.views ORDER BY name;

-- Verify stored procedures
SELECT name FROM sys.procedures ORDER BY name;

-- Verify functions
SELECT name FROM sys.objects WHERE type = 'FN' ORDER BY name;
```

**Expected Results:**
- Tables: 40+
- Views: 2
- Stored Procedures: 1
- Functions: 1

---

## Phase 3: Trigger Installation

### Step 1: Execute Triggers Script

**Using PowerShell:**

```powershell
sqlcmd -S localhost -U sa -P YourPassword -i db\mssql-triggers.sql
```

**Using SSMS:**

1. File → Open → File → Select `db\mssql-triggers.sql`
2. Click "Execute" (F5)

### Step 2: Verify Triggers

```sql
USE CeriumSalesTools;
GO

-- List all triggers
SELECT 
    OBJECT_NAME(parent_id) AS TableName,
    name AS TriggerName
FROM sys.triggers
WHERE parent_class = 1 -- Object triggers
ORDER BY OBJECT_NAME(parent_id);

-- Expected: 20+ triggers
```

### Step 3: Test a Trigger

```sql
USE CeriumSalesTools;
GO

-- Test on Customers table
DECLARE @TestId NVARCHAR(64) = NEWID();

-- Insert test record
INSERT INTO dbo.Customers (Id, Name, Status)
VALUES (@TestId, N'Trigger Test', N'active');

-- Get original timestamp
SELECT @TestId AS CustomerId, UpdatedAt AS OriginalTimestamp FROM dbo.Customers WHERE Id = @TestId;

-- Wait a moment
WAITFOR DELAY '00:00:01';

-- Update record
UPDATE dbo.Customers SET Name = N'Updated' WHERE Id = @TestId;

-- Get new timestamp (should be later)
SELECT @TestId AS CustomerId, UpdatedAt AS UpdatedTimestamp FROM dbo.Customers WHERE Id = @TestId;

-- Clean up
DELETE FROM dbo.Customers WHERE Id = @TestId;

-- If timestamps are different, trigger is working ✓
```

---

## Phase 4: Application Configuration

### Step 1: Update Connection Strings

**ASP.NET Core (appsettings.json)**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=CeriumSalesTools;User Id=sa;Password=YourPassword;TrustServerCertificate=True;",
    "SecondaryConnection": "Server=localhost;Database=CeriumSalesTools;User Id=CeriumAppUser;Password=AppUserPassword;TrustServerCertificate=True;"
  }
}
```

**Entity Framework Core (Program.cs)**

```csharp
// Add to Program.cs
builder.Services.AddDbContext<CeriumDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelaySeconds: 5,
            errorNumbersToAdd: null
        )
    );
});
```

**Node.js / TypeORM (.env)**

```environment
DB_HOST=localhost
DB_USER=sa
DB_PASSWORD=YourPassword
DB_NAME=CeriumSalesTools
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_CERT=true
```

**Angular (environment.ts)**

No direct database connection needed. API endpoints should point to backend server:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  apiTimeout: 30000
};
```

### Step 2: Create Application User (Security)

Run this as SA user:

```sql
USE master;
GO

-- Create login
CREATE LOGIN CeriumAppUser WITH PASSWORD = 'SecurePassword123!@#';
GO

-- Create database user
USE CeriumSalesTools;
GO

CREATE USER CeriumAppUser FOR LOGIN CeriumAppUser;
GO

-- Grant appropriate permissions
ALTER ROLE db_datareader ADD MEMBER CeriumAppUser;
ALTER ROLE db_datawriter ADD MEMBER CeriumAppUser;
GRANT EXECUTE ON SCHEMA::dbo TO CeriumAppUser;
GO

-- Verify
SELECT * FROM sys.database_principals WHERE name = 'CeriumAppUser';
```

### Step 3: Initialize Seed Data (if needed)

```sql
USE CeriumSalesTools;
GO

-- The schema script includes seed data for:
-- - PricingUnits (5 rows)
-- - LaborUnits (5 rows)  
-- - LaborSections (6 rows)

-- Verify seed data
SELECT 'PricingUnits' AS TableName, COUNT(*) AS RowCount FROM dbo.PricingUnits
UNION ALL
SELECT 'LaborUnits', COUNT(*) FROM dbo.LaborUnits
UNION ALL
SELECT 'LaborSections', COUNT(*) FROM dbo.LaborSections;

-- Expected: 5, 5, 6 rows respectively
```

---

## Phase 5: Data Migration (If from MySQL)

### Step 1: Export MySQL Data

```bash
# Create export directory
mkdir Export

# Export each table to CSV
for table in AuthUsers Customers LaborItems MspOfferings Quotes AuditLogs; do
    mysql -u root -p CeriumSalesTools -e "SELECT * FROM $table" > Export/$table.csv
done
```

### Step 2: Transform Data

Key transformations needed (example for Customers):

```powershell
# PowerShell script to clean CSV data
$csv = Import-Csv "Export\Customers.csv"

$csv | ForEach-Object {
    # Convert dates to ISO format
    if ($_.CreatedDate -and $_.CreatedDate -ne '') {
        $_.CreatedDate = ([datetime]$_.CreatedDate).ToString('yyyy-MM-dd')
    }
}

$csv | Export-Csv "Export\Customers-cleaned.csv" -NoTypeInformation
```

### Step 3: Bulk Insert into SQL Server

```sql
USE CeriumSalesTools;
GO

-- Disable constraints temporarily
ALTER TABLE dbo.Customers NOCHECK CONSTRAINT ALL;
ALTER TABLE dbo.Customers ALTER COLUMN Id NVARCHAR(64);
GO

-- Bulk insert (for Customers example)
BULK INSERT dbo.Customers
FROM 'C:\Projects\Export\Customers-cleaned.csv'
WITH (
    FIRSTROW = 2,  -- Skip header
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    TABLOCK,
    MAXERRORS = 100,
    CODEPAGE = 'OEM'  -- If there are special characters
);
GO

-- Re-enable constraints
ALTER TABLE dbo.Customers CHECK CONSTRAINT ALL;
GO

-- Verify import
SELECT COUNT(*) AS CustomerCount FROM dbo.Customers;
```

### Step 4: Verify Data Integrity

```sql
USE CeriumSalesTools;
GO

-- Check for NULL violations
SELECT TABLE_NAME, COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE IS_NULLABLE = 'NO'
  AND TABLE_NAME IN (SELECT name FROM sys.tables);

-- Run constraint checks
DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;

-- Check for orphaned foreign keys
SELECT * FROM dbo.QuoteWorkItems q
WHERE NOT EXISTS (SELECT 1 FROM dbo.Quotes WHERE Id = q.QuoteId);

-- Count summary
SELECT 'Customers' AS TableName, COUNT(*) AS RowCount FROM dbo.Customers
UNION ALL SELECT 'LaborItems', COUNT(*) FROM dbo.LaborItems
UNION ALL SELECT 'Quotes', COUNT(*) FROM dbo.Quotes
UNION ALL SELECT 'AuditLogs', COUNT(*) FROM dbo.AuditLogs;
```

---

## Phase 6: Testing

### Step 1: Connectivity Test

**From Application Server:**

```csharp
// C# Example
using System.Data.SqlClient;

try {
    using (SqlConnection conn = new SqlConnection("Server=localhost;Database=CeriumSalesTools;User Id=sa;Password=YourPassword;TrustServerCertificate=True;")) {
        conn.Open();
        Console.WriteLine("✓ Connection successful");
        
        SqlCommand cmd = new SqlCommand("SELECT COUNT(*) FROM dbo.Customers", conn);
        int count = (int)cmd.ExecuteScalar();
        Console.WriteLine($"✓ Customer count: {count}");
    }
} catch (Exception ex) {
    Console.WriteLine($"✗ Connection failed: {ex.Message}");
}
```

### Step 2: Functional Testing

```sql
USE CeriumSalesTools;
GO

-- Test 1: Insert a new customer
DECLARE @NewCustomerId NVARCHAR(64) = NEWID();
INSERT INTO dbo.Customers (Id, Name, Status)
VALUES (@NewCustomerId, N'Test Customer', N'active');

-- Test 2: Query the customer
SELECT * FROM dbo.Customers WHERE Id = @NewCustomerId;

-- Test 3: Update the customer (test trigger)
UPDATE dbo.Customers SET Name = N'Updated Name' WHERE Id = @NewCustomerId;

-- Test 4: Verify UpdatedAt changed
SELECT CreatedAt, UpdatedAt FROM dbo.Customers WHERE Id = @NewCustomerId;

-- Test 5: Delete the customer
DELETE FROM dbo.Customers WHERE Id = @NewCustomerId;

-- Test 6: Run stored procedure
EXEC dbo.usp_GetDomainAnalyticsSummary @DomainName = N'example.com', @CountryCode = N'US', @DeviceType = N'desktop';

-- Test 7: Test function
SELECT dbo.fn_CalculateQuoteTotal(1000.00, 100.00, 50.00) AS QuoteTotal;
-- Expected: 1050.00

PRINT '✓ All tests passed';
```

### Step 3: Performance Baseline

```sql
-- Get database size
USE CeriumSalesTools;
GO

SELECT 
    DB_NAME() AS DatabaseName,
    SUM(size * 8.0 / 1024) AS SizeMB
FROM sys.database_files
GROUP BY DB_NAME();

-- Get table sizes
SELECT TOP 10
    t.name AS TableName,
    SUM(p.rows) AS RowCount,
    SUM(a.total_pages) * 8 / 1024.0 AS TotalSpaceMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
GROUP BY t.name
ORDER BY TotalSpaceMB DESC;

-- Get index fragmentation
SELECT 
    OBJECT_NAME(ps.object_id) AS TableName,
    i.name AS IndexName,
    ps.avg_fragmentation_in_percent
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ps
INNER JOIN sys.indexes i ON ps.object_id = i.object_id AND ps.index_id = i.index_id
WHERE database_id = DB_ID()
  AND ps.avg_fragmentation_in_percent > 10
ORDER BY ps.avg_fragmentation_in_percent DESC;
```

---

## Phase 7: Backup & Recovery Setup

### Step 1: Create Backup Folder

```powershell
$backupPath = "C:\SQLBackups\CeriumSalesTools"
New-Item -ItemType Directory -Path $backupPath -Force
```

### Step 2: Configure Backup Schedule

**Full Backup (Weekly):**

```sql
-- Full backup
BACKUP DATABASE CeriumSalesTools
TO DISK = 'C:\SQLBackups\CeriumSalesTools\full_$(DATE).bak'
WITH FORMAT, COMPRESSION, INIT,
     NAME = 'CeriumSalesTools Full Backup',
     CHECKSUM;
GO
```

**Differential Backup (Daily):**

```sql
-- Differential backup
BACKUP DATABASE CeriumSalesTools
TO DISK = 'C:\SQLBackups\CeriumSalesTools\diff_$(DATE).bak'
WITH DIFFERENTIAL, COMPRESSION, INIT,
     NAME = 'CeriumSalesTools Differential Backup';
GO
```

**Transaction Log Backup (Every 15 min):**

```sql
-- Log backup
BACKUP LOG CeriumSalesTools
TO DISK = 'C:\SQLBackups\CeriumSalesTools\log_$(TIME).trn'
WITH COMPRESSION, INIT,
     NAME = 'CeriumSalesTools Log Backup';
GO
```

### Step 3: Create SQL Agent Jobs (Optional)

```sql
-- In SSMS: SQL Server Agent → Jobs → New Job
-- Or use T-SQL to create scheduled jobs

-- Note: Requires SQL Server Agent to be running
```

---

## Phase 8: Production Deployment

### Pre-Deployment Checklist

- [ ] All schema objects created and verified
- [ ] Triggers installed and tested
- [ ] Seed data verified
- [ ] Application user created with permissions
- [ ] Backups configured and tested
- [ ] Connection strings updated
- [ ] Application tested against SQL Server
- [ ] Performance baseline established
- [ ] Disaster recovery plan documented
- [ ] Team trained on SQL Server management

### Deployment Steps

1. **Schedule downtime** (if necessary for data migration)
2. **Create final MySQL backup** (if migrating)
3. **Execute schema script** on SQL Server
4. **Execute triggers script** on SQL Server
5. **Migrate data** (if applicable)
6. **Verify data integrity**
7. **Update application connection strings**
8. **Restart application services**
9. **Run smoke tests**
10. **Monitor logs** for errors

### Post-Deployment Verification

```sql
USE CeriumSalesTools;
GO

-- Run comprehensive checks
SELECT 
    'Database' AS Component,
    DB_NAME() AS Object,
    'Active' AS Status
UNION ALL
SELECT 'Tables', CAST(COUNT(*) AS NVARCHAR(10)), 'Active' FROM sys.tables
UNION ALL
SELECT 'Views', CAST(COUNT(*) AS NVARCHAR(10)), 'Active' FROM sys.views
UNION ALL
SELECT 'Stored Procs', CAST(COUNT(*) AS NVARCHAR(10)), 'Active' FROM sys.procedures
UNION ALL
SELECT 'Triggers', CAST(COUNT(*) AS NVARCHAR(10)), 'Active' FROM sys.triggers
UNION ALL
SELECT 'Indexes', CAST(COUNT(*) AS NVARCHAR(10)), 'Active' FROM sys.indexes WHERE object_id > 100;
```

---

## Troubleshooting

### Issue: "Cannot open database"

**Solution:**
```sql
-- Verify database exists
SELECT name FROM sys.databases WHERE name = 'CeriumSalesTools';

-- Create if missing
CREATE DATABASE CeriumSalesTools;
```

### Issue: "Login failed for user 'sa'"

**Solution:**
```powershell
# Verify SQL Server is running
Get-Service MSSQLSERVER | Start-Service

# Check authentication
sqlcmd -S localhost -U sa -P YourPassword -Q "SELECT @@VERSION"
```

### Issue: "Foreign key constraint violation"

**Solution:**
```sql
-- Insert parent table records first
-- Then child table records
-- Check data types match
```

### Issue: "Bulk insert failed"

**Solution:**
```sql
-- Check file path
-- Verify file format (CSV vs TSV)
-- Check character encoding (UTF-8 vs ANSI)
-- Verify column names match
```

### Issue: "Trigger not firing"

**Solution:**
```sql
-- Verify trigger exists
SELECT * FROM sys.triggers WHERE name LIKE 'trg_%UpdateTimestamp';

-- Check trigger definition
sp_helptext 'trg_Customers_UpdateTimestamp';

-- Ensure NOT DISABLED
SELECT name, is_disabled FROM sys.triggers WHERE name LIKE 'trg_%UpdateTimestamp';
```

---

## Rollback Plan

If deployment fails:

```sql
-- Option 1: Restore from backup
RESTORE DATABASE CeriumSalesTools 
FROM DISK = 'C:\SQLBackups\CeriumSalesTools\backup.bak'
WITH REPLACE;

-- Option 2: Drop and recreate
DROP DATABASE CeriumSalesTools;
-- Then re-run schema scripts

-- Option 3: Revert to MySQL
-- Update application connection strings back to MySQL
-- Verify MySQL is still running
```

---

## Support & Documentation

- **SQL Server Documentation**: https://docs.microsoft.com/sql/
- **T-SQL Reference**: https://docs.microsoft.com/sql/t-sql/
- **Migration Guide**: See `MSSQL_MIGRATION_GUIDE.md`
- **Quick Reference**: See `MYSQL_VS_MSSQL_REFERENCE.md`
- **GitHub Issues**: Report problems to development team

---

## Sign-Off

- **Deployed By**: _________________
- **Date**: _________________
- **Environment**: Production / Staging / Development
- **Issues Encountered**: _________________
- **Resolution**: _________________
- **Testing Status**: ✓ Passed / ✗ Failed
- **Approval**: _________________

---

**End of Implementation Guide**
