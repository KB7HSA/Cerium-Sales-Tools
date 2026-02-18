# MySQL to SQL Server Quick Reference

## Quick Comparison: Key Differences

### Data Type Mapping

| Feature | MySQL | SQL Server |
|---------|-------|------------|
| **Strings** | `VARCHAR(n)` | `NVARCHAR(n)` |
| **Text** | `TEXT` | `NVARCHAR(MAX)` |
| **Boolean** | `TINYINT(1)` | `BIT` |
| **JSON** | `JSON` | `NVARCHAR(MAX)` + JSON functions |
| **Auto Increment** | `AUTO_INCREMENT` | `IDENTITY(1,1)` |
| **Timestamps** | `TIMESTAMP` | `DATETIME2(7)` |
| **Current Time** | `CURRENT_TIMESTAMP` | `GETUTCDATE()` |
| **Enum** | `ENUM('a','b','c')` | `CHECK (col IN ('a','b','c'))` |

---

## Common Operations

### 1. Create Table

**MySQL:**
```sql
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    metadata JSON,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**SQL Server:**
```sql
CREATE TABLE dbo.Customers (
    Id BIGINT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'active',
    CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
    Metadata NVARCHAR(MAX) NULL,
    CONSTRAINT PK_Customers PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT CK_Customers_Status CHECK (Status IN ('active', 'inactive'))
);

CREATE NONCLUSTERED INDEX IX_Customers_Status ON dbo.Customers(Status);

-- Trigger for UpdatedAt
CREATE TRIGGER trg_Customers_UpdateTimestamp
ON dbo.Customers
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Customers
    SET UpdatedAt = GETUTCDATE()
    FROM dbo.Customers c
    INNER JOIN inserted i ON c.Id = i.Id
    WHERE c.UpdatedAt = i.UpdatedAt;
END
```

---

### 2. Insert Data

**MySQL:**
```sql
INSERT INTO customers (name, status) 
VALUES ('Acme Corp', 'active');

-- Get last insert ID
SELECT LAST_INSERT_ID();
```

**SQL Server:**
```sql
INSERT INTO dbo.Customers (Name, Status) 
VALUES (N'Acme Corp', N'active');

-- Get inserted ID
SELECT SCOPE_IDENTITY();

-- Or INSERT with OUTPUT
INSERT INTO dbo.Customers (Name, Status)
OUTPUT inserted.Id
VALUES (N'Acme Corp', N'active');
```

---

### 3. JSON Operations

**MySQL:**
```sql
-- Store JSON
UPDATE customers 
SET metadata = '{"tier":"premium","credits":100}' 
WHERE id = 1;

-- Query JSON
SELECT 
    name,
    JSON_EXTRACT(metadata, '$.tier') AS tier,
    JSON_EXTRACT(metadata, '$.credits') AS credits
FROM customers;
```

**SQL Server:**
```sql
-- Store JSON
UPDATE dbo.Customers 
SET Metadata = N'{"tier":"premium","credits":100}' 
WHERE Id = 1;

-- Query JSON
SELECT 
    Name,
    JSON_VALUE(Metadata, '$.tier') AS Tier,
    JSON_VALUE(Metadata, '$.credits') AS Credits
FROM dbo.Customers;

-- Validate JSON
SELECT * FROM dbo.Customers WHERE ISJSON(Metadata) = 1;

