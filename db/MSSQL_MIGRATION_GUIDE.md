# Microsoft SQL Server Migration Guide

## Overview

This document outlines the migration from MySQL to Microsoft SQL Server for the Cerium Sales Tools application (Tailadmin). The schema has been completely converted to use T-SQL syntax and SQL Server best practices.

---

## Database Name

- **Database**: `CeriumSalesTools`
- **Collation**: `SQL_Latin1_General_CP1_CI_AS` (Case-Insensitive, Accent-Sensitive)
- **Minimum Version**: SQL Server 2016+

---

## Key Conversion Changes

### 1. Data Type Conversions

| MySQL Type | SQL Server Type | Notes |
|------------|----------------|-------|
| `VARCHAR(n)` | `NVARCHAR(n)` | Unicode support for international characters |
| `TEXT` | `NVARCHAR(MAX)` | Maximum 2GB of Unicode text |
| `TINYINT(1)` | `BIT` | Boolean values (0/1) |
| `JSON` | `NVARCHAR(MAX)` | JSON support via string storage |
| `AUTO_INCREMENT` | `IDENTITY(1,1)` | Auto-incrementing integer columns |
| `TIMESTAMP` | `DATETIME2(7)` | Higher precision (100 nanoseconds) |
| `DATE` | `DATE` | Same in both systems |
| `ENUM` | `CHECK` constraints | Validated string values |
| `DECIMAL(m,n)` | `DECIMAL(m,n)` | Same in both systems |

### 2. Auto-Increment Handling

**MySQL:**
```sql
Id INT AUTO_INCREMENT PRIMARY KEY
```

**SQL Server:**
```sql
Id BIGINT IDENTITY(1,1) NOT NULL,
CONSTRAINT PK_TableName PRIMARY KEY CLUSTERED (Id)
```

### 3. Default Values

**MySQL:**
```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**SQL Server:**
```sql
CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE()
```

**Note**: `ON UPDATE CURRENT_TIMESTAMP` requires triggers in SQL Server (see Triggers section).

### 4. ENUM Replacement

**MySQL:**
```sql
status ENUM('active', 'inactive', 'pending') DEFAULT 'active'
```

**SQL Server:**
```sql
Status NVARCHAR(20) NOT NULL DEFAULT 'active',
CONSTRAINT CK_TableName_Status CHECK (Status IN ('active', 'inactive', 'pending'))
```

### 5. JSON Storage

**MySQL 5.7+:**
```sql
metadata JSON
```

**SQL Server 2016+:**
```sql
Metadata NVARCHAR(MAX) NULL
-- Use FOR JSON / OPENJSON for JSON operations
```

**Example Operations:**
```sql
-- Store JSON
UPDATE MyTable SET Metadata = N'{"key":"value"}' WHERE Id = 1;

-- Query JSON
SELECT JSON_VALUE(Metadata, '$.key') AS KeyValue FROM MyTable;

-- Validate JSON
SELECT * FROM MyTable WHERE ISJSON(Metadata) = 1;
```

---

## Schema Organization

### Authentication & Authorization (7 tables)
- `AuthUsers` - User credentials and security
- `AuthUserRoles` - Role assignments
- `AuthSessions` - Active session tokens
- `PasswordResetTokens` - Password recovery

### User Management (3 tables)
- `AdminUsers` - Business users
- `UserProfiles` - Extended profile data
- `UserPreferences` - Theme and settings

### Customer Management (2 tables)
- `Customers` - Customer records
- `CustomerContacts` - Contact persons

### Labor Budgeting (10 tables)
- `LaborUnits` - Units of measure
- `LaborSections` - Category organization
- `LaborItems` - Catalog items
- `LaborSolutions` - Solution calculator
- `LaborSolutionItems` - Solution details
- `LaborWizardDrafts` - Wizard state
- `LaborWizardSolutions` - Wizard solutions
- `LaborWizardItems` - Wizard line items
- `SolutionBlueprints` - Reusable templates
- `SolutionBlueprintItems` - Template details

### MSP Services (4 tables)
- `PricingUnits` - Pricing models
- `MspOfferings` - Service catalog
- `MspOfferingFeatures` - Feature lists
- `MspServiceLevels` - Tiered pricing
- `MspServiceLevelOptions` - Add-on options

### Quotes & Proposals (4 tables)
- `Quotes` - Quote headers
- `QuoteWorkItems` - Line items
- `QuoteLaborGroups` - Section summaries
- `QuoteSelectedOptions` - Selected MSP services

### Domain Analytics (8 tables)
- `AnalyticsDomains` - Tracked domains
- `AnalyticsDomainCategories` - Domain categories
- `AnalyticsOrganicMetrics` - SEO metrics
- `AnalyticsPaidMetrics` - PPC metrics
- `AnalyticsBacklinks` - Backlink data
- `AnalyticsKeywords` - Keyword rankings
- `AnalyticsCompetitors` - Competitive analysis
- `AnalyticsTopPages` - Top-performing pages

### Support & Operations (5 tables)
- `SupportTickets` - Support requests
- `SupportTicketReplies` - Ticket responses
- `UserNotifications` - In-app notifications
- `FileAttachments` - File uploads
- `AuditLogs` - Activity tracking
- `SystemActivityLog` - System events

---

## Indexes Strategy

### Primary Keys
All primary keys use **CLUSTERED** indexes for optimal performance:
```sql
CONSTRAINT PK_TableName PRIMARY KEY CLUSTERED (Id)
```

### Foreign Keys
Foreign key relationships are enforced with proper cascading:
```sql
CONSTRAINT FK_ChildTable_ParentTable FOREIGN KEY (ParentId)
    REFERENCES dbo.ParentTable(Id) ON DELETE CASCADE
