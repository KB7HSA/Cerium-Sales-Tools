/*
  Migration: SOW Types & Generated SOWs Feature
  Date: 2026-02-24
  Description: Creates tables for SOW Types, SOW Type-Architecture mapping,
               and Generated SOWs with AI-powered document generation.
               Reuses AssessmentReferenceArchitectures for practice areas.
*/

USE CeriumSalesTools;
GO

-- ================================================================
-- SOW TYPES
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SOWTypes')
BEGIN
    CREATE TABLE dbo.SOWTypes (
        Id NVARCHAR(64) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Category NVARCHAR(100) NULL,

        -- DOCX template file (in /public/templates/)
        TemplateFileName NVARCHAR(255) NULL DEFAULT 'SOW-Template.docx',

        -- Document Template Content (with {placeholders})
        OverviewTemplate NVARCHAR(MAX) NULL,
        ScopeTemplate NVARCHAR(MAX) NULL,
        MethodologyTemplate NVARCHAR(MAX) NULL,
        DeliverablesTemplate NVARCHAR(MAX) NULL,
        RecommendationsTemplate NVARCHAR(MAX) NULL,

        -- AI Prompts (instructions sent to Azure OpenAI per section)
        AIPromptOverview NVARCHAR(MAX) NULL,
        AIPromptFindings NVARCHAR(MAX) NULL,
        AIPromptRecommendations NVARCHAR(MAX) NULL,
        AIPromptScope NVARCHAR(MAX) NULL,
        AITemperature DECIMAL(3,1) NULL DEFAULT 0.7,

        -- Technical Resources folder path
        ResourceFolder NVARCHAR(500) NULL,

        -- Pricing defaults
        DefaultHours DECIMAL(10,2) NULL DEFAULT 0,
        DefaultRate DECIMAL(10,2) NULL DEFAULT 175.00,

        IsActive BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SOWTypes PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_SOWTypes_Name UNIQUE (Name)
    );

    CREATE NONCLUSTERED INDEX IX_SOWTypes_Category ON dbo.SOWTypes(Category);
    CREATE NONCLUSTERED INDEX IX_SOWTypes_IsActive ON dbo.SOWTypes(IsActive);

    PRINT 'SOWTypes table created.';
END
GO