-- Parse JSON into rows
SELECT c.Name, j.*
FROM dbo.Customers c
CROSS APPLY OPENJSON(c.Metadata) 
WITH (
    tier NVARCHAR(50) '$.tier',
    credits INT '$.credits'
) j;
```

---

### 4. String Functions

| Operation | MySQL | SQL Server |
|-----------|-------|------------|
| **Concatenate** | `CONCAT(a, b, c)` | `CONCAT(a, b, c)` or `a + b + c` |
| **Substring** | `SUBSTRING(str, 1, 10)` | `SUBSTRING(str, 1, 10)` |
| **Length** | `LENGTH(str)` or `CHAR_LENGTH(str)` | `LEN(str)` or `DATALENGTH(str)` |
| **Lowercase** | `LOWER(str)` | `LOWER(str)` |
| **Uppercase** | `UPPER(str)` | `UPPER(str)` |
| **Trim** | `TRIM(str)` | `TRIM(str)` or `LTRIM(RTRIM(str))` |
| **Replace** | `REPLACE(str, 'old', 'new')` | `REPLACE(str, 'old', 'new')` |

---

### 5. Date Functions

| Operation | MySQL | SQL Server |
|-----------|-------|------------|
| **Current Date/Time** | `NOW()` or `CURRENT_TIMESTAMP` | `GETDATE()` or `GETUTCDATE()` |
| **Current Date** | `CURDATE()` | `CAST(GETDATE() AS DATE)` |
| **Date Add** | `DATE_ADD('2025-01-01', INTERVAL 7 DAY)` | `DATEADD(DAY, 7, '2025-01-01')` |
| **Date Diff** | `DATEDIFF('2025-01-10', '2025-01-01')` | `DATEDIFF(DAY, '2025-01-01', '2025-01-10')` |
| **Format Date** | `DATE_FORMAT(dt, '%Y-%m-%d')` | `FORMAT(dt, 'yyyy-MM-dd')` |
| **Extract Year** | `YEAR(dt)` | `YEAR(dt)` or `DATEPART(YEAR, dt)` |
| **Extract Month** | `MONTH(dt)` | `MONTH(dt)` or `DATEPART(MONTH, dt)` |

---

### 6. Aggregate Functions

**MySQL:**
```sql
SELECT 
    status,
    COUNT(*) as total,
    GROUP_CONCAT(name SEPARATOR ', ') as names
FROM customers
GROUP BY status;
```

**SQL Server:**
```sql
SELECT 
    Status,
    COUNT(*) AS Total,
    STRING_AGG(Name, ', ') AS Names
FROM dbo.Customers
GROUP BY Status;
```

---

### 7. Conditionals

**MySQL:**
```sql
SELECT 
    name,
    IF(status = 'active', 'Yes', 'No') AS is_active,
    CASE 
        WHEN created_at > '2025-01-01' THEN 'New'
        ELSE 'Old'
    END AS age_category
FROM customers;
```

**SQL Server:**
```sql
SELECT 
    Name,
    CASE WHEN Status = 'active' THEN 'Yes' ELSE 'No' END AS IsActive,
    CASE 
        WHEN CreatedAt > '2025-01-01' THEN 'New'
        ELSE 'Old'
    END AS AgeCategory
FROM dbo.Customers;
```

---

### 8. Pagination

**MySQL:**
```sql
-- Page 2, 10 records per page
SELECT * FROM customers
ORDER BY id
LIMIT 10 OFFSET 10;
```

**SQL Server:**
```sql
-- Page 2, 10 records per page
SELECT * FROM dbo.Customers
ORDER BY Id
OFFSET 10 ROWS
FETCH NEXT 10 ROWS ONLY;
```

---

### 9. Upsert (Insert or Update)

**MySQL:**
```sql
INSERT INTO customers (id, name, status)
VALUES (1, 'Acme Corp', 'active')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    status = VALUES(status);
```

**SQL Server:**
```sql
MERGE dbo.Customers AS target
USING (SELECT 1 AS Id, N'Acme Corp' AS Name, N'active' AS Status) AS source
ON target.Id = source.Id
WHEN MATCHED THEN
    UPDATE SET Name = source.Name, Status = source.Status
WHEN NOT MATCHED THEN
    INSERT (Id, Name, Status) VALUES (source.Id, source.Name, source.Status);
```

Or simpler with SQL Server 2016+:
```sql
IF EXISTS (SELECT 1 FROM dbo.Customers WHERE Id = 1)
    UPDATE dbo.Customers SET Name = N'Acme Corp', Status = N'active' WHERE Id = 1
ELSE
    INSERT INTO dbo.Customers (Id, Name, Status) VALUES (1, N'Acme Corp', N'active');
```

---

### 10. Transactions

**MySQL:**
```sql
START TRANSACTION;

INSERT INTO customers (name) VALUES ('Test Corp');
INSERT INTO orders (customer_id) VALUES (LAST_INSERT_ID());

COMMIT;
-- or ROLLBACK;
```

**SQL Server:**
```sql
BEGIN TRANSACTION;

DECLARE @CustomerId BIGINT;

INSERT INTO dbo.Customers (Name) VALUES (N'Test Corp');
SET @CustomerId = SCOPE_IDENTITY();

INSERT INTO dbo.Orders (CustomerId) VALUES (@CustomerId);