```

### Non-Clustered Indexes
Created on frequently queried columns:
- Foreign key columns
- Email addresses
- Status fields
- Date-based query columns
- Search fields (e.g., customer name, domain name)

**Example:**
```sql
CREATE NONCLUSTERED INDEX IX_Customers_Email ON dbo.Customers(Email);
CREATE NONCLUSTERED INDEX IX_Customers_Status ON dbo.Customers(Status);
```

---

## Triggers for Updated Timestamps

SQL Server doesn't support `ON UPDATE CURRENT_TIMESTAMP`. You need triggers:

### Example Trigger for AuthUsers
```sql
CREATE TRIGGER trg_AuthUsers_UpdateTimestamp
ON dbo.AuthUsers
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.AuthUsers
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.AuthUsers u
    INNER JOIN inserted i ON u.Id = i.Id;
END
GO
```

### Applying to All Tables
Create similar triggers for all tables with `UpdatedAt` columns:
- AuthUsers
- AuthSessions
- AdminUsers
- UserProfiles
- UserPreferences
- Customers
- LaborItems
- LaborSolutions
- MspOfferings
- MspServiceLevels
- Quotes
- AnalyticsDomains
- SupportTickets

---

## Views & Stored Procedures

### Views Created

1. **vw_CustomerQuoteSummary**
   - Aggregates customer quote statistics
   - Shows total quotes, accepted quotes, total value

2. **vw_LaborBudgetSummary**
   - Summarizes labor solution costs
   - Calculates total hours and costs per solution

### Stored Procedures

1. **usp_GetDomainAnalyticsSummary**
   - Parameters: `@DomainName`, `@CountryCode`, `@DeviceType`
   - Returns: Organic metrics, paid metrics, backlinks, top keywords

**Usage Example:**
```sql
EXEC dbo.usp_GetDomainAnalyticsSummary 
    @DomainName = N'example.com',
    @CountryCode = N'US',
    @DeviceType = N'desktop';
```

### Functions

1. **fn_CalculateQuoteTotal**
   - Calculates final quote total with adjustments
   - Parameters: Base total, setup fee, discount

**Usage Example:**
```sql
SELECT dbo.fn_CalculateQuoteTotal(10000, 500, 250) AS FinalTotal;
-- Returns: 10250
```

---

## Data Migration Process

### Step 1: Export MySQL Data

```bash
# Export all tables to CSV
mysqldump -u root -p --tab=/tmp/export --fields-terminated-by=',' CeriumSalesTools

# Or use SQL Server Migration Assistant (SSMA)
```

### Step 2: Transform Data

Key transformations needed:
- Convert UTF-8 encoding to Unicode
- Replace `NULL` string values with actual NULL
- Convert boolean `0/1` to BIT
- Format dates to ISO-8601 (`YYYY-MM-DD` or `YYYY-MM-DD HH:MM:SS`)
- Escape single quotes in strings (`'` becomes `''`)

### Step 3: Import to SQL Server

```sql
-- Disable constraints temporarily
ALTER TABLE dbo.TableName NOCHECK CONSTRAINT ALL;

-- Bulk insert (example for Customers)
BULK INSERT dbo.Customers
FROM 'C:\Import\customers.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    TABLOCK
);

-- Re-enable constraints
ALTER TABLE dbo.TableName CHECK CONSTRAINT ALL;
```

### Step 4: Validate Data

