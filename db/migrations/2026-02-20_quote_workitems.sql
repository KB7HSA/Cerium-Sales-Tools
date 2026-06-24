/*
  Quote Work Items table
  Date: 2026-02-20
  Description: Ensures QuoteWorkItems exists before later migrations add columns.
  Note: Also defined in mssql-schema.sql; this migration covers fresh/partial deploys.
*/

USE CeriumSalesTools;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'QuoteWorkItems' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.QuoteWorkItems (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        QuoteId NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        ReferenceArchitecture NVARCHAR(100) NULL,
        Section NVARCHAR(100) NULL,
        UnitOfMeasure NVARCHAR(100) NULL,
        ClosetCount INT NOT NULL DEFAULT 0,
        SwitchCount DECIMAL(10,2) NOT NULL DEFAULT 0,
        HoursPerUnit DECIMAL(10,2) NOT NULL DEFAULT 0,
        RatePerHour DECIMAL(10,2) NOT NULL DEFAULT 0,
        LineHours DECIMAL(10,2) NOT NULL DEFAULT 0,
        LineTotal DECIMAL(12,2) NOT NULL DEFAULT 0,
        SolutionName NVARCHAR(255) NULL,
        GroupName NVARCHAR(255) NULL DEFAULT 'Default',
        SortOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_QuoteWorkItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_QuoteWorkItems_Quotes FOREIGN KEY (QuoteId)
            REFERENCES dbo.Quotes(Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_QuoteWorkItems_QuoteId ON dbo.QuoteWorkItems(QuoteId);

    PRINT 'Created QuoteWorkItems table';
END
ELSE
BEGIN
    PRINT 'QuoteWorkItems table already exists';
END
GO
