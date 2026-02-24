-- Menu Configuration table for admin-controlled menu visibility
-- Allows Super Admins to show/hide sidebar menu items

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MenuConfiguration')
BEGIN
    CREATE TABLE dbo.MenuConfiguration (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        MenuItemKey NVARCHAR(100) NOT NULL UNIQUE,
        DisplayName NVARCHAR(200) NOT NULL,
        ParentKey NVARCHAR(100) NULL,
        IsVisible BIT NOT NULL DEFAULT 1,
        IsProtected BIT NOT NULL DEFAULT 0,  -- Protected items always visible for Super Admins
        SortOrder INT NOT NULL DEFAULT 0,
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedBy NVARCHAR(200) NULL
    );

    -- Seed with default menu items (all visible by default)
    -- Main nav items
    INSERT INTO dbo.MenuConfiguration (MenuItemKey, DisplayName, ParentKey, IsVisible, IsProtected, SortOrder) VALUES
    ('dashboard', 'Dashboard', NULL, 1, 0, 1),
    ('dashboard-tech-sales', 'Tech Sales', 'dashboard', 1, 0, 1),
    ('dashboard-analytics', 'Analytics', 'dashboard', 1, 0, 2),
    ('dashboard-marketing', 'Marketing', 'dashboard', 1, 0, 3),
    ('dashboard-crm', 'CRM', 'dashboard', 1, 0, 4),
    ('dashboard-stocks', 'Stocks', 'dashboard', 1, 0, 5),
    ('dashboard-saas', 'SaaS', 'dashboard', 1, 0, 6),
    ('dashboard-logistics', 'Logistics', 'dashboard', 1, 0, 7),
    ('msp-services', 'MSP Services', NULL, 1, 0, 2),
    ('msp-services-dashboard', 'Dashboard', 'msp-services', 1, 0, 1),
    ('msp-services-overview', 'Services Overview', 'msp-services', 1, 0, 2),
    ('labor-budget', 'Labor Budget', NULL, 1, 0, 3),
    ('labor-budget-calculator', 'Calculator', 'labor-budget', 1, 0, 1),
    ('labor-budget-wizard', 'Wizard', 'labor-budget', 1, 0, 2),
    ('quote-management', 'Quote Management', NULL, 1, 0, 4),
    ('sow-documents', 'SOW Documents', NULL, 1, 0, 5),
    ('assessments', 'Assessments', NULL, 1, 0, 6),
    ('e-rate', 'E-Rate', NULL, 1, 0, 7),
    ('e-rate-dashboard', 'Dashboard', 'e-rate', 1, 0, 1),
    ('e-rate-opportunities', 'Opportunities', 'e-rate', 1, 0, 2),
    ('e-rate-frn-dashboard', 'FRN Dashboard', 'e-rate', 1, 0, 3),
    ('e-rate-frn-status', 'FRN Status', 'e-rate', 1, 0, 4),
    ('admin', 'Admin', NULL, 1, 1, 8),  -- Protected: always visible for Super Admins
    ('admin-users', 'Users', 'admin', 1, 1, 1),
    ('admin-customers', 'Customers', 'admin', 1, 0, 2),
    ('admin-create-user', 'Create User', 'admin', 1, 1, 3),
    ('admin-msp-offerings', 'MSP Offerings', 'admin', 1, 0, 4),
    ('admin-assessment-types', 'Assessment Types', 'admin', 1, 0, 5),
    ('admin-labor-budget', 'Labor Budget Admin', 'admin', 1, 0, 6),
    ('admin-export-schemas', 'Export Schemas', 'admin', 1, 0, 7),
    ('admin-erate-settings', 'E-Rate Settings', 'admin', 1, 0, 8),
    ('admin-settings', 'Settings', 'admin', 1, 0, 9),
    ('admin-menu-admin', 'Menu Admin', 'admin', 1, 1, 10),  -- Protected: always visible for Super Admins
    ('user-profile', 'User Profile', NULL, 1, 0, 9);

    PRINT 'MenuConfiguration table created and seeded successfully';
END
ELSE
BEGIN
    -- Check if Menu Admin entry exists, add if not
    IF NOT EXISTS (SELECT 1 FROM dbo.MenuConfiguration WHERE MenuItemKey = 'admin-menu-admin')
    BEGIN
        INSERT INTO dbo.MenuConfiguration (MenuItemKey, DisplayName, ParentKey, IsVisible, IsProtected, SortOrder)
        VALUES ('admin-menu-admin', 'Menu Admin', 'admin', 1, 1, 10);
        PRINT 'Added Menu Admin entry to existing MenuConfiguration table';
    END
    ELSE
    BEGIN
        PRINT 'MenuConfiguration table already exists';
    END
END