```sql
-- Check row counts
SELECT 'Customers' AS TableName, COUNT(*) AS RowCount FROM dbo.Customers
UNION ALL
SELECT 'LaborItems', COUNT(*) FROM dbo.LaborItems
UNION ALL
SELECT 'Quotes', COUNT(*) FROM dbo.Quotes;

-- Verify foreign key integrity
DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;

-- Check for NULL violations
SELECT * FROM dbo.Customers WHERE Name IS NULL;
```

---

## Connection Strings

### ADO.NET (C# / .NET)
```csharp
Server=localhost;Database=CeriumSalesTools;User Id=sa;Password=YourPassword;TrustServerCertificate=True;
```

### Entity Framework Core
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=CeriumSalesTools;User Id=sa;Password=YourPassword;TrustServerCertificate=True;"
  }
}
```

### Node.js (mssql package)
```javascript
const config = {
  user: 'sa',
  password: 'YourPassword',
  server: 'localhost',
  database: 'CeriumSalesTools',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};
```

### Python (pyodbc)
```python
import pyodbc

conn_str = (
    'DRIVER={ODBC Driver 17 for SQL Server};'
    'SERVER=localhost;'
    'DATABASE=CeriumSalesTools;'
    'UID=sa;'
    'PWD=YourPassword'
)
```

---

## Security Recommendations

### 1. Create Application User

```sql
-- Create login
CREATE LOGIN CeriumAppUser WITH PASSWORD = 'StrongPassword123!';

-- Create database user
USE CeriumSalesTools;
CREATE USER CeriumAppUser FOR LOGIN CeriumAppUser;

-- Grant permissions
ALTER ROLE db_datareader ADD MEMBER CeriumAppUser;
ALTER ROLE db_datawriter ADD MEMBER CeriumAppUser;
GRANT EXECUTE TO CeriumAppUser;
```

### 2. Enable Transparent Data Encryption (TDE)

```sql
-- Create master key
USE master;
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'MasterKeyPassword123!';

-- Create certificate
CREATE CERTIFICATE TDE_Cert WITH SUBJECT = 'TDE Certificate';

-- Create database encryption key
USE CeriumSalesTools;
CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE TDE_Cert;

-- Enable encryption
ALTER DATABASE CeriumSalesTools SET ENCRYPTION ON;
```

### 3. Row-Level Security (RLS) Example

For multi-tenant scenarios:

```sql
-- Create security policy function
CREATE FUNCTION dbo.fn_SecurityPredicate(@UserId NVARCHAR(64))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS result
WHERE @UserId = CAST(SESSION_CONTEXT(N'UserId') AS NVARCHAR(64));

-- Create security policy
CREATE SECURITY POLICY CustomerFilter
ADD FILTER PREDICATE dbo.fn_SecurityPredicate(CreatedByUserId)
ON dbo.Customers
WITH (STATE = ON);
```

---

## Performance Optimization

### 1. Update Statistics

```sql
-- Update all statistics
EXEC sp_updatestats;

-- For specific table
UPDATE STATISTICS dbo.Customers WITH FULLSCAN;
```

### 2. Rebuild Indexes

```sql
-- Rebuild all indexes on a table
ALTER INDEX ALL ON dbo.Customers REBUILD;

-- Reorganize fragmented indexes
ALTER INDEX ALL ON dbo.Customers REORGANIZE;
```

### 3. Query Store

```sql
-- Enable Query Store for performance monitoring
ALTER DATABASE CeriumSalesTools
SET QUERY_STORE = ON (
    OPERATION_MODE = READ_WRITE,
    CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30)
);
```

### 4. Partitioning Large Tables

For `AuditLogs` table (grows indefinitely):

```sql
-- Create partition function
CREATE PARTITION FUNCTION pf_AuditLogsByMonth (DATETIME2)
AS RANGE RIGHT FOR VALUES (
    '2025-01-01', '2025-02-01', '2025-03-01'
    -- Add new months over time
);

-- Create partition scheme
CREATE PARTITION SCHEME ps_AuditLogsByMonth
AS PARTITION pf_AuditLogsByMonth
ALL TO ([PRIMARY]);