COMMIT TRANSACTION;
-- or ROLLBACK TRANSACTION;
```

---

### 11. Foreign Keys

**MySQL:**
```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) 
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
```

**SQL Server:**
```sql
CREATE TABLE dbo.Orders (
    Id BIGINT IDENTITY(1,1) NOT NULL,
    CustomerId BIGINT NOT NULL,
    CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId)
        REFERENCES dbo.Customers(Id)
        ON DELETE CASCADE
        -- Note: ON UPDATE CASCADE not commonly used in SQL Server
);
```

---

### 12. Index Creation

**MySQL:**
```sql
CREATE INDEX idx_customer_status ON customers(status);
CREATE UNIQUE INDEX idx_customer_email ON customers(email);
```

**SQL Server:**
```sql
CREATE NONCLUSTERED INDEX IX_Customers_Status ON dbo.Customers(Status);
CREATE UNIQUE NONCLUSTERED INDEX IX_Customers_Email ON dbo.Customers(Email);
```

---

### 13. Views

**MySQL:**
```sql
CREATE VIEW active_customers AS
SELECT id, name, email
FROM customers
WHERE status = 'active';
```

**SQL Server:**
```sql
CREATE VIEW dbo.vw_ActiveCustomers
AS
SELECT Id, Name, Email
FROM dbo.Customers
WHERE Status = 'active';
GO
```

---

### 14. Stored Procedures

**MySQL:**
```sql
DELIMITER $$
CREATE PROCEDURE get_customer_orders(IN customer_id INT)
BEGIN
    SELECT * FROM orders WHERE customer_id = customer_id;
END$$
DELIMITER ;

-- Call
CALL get_customer_orders(1);
```

**SQL Server:**
```sql
CREATE PROCEDURE dbo.usp_GetCustomerOrders
    @CustomerId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.Orders WHERE CustomerId = @CustomerId;
END
GO

-- Execute
EXEC dbo.usp_GetCustomerOrders @CustomerId = 1;
```

---

### 15. Functions

**MySQL:**
```sql
DELIMITER $$
CREATE FUNCTION calculate_total(base_price DECIMAL(10,2), tax_rate DECIMAL(5,2))
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    RETURN base_price * (1 + tax_rate);
END$$
DELIMITER ;

-- Use
SELECT calculate_total(100.00, 0.08);
```

**SQL Server:**
```sql
CREATE FUNCTION dbo.fn_CalculateTotal
(
    @BasePrice DECIMAL(10,2),
    @TaxRate DECIMAL(5,2)
)
RETURNS DECIMAL(10,2)
AS
BEGIN
    RETURN @BasePrice * (1 + @TaxRate);
END
GO

-- Use
SELECT dbo.fn_CalculateTotal(100.00, 0.08);
```

---

### 16. User Variables

**MySQL:**
```sql
SET @counter = 0;
SELECT @counter := @counter + 1 AS row_num, name
FROM customers;
```

**SQL Server:**
```sql
DECLARE @Counter INT = 0;
SELECT @Counter = @Counter + 1 AS RowNum, Name
FROM dbo.Customers;

-- Or better: use ROW_NUMBER()
SELECT ROW_NUMBER() OVER (ORDER BY Id) AS RowNum, Name
FROM dbo.Customers;
```

---

### 17. String Escaping

**MySQL:**
```sql
INSERT INTO customers (name) VALUES ('O\'Reilly');
-- Or use double quotes if ANSI_QUOTES mode
```

**SQL Server:**
```sql
INSERT INTO dbo.Customers (Name) VALUES (N'O''Reilly');
-- Single quote escaped by doubling: '' 
-- N prefix for Unicode strings
```

---

### 18. LIMIT vs TOP

**MySQL:**
```sql
SELECT * FROM customers ORDER BY created_at DESC LIMIT 10;
```

**SQL Server (Pre-2012):**
```sql
SELECT TOP 10 * FROM dbo.Customers ORDER BY CreatedAt DESC;
```

**SQL Server (2012+):**
```sql
SELECT * FROM dbo.Customers 
ORDER BY CreatedAt DESC
OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;
```

---

### 19. Information Schema

**MySQL:**
```sql
-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'mydb';

-- List columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers';
```

**SQL Server:**
```sql
-- List all tables
SELECT name FROM sys.tables ORDER BY name;

-- Or using INFORMATION_SCHEMA
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';