-- ================================================================
-- SOW TYPE - REFERENCE ARCHITECTURE MAPPING
-- (Reuses AssessmentReferenceArchitectures table for practice areas)
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SOWTypeArchitectures')
BEGIN
    CREATE TABLE dbo.SOWTypeArchitectures (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        SOWTypeId NVARCHAR(64) NOT NULL,
        ReferenceArchitectureId NVARCHAR(64) NOT NULL,
        CustomTemplate NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT PK_SOWTypeArchitectures PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_SOWTypeArch_Type FOREIGN KEY (SOWTypeId)
            REFERENCES dbo.SOWTypes(Id) ON DELETE CASCADE,
        CONSTRAINT FK_SOWTypeArch_Arch FOREIGN KEY (ReferenceArchitectureId)
            REFERENCES dbo.AssessmentReferenceArchitectures(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_SOWTypeArch UNIQUE (SOWTypeId, ReferenceArchitectureId)
    );

    PRINT 'SOWTypeArchitectures table created.';
END
GO

-- ================================================================
-- GENERATED SOWS
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GeneratedSOWs')
BEGIN
    CREATE TABLE dbo.GeneratedSOWs (
        Id NVARCHAR(64) NOT NULL,
        SOWTypeId NVARCHAR(64) NOT NULL,
        ReferenceArchitectureId NVARCHAR(64) NOT NULL,

        -- Optional link to a quote
        QuoteId NVARCHAR(64) NULL,

        -- Customer Information
        CustomerName NVARCHAR(255) NOT NULL,
        CustomerContact NVARCHAR(255) NULL,
        CustomerEmail NVARCHAR(255) NULL,

        -- SOW Details
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
        CONSTRAINT PK_GeneratedSOWs PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_GeneratedSOWs_Type FOREIGN KEY (SOWTypeId)
            REFERENCES dbo.SOWTypes(Id),
        CONSTRAINT FK_GeneratedSOWs_Arch FOREIGN KEY (ReferenceArchitectureId)
            REFERENCES dbo.AssessmentReferenceArchitectures(Id),
        CONSTRAINT CK_GeneratedSOWs_Status CHECK (Status IN ('draft', 'generated', 'sent', 'completed', 'archived'))
    );

    CREATE NONCLUSTERED INDEX IX_GeneratedSOWs_Customer ON dbo.GeneratedSOWs(CustomerName);
    CREATE NONCLUSTERED INDEX IX_GeneratedSOWs_Status ON dbo.GeneratedSOWs(Status);
    CREATE NONCLUSTERED INDEX IX_GeneratedSOWs_CreatedAt ON dbo.GeneratedSOWs(CreatedAt DESC);
    CREATE NONCLUSTERED INDEX IX_GeneratedSOWs_QuoteId ON dbo.GeneratedSOWs(QuoteId);

    PRINT 'GeneratedSOWs table created.';
END
GO

-- ================================================================
-- INSERT DEFAULT SOW TYPES
-- ================================================================

-- Managed Services SOW
IF NOT EXISTS (SELECT 1 FROM dbo.SOWTypes WHERE Name = 'Managed Services SOW')
BEGIN
    INSERT INTO dbo.SOWTypes (
        Id, Name, Description, Category,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'Managed Services SOW',
        'Statement of Work for managed services engagements including monitoring, maintenance, and support',
        'Services',
        'This Statement of Work outlines the managed services engagement between Cerium Networks and {customerName}. The engagement covers {referenceArchitecture} services designed to optimize operations and ensure reliability.',
        'The scope of services includes: proactive monitoring, incident management, change management, regular reporting, and ongoing optimization of the {referenceArchitecture} environment.',
        'Our managed services delivery follows ITIL best practices with defined service level agreements (SLAs), regular service reviews, and continuous improvement processes.',
        'Monthly Service Reports, Quarterly Business Reviews, Incident Reports, Change Management Documentation, and Service Level Achievement Reports.',
        'We recommend a phased approach to onboarding managed services, starting with discovery and assessment, followed by transition planning and steady-state operations.',
        'Generate a professional executive summary for a managed services Statement of Work for {customerName} covering {referenceArchitecture}. Focus on business value and operational efficiency.',
        'Analyze the current environment and identify key areas where managed services will provide the most impact. Include operational metrics and improvement opportunities.',
        'Generate prioritized recommendations for the managed services engagement, including onboarding milestones, service level targets, and optimization opportunities.',
        'Generate a detailed scope of work covering service boundaries, included/excluded services, escalation procedures, and SLA definitions.',
        40, 175.00, 1
    );
    PRINT 'Managed Services SOW type created.';
END
GO

-- Project Implementation SOW
IF NOT EXISTS (SELECT 1 FROM dbo.SOWTypes WHERE Name = 'Project Implementation SOW')
BEGIN
    INSERT INTO dbo.SOWTypes (
        Id, Name, Description, Category,
        OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
        AIPromptOverview, AIPromptFindings, AIPromptRecommendations, AIPromptScope,
        DefaultHours, DefaultRate, SortOrder
    ) VALUES (
        NEWID(),
        'Project Implementation SOW',
        'Statement of Work for technology implementation projects including design, deployment, and knowledge transfer',
        'Projects',
        'This Statement of Work defines the implementation project for {customerName} in the {referenceArchitecture} practice area. The project will deliver a complete solution from design through deployment and validation.',
        'The project scope encompasses: solution design, configuration, testing, deployment, documentation, and knowledge transfer for the {referenceArchitecture} solution.',
        'Implementation follows a structured methodology: Discovery → Design → Build → Test → Deploy → Validate → Knowledge Transfer.',
        'Solution Design Document, Configuration Guides, Test Plan and Results, As-Built Documentation, Knowledge Transfer Sessions, and Project Closeout Report.',
        'Based on the requirements, we recommend a phased implementation approach with defined milestones, acceptance criteria, and risk mitigation strategies.',
        'Generate a professional executive summary for a technology implementation project SOW for {customerName} in {referenceArchitecture}. Highlight project objectives and expected outcomes.',
        'Analyze the implementation requirements and identify key phases, dependencies, risks, and success criteria for the project.',
        'Generate implementation recommendations including timeline, resource requirements, risk mitigation, and success criteria.',
        'Generate a comprehensive project scope including work breakdown structure, assumptions, constraints, and acceptance criteria.',
        80, 200.00, 2
    );
    PRINT 'Project Implementation SOW type created.';
END
GO

PRINT 'SOW Types migration complete.';
GO
