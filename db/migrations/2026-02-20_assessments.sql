/*
  Migration: Assessments Feature
  Date: 2026-02-20
  Description: Creates tables for Assessment Types, Reference Architectures, 
               and Generated Assessments with AI-powered document generation
*/

USE CeriumSalesTools;
GO

-- ================================================================
-- REFERENCE ARCHITECTURES
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssessmentReferenceArchitectures')
BEGIN
    CREATE TABLE dbo.AssessmentReferenceArchitectures (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Category NVARCHAR(100) NULL,
        IconName NVARCHAR(100) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AssessmentReferenceArchitectures PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_AssessmentReferenceArchitectures_Name UNIQUE (Name)
    );

    CREATE NONCLUSTERED INDEX IX_AssessmentRefArch_Category ON dbo.AssessmentReferenceArchitectures(Category);
    CREATE NONCLUSTERED INDEX IX_AssessmentRefArch_IsActive ON dbo.AssessmentReferenceArchitectures(IsActive);

    -- Insert default reference architectures (Practice Areas)
    INSERT INTO dbo.AssessmentReferenceArchitectures (Id, Name, Description, Category, SortOrder) VALUES
    (NEWID(), 'Data & AI', 'Data management, analytics, artificial intelligence and machine learning solutions', 'Technology', 1),
    (NEWID(), 'Enterprise Networking', 'Network infrastructure, SD-WAN, connectivity, and network security', 'Infrastructure', 2),
    (NEWID(), 'Security', 'Cybersecurity, threat protection, identity management, and compliance', 'Security', 3),
    (NEWID(), 'Collaboration', 'Unified communications, teamwork platforms, and productivity tools', 'Productivity', 4),
    (NEWID(), 'Contact Center', 'Customer engagement, call center, and omnichannel communication solutions', 'Customer Experience', 5),
    (NEWID(), 'Data Center', 'Server infrastructure, virtualization, storage, and hybrid cloud environments', 'Infrastructure', 6);

    PRINT 'AssessmentReferenceArchitectures table created and populated.';
END
GO

-- ================================================================
-- ASSESSMENT TYPES
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssessmentTypes')
BEGIN
    CREATE TABLE dbo.AssessmentTypes (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Category NVARCHAR(100) NULL,
        
        -- Template content for AI generation
        OverviewTemplate NVARCHAR(MAX) NULL,
        ScopeTemplate NVARCHAR(MAX) NULL,
        MethodologyTemplate NVARCHAR(MAX) NULL,
        DeliverablesTemplate NVARCHAR(MAX) NULL,
        RecommendationsTemplate NVARCHAR(MAX) NULL,
        
        -- AI prompts for personalization
        AIPromptOverview NVARCHAR(MAX) NULL,
        AIPromptFindings NVARCHAR(MAX) NULL,
        AIPromptRecommendations NVARCHAR(MAX) NULL,
        
        -- Pricing defaults
        DefaultHours DECIMAL(10,2) NULL DEFAULT 0,
        DefaultRate DECIMAL(10,2) NULL DEFAULT 175.00,
        
        IsActive BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AssessmentTypes PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_AssessmentTypes_Name UNIQUE (Name)
    );

    CREATE NONCLUSTERED INDEX IX_AssessmentTypes_Category ON dbo.AssessmentTypes(Category);
    CREATE NONCLUSTERED INDEX IX_AssessmentTypes_IsActive ON dbo.AssessmentTypes(IsActive);

    PRINT 'AssessmentTypes table created.';
END
GO

