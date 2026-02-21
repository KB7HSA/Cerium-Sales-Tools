/*
  Migration: Fix Assessment Data - Swap Reference Architectures and Assessment Types
  Date: 2026-02-20
  Description: Updates existing data to match the new structure where:
               - Reference Architectures = Practice Areas (Data & AI, Enterprise Networking, etc.)
               - Assessment Types = Technology Platforms (Microsoft 365, Azure, AD, etc.)
*/

USE CeriumSalesTools;
GO

-- ================================================================
-- STEP 1: Delete existing mapping data
-- ================================================================

PRINT 'Deleting assessment type architecture mappings...';
DELETE FROM dbo.AssessmentTypeArchitectures;
GO

-- ================================================================
-- STEP 2: Clear and repopulate Reference Architectures (Practice Areas)
-- ================================================================

PRINT 'Clearing existing reference architectures...';
DELETE FROM dbo.AssessmentReferenceArchitectures;
GO

PRINT 'Inserting new reference architectures (Practice Areas)...';
INSERT INTO dbo.AssessmentReferenceArchitectures (Id, Name, Description, Category, SortOrder) VALUES
(NEWID(), 'Data & AI', 'Data management, analytics, artificial intelligence and machine learning solutions', 'Technology', 1),
(NEWID(), 'Enterprise Networking', 'Network infrastructure, SD-WAN, connectivity, and network security', 'Infrastructure', 2),
(NEWID(), 'Security', 'Cybersecurity, threat protection, identity management, and compliance', 'Security', 3),
(NEWID(), 'Collaboration', 'Unified communications, teamwork platforms, and productivity tools', 'Productivity', 4),
(NEWID(), 'Contact Center', 'Customer engagement, call center, and omnichannel communication solutions', 'Customer Experience', 5),
(NEWID(), 'Data Center', 'Server infrastructure, virtualization, storage, and hybrid cloud environments', 'Infrastructure', 6);
GO

-- ================================================================
-- STEP 3: Clear and repopulate Assessment Types (Technology Platforms)
-- ================================================================

PRINT 'Clearing existing assessment types...';
DELETE FROM dbo.AssessmentTypes;
GO

PRINT 'Inserting new assessment types (Technology Platforms)...';

-- Microsoft 365
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
GO

-- Azure Infrastructure
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
GO

-- On-Premises Active Directory
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
GO

-- Hybrid Identity
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
GO

-- Network Infrastructure
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
GO

-- Endpoint Management
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
GO

-- Backup & Disaster Recovery
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
GO

-- Security & Compliance
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
GO

PRINT 'Assessment data fix complete!';
PRINT '';
PRINT 'Reference Architectures (Practice Areas):';
SELECT Name FROM dbo.AssessmentReferenceArchitectures ORDER BY SortOrder;
PRINT '';
PRINT 'Assessment Types (Technology Platforms):';
SELECT Name FROM dbo.AssessmentTypes ORDER BY SortOrder;
GO