-- List columns
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Customers';
```

---

### 20. Explain / Execution Plan

**MySQL:**
```sql
EXPLAIN SELECT * FROM customers WHERE status = 'active';
```

**SQL Server:**
```sql
SET SHOWPLAN_TEXT ON;
GO
SELECT * FROM dbo.Customers WHERE Status = 'active';
GO
SET SHOWPLAN_TEXT OFF;
GO

-- Or use graphical plan in SSMS (Ctrl+L)
```

---

## Command Line Tools

### MySQL
```bash
# Connect
mysql -u root -p

# Run script
mysql -u root -p mydb < schema.sql

# Export database
mysqldump -u root -p mydb > backup.sql

# Import database
mysql -u root -p mydb < backup.sql
```

### SQL Server
```powershell
# Connect (sqlcmd)
sqlcmd -S localhost -U sa -P YourPassword

# Run script
sqlcmd -S localhost -U sa -P YourPassword -i schema.sql

# Export database (PowerShell)
Invoke-Sqlcmd -Query "BACKUP DATABASE CeriumSalesTools TO DISK='C:\backup.bak'"

# Import database
Invoke-Sqlcmd -Query "RESTORE DATABASE CeriumSalesTools FROM DISK='C:\backup.bak'"
```

---

## Connection Strings

### MySQL (Node.js)
```javascript
{
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'mydb'
}
```

### SQL Server (Node.js)
```javascript
{
  server: 'localhost',
  user: 'sa',
  password: 'YourPassword',
  database: 'CeriumSalesTools',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
}
```

---

## Best Practices

### SQL Server Specifics

1. **Always use schema prefix**: `dbo.Customers` not just `Customers`
2. **Use NVARCHAR for Unicode**: Supports all international characters
3. **Prefer DATETIME2 over DATETIME**: Better precision and range
4. **Use BIT for booleans**: Not TINYINT
5. **SET NOCOUNT ON in procedures**: Reduces network traffic
6. **Use ; GO for batches**: Separates DDL commands
7. **Name constraints explicitly**: Easier troubleshooting
8. **Use CLUSTERED PRIMARY KEY**: Default and optimal
9. **Add NONCLUSTERED indexes**: For foreign keys and searches
10. **Use GETUTCDATE() not GETDATE()**: UTC for consistency

---

## Common Gotchas

### 1. NULL Handling
```sql
-- MySQL: NULL safe comparison
SELECT * FROM customers WHERE deleted_at <=> NULL;

-- SQL Server: Must use IS NULL
SELECT * FROM dbo.Customers WHERE DeletedAt IS NULL;
```

### 2. String Concatenation with NULL
```sql
-- MySQL: Returns NULL if any part is NULL
SELECT CONCAT('Hello', NULL, 'World'); -- NULL

-- SQL Server: Same behavior with CONCAT
SELECT CONCAT('Hello', NULL, 'World'); -- 'HelloWorld'

-- But + operator returns NULL
SELECT 'Hello' + NULL + 'World'; -- NULL
```

### 3. Division
```sql
-- MySQL: Returns decimal
SELECT 5 / 2; -- 2.5000

-- SQL Server: Integer division
SELECT 5 / 2; -- 2

-- Need explicit cast
SELECT 5.0 / 2; -- 2.500000
SELECT CAST(5 AS DECIMAL) / 2; -- 2.500000
```

### 4. Case Sensitivity
```sql
-- MySQL: Depends on collation (usually case-insensitive)
SELECT * FROM customers WHERE name = 'acme';

-- SQL Server: Usually case-insensitive (CI in collation)
-- But can be controlled by collation
SELECT * FROM dbo.Customers WHERE Name = 'acme' COLLATE SQL_Latin1_General_CP1_CS_AS;
-- CS = Case Sensitive
```

---

## Quick Start Commands

### Create Database
```sql
-- MySQL
CREATE DATABASE CeriumSalesTools CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- SQL Server
CREATE DATABASE CeriumSalesTools COLLATE SQL_Latin1_General_CP1_CI_AS;
```

### Switch Database
```sql
-- MySQL
USE CeriumSalesTools;

-- SQL Server
USE CeriumSalesTools;
GO
```

### Show Tables
```sql
-- MySQL
SHOW TABLES;

-- SQL Server
SELECT name FROM sys.tables ORDER BY name;
```

### Describe Table
```sql
-- MySQL
DESCRIBE customers;

-- SQL Server
EXEC sp_columns 'Customers';
-- Or
SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Customers';
```

---

**End of Quick Reference**