-- ================================================================
-- ASSESSMENT TYPE - REFERENCE ARCHITECTURE MAPPING
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssessmentTypeArchitectures')
BEGIN
    CREATE TABLE dbo.AssessmentTypeArchitectures (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        AssessmentTypeId NVARCHAR(64) NOT NULL,
        ReferenceArchitectureId NVARCHAR(64) NOT NULL,
        CustomTemplate NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_AssessmentTypeArchitectures PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_AssessmentTypeArch_Type FOREIGN KEY (AssessmentTypeId)
            REFERENCES dbo.AssessmentTypes(Id) ON DELETE CASCADE,
        CONSTRAINT FK_AssessmentTypeArch_Arch FOREIGN KEY (ReferenceArchitectureId)
            REFERENCES dbo.AssessmentReferenceArchitectures(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_AssessmentTypeArch UNIQUE (AssessmentTypeId, ReferenceArchitectureId)
    );

    PRINT 'AssessmentTypeArchitectures table created.';
END
GO

-- ================================================================
-- GENERATED ASSESSMENTS
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GeneratedAssessments')
BEGIN
    CREATE TABLE dbo.GeneratedAssessments (
        Id NVARCHAR(64) NOT NULL,
        AssessmentTypeId NVARCHAR(64) NOT NULL,
        ReferenceArchitectureId NVARCHAR(64) NOT NULL,
        
        -- Customer Information
        CustomerName NVARCHAR(255) NOT NULL,
        CustomerContact NVARCHAR(255) NULL,
        CustomerEmail NVARCHAR(255) NULL,
        
        -- Assessment Details
        Title NVARCHAR(500) NOT NULL,
        ExecutiveSummary NVARCHAR(MAX) NULL,
        Scope NVARCHAR(MAX) NULL,
        Methodology NVARCHAR(MAX) NULL,
        Findings NVARCHAR(MAX) NULL,
        Recommendations NVARCHAR(MAX) NULL,
        NextSteps NVARCHAR(MAX) NULL,
        
        -- Pricing
        EstimatedHours DECIMAL(10,2) NULL DEFAULT 0,
        HourlyRate DECIMAL(10,2) NULL DEFAULT 175.00,
        TotalPrice DECIMAL(18,2) NULL DEFAULT 0,
        
        -- Document
        FileName NVARCHAR(255) NULL,
        FileData VARBINARY(MAX) NULL,
        FileSizeBytes BIGINT NULL DEFAULT 0,
        
        -- Status
        Status NVARCHAR(50) NOT NULL DEFAULT 'draft',
        GeneratedBy NVARCHAR(255) NULL,
        Notes NVARCHAR(MAX) NULL,
        
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_GeneratedAssessments PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_GeneratedAssessments_Type FOREIGN KEY (AssessmentTypeId)
            REFERENCES dbo.AssessmentTypes(Id),
        CONSTRAINT FK_GeneratedAssessments_Arch FOREIGN KEY (ReferenceArchitectureId)
            REFERENCES dbo.AssessmentReferenceArchitectures(Id),
        CONSTRAINT CK_GeneratedAssessments_Status CHECK (Status IN ('draft', 'generated', 'sent', 'completed', 'archived'))
    );

    CREATE NONCLUSTERED INDEX IX_GeneratedAssessments_Customer ON dbo.GeneratedAssessments(CustomerName);
    CREATE NONCLUSTERED INDEX IX_GeneratedAssessments_Status ON dbo.GeneratedAssessments(Status);
    CREATE NONCLUSTERED INDEX IX_GeneratedAssessments_CreatedAt ON dbo.GeneratedAssessments(CreatedAt DESC);

    PRINT 'GeneratedAssessments table created.';
END
GO

-- ================================================================
-- INSERT DEFAULT ASSESSMENT TYPES
-- ================================================================

-- Microsoft 365 Assessment
IF NOT EXISTS (SELECT 1 FROM dbo.AssessmentTypes WHERE Name = 'Microsoft 365')
BEGIN
    INSERT INTO dbo.AssessmentTypes (
        Id, Name, Description, Category, 
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'Microsoft 365',
        'Microsoft 365 cloud productivity suite assessment including Exchange Online, SharePoint, Teams, and OneDrive',
        'Cloud',
        'This Microsoft 365 Assessment provides a comprehensive evaluation of {customerName}''s Microsoft 365 environment within the {referenceArchitecture} practice area. The assessment identifies optimization opportunities, security gaps, and adoption improvements.',
        'The assessment covers: Exchange Online configuration, SharePoint architecture, Teams deployment, OneDrive policies, security settings, compliance configurations, and license optimization.',
        'Our methodology follows Microsoft best practices and the Microsoft 365 Assessment framework. We conduct tenant reviews, policy analysis, and stakeholder interviews.',
        'Executive Summary, Tenant Configuration Report, Security Posture Analysis, License Optimization Recommendations, and Adoption Roadmap.',
        'Based on our findings, we recommend a prioritized approach to optimize your Microsoft 365 investment and improve security posture.',
        'Generate a professional executive summary for a Microsoft 365 assessment of {customerName} within {referenceArchitecture}. Highlight productivity and security insights.',
        'Analyze the Microsoft 365 findings across Exchange, SharePoint, Teams, and OneDrive. Categorize by impact and effort.',
        'Generate prioritized Microsoft 365 recommendations for configuration, security, and adoption improvements.',
        16, 175.00, 1
    );
    PRINT 'Microsoft 365 assessment type created.';
END
GO

-- Azure Infrastructure Assessment
IF NOT EXISTS (SELECT 1 FROM dbo.AssessmentTypes WHERE Name = 'Azure Infrastructure')
BEGIN
    INSERT INTO dbo.AssessmentTypes (
        Id, Name, Description, Category,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'Azure Infrastructure',
        'Microsoft Azure cloud infrastructure assessment including VMs, networking, storage, and security services',
        'Cloud',
        'This Azure Infrastructure Assessment evaluates {customerName}''s Azure environment within the {referenceArchitecture} domain to identify optimization, security, and cost-saving opportunities.',
        'The assessment covers: virtual machines, Azure networking, storage accounts, Azure AD, security center, cost management, and governance policies.',
        'Our team utilizes Azure Well-Architected Framework and automated assessment tools to analyze your Azure environment.',
        'Azure Architecture Review, Cost Optimization Report, Security Assessment, Performance Analysis, and Modernization Roadmap.',
        'We recommend a prioritized approach to Azure optimization focusing on cost, security, and operational excellence.',
        'Generate an executive summary for an Azure infrastructure assessment of {customerName}. Focus on cloud maturity and optimization.',
        'Document Azure findings including resource utilization, security gaps, cost inefficiencies, and architecture concerns.',
        'Provide Azure recommendations including right-sizing, security hardening, and architecture improvements.',
        24, 175.00, 2
    );
    PRINT 'Azure Infrastructure assessment type created.';
END
GO

-- On-Premises Active Directory Assessment
IF NOT EXISTS (SELECT 1 FROM dbo.AssessmentTypes WHERE Name = 'On-Premises Active Directory')
BEGIN
    INSERT INTO dbo.AssessmentTypes (
        Id, Name, Description, Category,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'On-Premises Active Directory',
        'Traditional Windows Server Active Directory Domain Services assessment including security, performance, and modernization',
        'Identity',
        'This Active Directory Assessment evaluates {customerName}''s on-premises AD infrastructure within the {referenceArchitecture} context to identify security risks and optimization opportunities.',
        'The assessment covers: domain controller health, AD replication, Group Policy, DNS configuration, security hardening, and privileged access management.',
        'We utilize Microsoft best practices and specialized AD assessment tools to analyze your directory services environment.',
        'AD Health Report, Security Assessment, Group Policy Analysis, Replication Status, and Modernization Recommendations.',
        'We recommend addressing AD security and health issues in priority order to maintain a secure identity foundation.',
        'Generate an executive summary for an Active Directory assessment of {customerName}. Focus on identity security and health.',
        'Document AD findings including security vulnerabilities, configuration issues, and operational concerns.',
        'Recommend AD improvements including security hardening, performance optimization, and hybrid identity preparation.',
        16, 175.00, 3
    );
    PRINT 'On-Premises Active Directory assessment type created.';
END
GO

-- Hybrid Identity Assessment
IF NOT EXISTS (SELECT 1 FROM dbo.AssessmentTypes WHERE Name = 'Hybrid Identity')
BEGIN
    INSERT INTO dbo.AssessmentTypes (
        Id, Name, Description, Category,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'Hybrid Identity',
        'Azure AD Connect and hybrid identity synchronization assessment including security and configuration review',
        'Identity',
        'This Hybrid Identity Assessment evaluates {customerName}''s identity synchronization between on-premises AD and Azure AD within the {referenceArchitecture} framework.',
        'The assessment covers: Azure AD Connect configuration, synchronization rules, password hash sync, pass-through authentication, seamless SSO, and conditional access.',
        'Our methodology follows Microsoft identity best practices to assess your hybrid identity configuration and security posture.',
        'Hybrid Identity Architecture Report, Sync Configuration Review, Security Assessment, and Migration Roadmap to cloud-native identity.',
        'Based on findings, we recommend optimizing your hybrid identity configuration and planning for cloud-first identity.',
        'Generate an executive summary for a hybrid identity assessment of {customerName}. Focus on identity security and cloud readiness.',
        'Analyze hybrid identity findings across sync configuration, authentication methods, and security controls.',
        'Recommend hybrid identity improvements including security enhancements and cloud identity modernization.',
        20, 175.00, 4
    );
    PRINT 'Hybrid Identity assessment type created.';
END
GO

-- Network Infrastructure Assessment
IF NOT EXISTS (SELECT 1 FROM dbo.AssessmentTypes WHERE Name = 'Network Infrastructure')
BEGIN
    INSERT INTO dbo.AssessmentTypes (
        Id, Name, Description, Category,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'Network Infrastructure',
        'LAN/WAN networking assessment including switches, routers, firewalls, and wireless infrastructure',
        'Infrastructure',
        'This Network Infrastructure Assessment evaluates {customerName}''s network environment within the {referenceArchitecture} practice area to identify performance, security, and optimization opportunities.',
        'The assessment covers: network topology, switching and routing, wireless infrastructure, firewall configuration, VPN connectivity, SD-WAN, and network security.',
        'We employ network discovery tools, traffic analysis, configuration review, and performance testing to evaluate your network.',
        'Network Topology Diagrams, Performance Analysis, Security Assessment, Optimization Recommendations, and Modernization Roadmap.',
        'We recommend network improvements prioritized by business impact, security risk, and implementation complexity.',
        'Generate an executive summary for a network infrastructure assessment of {customerName}. Highlight performance and security.',
        'Document network findings including topology issues, performance bottlenecks, and security vulnerabilities.',
        'Recommend network improvements including hardware upgrades, configuration changes, and SD-WAN opportunities.',
        16, 175.00, 5
    );
    PRINT 'Network Infrastructure assessment type created.';
END
GO

-- Endpoint Management Assessment
IF NOT EXISTS (SELECT 1 FROM dbo.AssessmentTypes WHERE Name = 'Endpoint Management')
BEGIN
    INSERT INTO dbo.AssessmentTypes (
        Id, Name, Description, Category,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'Endpoint Management',
        'Device management assessment with Intune, SCCM, or similar MDM/MAM solutions',
        'Management',
        'This Endpoint Management Assessment evaluates {customerName}''s device management strategy within the {referenceArchitecture} domain to optimize security and user experience.',
        'The assessment covers: MDM/MAM configuration, device compliance policies, application deployment, update management, security baselines, and zero trust readiness.',
        'Our methodology follows Microsoft endpoint management best practices and modern workplace frameworks.',
        'Endpoint Strategy Report, Compliance Analysis, Security Baseline Review, and Modern Management Roadmap.',
        'We recommend a phased approach to modern endpoint management focusing on security, compliance, and user productivity.',
        'Generate an executive summary for an endpoint management assessment of {customerName}. Focus on device security and management maturity.',
        'Analyze endpoint management findings across device compliance, application deployment, and security configurations.',
        'Recommend endpoint management improvements including Intune optimization, security hardening, and automation.',
        16, 175.00, 6
    );
    PRINT 'Endpoint Management assessment type created.';
END
GO

-- Backup & Disaster Recovery Assessment
IF NOT EXISTS (SELECT 1 FROM dbo.AssessmentTypes WHERE Name = 'Backup & Disaster Recovery')
BEGIN
    INSERT INTO dbo.AssessmentTypes (
        Id, Name, Description, Category,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'Backup & Disaster Recovery',
        'Data protection, backup solutions, and business continuity assessment',
        'Data Protection',
        'This Backup & DR Assessment evaluates {customerName}''s data protection strategy within the {referenceArchitecture} practice area to ensure business continuity and compliance.',
        'The assessment covers: backup policies, recovery objectives (RPO/RTO), disaster recovery plans, data retention, offsite replication, and compliance requirements.',
        'Our methodology assesses backup and DR capabilities against industry best practices and business requirements.',
        'Backup Strategy Report, DR Readiness Assessment, RPO/RTO Analysis, Gap Analysis, and Business Continuity Roadmap.',
        'We recommend a comprehensive approach to data protection addressing identified gaps and aligning with business requirements.',
        'Generate an executive summary for a backup and disaster recovery assessment of {customerName}. Focus on business continuity risks.',
        'Document backup and DR findings including coverage gaps, recovery capability concerns, and compliance issues.',
        'Recommend backup and DR improvements including technology updates, policy changes, and DR testing procedures.',
        20, 175.00, 7
    );
    PRINT 'Backup & Disaster Recovery assessment type created.';
END
GO

-- Security & Compliance Assessment
IF NOT EXISTS (SELECT 1 FROM dbo.AssessmentTypes WHERE Name = 'Security & Compliance')
BEGIN
    INSERT INTO dbo.AssessmentTypes (
        Id, Name, Description, Category,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'Security & Compliance',
        'Security posture and compliance framework assessment including threat protection and regulatory requirements',
        'Security',
        'This Security & Compliance Assessment evaluates {customerName}''s security posture and compliance status within the {referenceArchitecture} domain.',
        'The assessment covers: security policies, access controls, threat protection, data classification, compliance frameworks (HIPAA, SOC2, GDPR, etc.), and audit readiness.',
        'Our methodology follows industry frameworks including NIST CSF, CIS Controls, and applicable compliance requirements.',
        'Security Posture Report, Compliance Gap Analysis, Risk Assessment Matrix, Remediation Roadmap, and Executive Presentation.',
        'Based on findings, we recommend a prioritized approach to address security gaps and achieve compliance objectives.',
        'Generate an executive summary for a security and compliance assessment of {customerName}. Highlight risk posture and compliance status.',
        'Analyze security and compliance findings by risk level and compliance impact. Identify critical gaps.',
        'Generate prioritized security and compliance recommendations with effort estimates and timeline.',
        32, 175.00, 8
    );
    PRINT 'Security & Compliance assessment type created.';
END
GO

PRINT 'Assessment tables and default data created successfully.';
GO