-- Recreate table with partitioning
-- (Requires dropping and recreating the table)
```

---

## Backup & Recovery

### Full Backup
```sql
BACKUP DATABASE CeriumSalesTools
TO DISK = 'C:\Backups\CeriumSalesTools_Full.bak'
WITH FORMAT, COMPRESSION;
```

### Differential Backup
```sql
BACKUP DATABASE CeriumSalesTools
TO DISK = 'C:\Backups\CeriumSalesTools_Diff.bak'
WITH DIFFERENTIAL, COMPRESSION;
```

### Transaction Log Backup
```sql
BACKUP LOG CeriumSalesTools
TO DISK = 'C:\Backups\CeriumSalesTools_Log.trn'
WITH COMPRESSION;
```

### Automated Backup Schedule

Use SQL Server Agent to schedule:
- **Full Backup**: Weekly (Sunday 2 AM)
- **Differential Backup**: Daily (2 AM)
- **Log Backup**: Every 15 minutes (during business hours)

---

## Monitoring Queries

### Active Connections
```sql
SELECT 
    session_id,
    login_name,
    host_name,
    program_name,
    status,
    cpu_time,
    memory_usage
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID('CeriumSalesTools');
```

### Long-Running Queries
```sql
SELECT 
    r.session_id,
    r.status,
    r.command,
    r.wait_type,
    r.total_elapsed_time / 1000.0 AS elapsed_seconds,
    t.text AS query_text
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.database_id = DB_ID('CeriumSalesTools')
ORDER BY r.total_elapsed_time DESC;
```

### Database Size
```sql
SELECT 
    DB_NAME() AS DatabaseName,
    SUM(size * 8.0 / 1024) AS SizeMB
FROM sys.database_files
WHERE type_desc = 'ROWS';
```

### Table Sizes
```sql
SELECT 
    t.name AS TableName,
    SUM(p.rows) AS RowCount,
    SUM(a.total_pages) * 8 / 1024.0 AS TotalSpaceMB,
    SUM(a.used_pages) * 8 / 1024.0 AS UsedSpaceMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
GROUP BY t.name
ORDER BY TotalSpaceMB DESC;
```

---

## Troubleshooting

### ERROR: Cannot insert NULL into non-nullable column

**Solution**: Ensure all required fields have values or provide defaults:
```sql
ALTER TABLE dbo.MyTable ADD CONSTRAINT DF_MyTable_Status DEFAULT 'active' FOR Status;
```

### ERROR: Foreign key constraint violation

**Solution**: Insert data in proper order (parent before child):
1. AuthUsers
2. AdminUsers
3. Customers
4. LaborItems
5. LaborSolutions
6. LaborSolutionItems (depends on both Solutions and Items)

### ERROR: String truncation

**Solution**: Check length of NVARCHAR columns and increase if needed:
```sql
ALTER TABLE dbo.Customers ALTER COLUMN Notes NVARCHAR(MAX);
```

### Performance: Slow Queries

**Solution**: Add missing indexes:
```sql
-- Find missing indexes
SELECT 
    OBJECT_NAME(d.object_id) AS TableName,
    d.equality_columns,
    d.inequality_columns,
    d.included_columns,
    s.avg_total_user_cost,
    s.user_seeks
FROM sys.dm_db_missing_index_details d
INNER JOIN sys.dm_db_missing_index_stats s ON d.index_handle = s.index_handle
WHERE d.database_id = DB_ID('CeriumSalesTools')
ORDER BY s.avg_total_user_cost * s.user_seeks DESC;
```

---

## Testing Checklist

- [ ] All tables created successfully
- [ ] Primary keys defined on all tables
- [ ] Foreign key relationships working
- [ ] Check constraints validating data
- [ ] Default values applying correctly
- [ ] Indexes created for performance
- [ ] Views returning expected data
- [ ] Stored procedures executing without errors
- [ ] Functions calculating correctly
- [ ] Triggers firing on updates
- [ ] Data migration completed (if applicable)
- [ ] Row counts match source database
- [ ] Application connects successfully
- [ ] CRUD operations working
- [ ] Authentication flow tested
- [ ] Reports generating correctly
- [ ] Backup/restore tested

---

## Next Steps

1. **Run the Schema Script**
   ```powershell
   sqlcmd -S localhost -U sa -P YourPassword -i "db\mssql-schema.sql"
   ```

2. **Create Update Triggers** (see Triggers section above)

3. **Migrate Data** (if coming from MySQL)

4. **Configure Backups**

5. **Update Application Connection Strings**

6. **Test All Features**

7. **Monitor Performance** (Query Store, DMVs)

8. **Document Any Custom Changes**

---

## Support Resources

- **SQL Server Documentation**: https://docs.microsoft.com/sql/
- **SQL Server Migration Assistant**: https://www.microsoft.com/download/details.aspx?id=54258
- **Azure Data Studio**: https://docs.microsoft.com/sql/azure-data-studio/
- **SQL Server Management Studio**: https://docs.microsoft.com/sql/ssms/

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02 | AI Assistant | Initial SQL Server schema conversion |

---

**End of Migration Guide**
