/**
 * Run database migration to fix assessment data
 * Swaps Reference Architectures and Assessment Types content
 */
import { getConnectionPool, executeQuery } from './src/config/database';

async function runMigration() {
  console.log('Starting assessment data fix migration...\n');

  try {
    const pool = await getConnectionPool();

    // Step 1: Delete existing mapping data
    console.log('1. Deleting assessment type architecture mappings...');
    await executeQuery('DELETE FROM dbo.AssessmentTypeArchitectures', {});
    console.log('   Done.\n');

    // Step 2: Clear and repopulate Reference Architectures (Practice Areas)
    console.log('2. Clearing existing reference architectures...');
    await executeQuery('DELETE FROM dbo.AssessmentReferenceArchitectures', {});
    console.log('   Done.\n');

    console.log('3. Inserting new reference architectures (Practice Areas)...');
    const refArchs = [
      { name: 'Data & AI', desc: 'Data management, analytics, artificial intelligence and machine learning solutions', cat: 'Technology', sort: 1 },
      { name: 'Enterprise Networking', desc: 'Network infrastructure, SD-WAN, connectivity, and network security', cat: 'Infrastructure', sort: 2 },
      { name: 'Security', desc: 'Cybersecurity, threat protection, identity management, and compliance', cat: 'Security', sort: 3 },
      { name: 'Collaboration', desc: 'Unified communications, teamwork platforms, and productivity tools', cat: 'Productivity', sort: 4 },
      { name: 'Contact Center', desc: 'Customer engagement, call center, and omnichannel communication solutions', cat: 'Customer Experience', sort: 5 },
      { name: 'Data Center', desc: 'Server infrastructure, virtualization, storage, and hybrid cloud environments', cat: 'Infrastructure', sort: 6 },
    ];

    for (const arch of refArchs) {
      await executeQuery(`
        INSERT INTO dbo.AssessmentReferenceArchitectures (Id, Name, Description, Category, SortOrder, CreatedAt, UpdatedAt)
        VALUES (NEWID(), @name, @desc, @cat, @sort, GETUTCDATE(), GETUTCDATE())
      `, { name: arch.name, desc: arch.desc, cat: arch.cat, sort: arch.sort });
      console.log(`   - Added: ${arch.name}`);
    }
    console.log('   Done.\n');

    // Step 3: Clear and repopulate Assessment Types (Technology Platforms)
    console.log('4. Clearing existing assessment types...');
    await executeQuery('DELETE FROM dbo.AssessmentTypes', {});
    console.log('   Done.\n');

    console.log('5. Inserting new assessment types (Technology Platforms)...');
    
    const assessmentTypes = [
      {
        name: 'Microsoft 365',
        desc: 'Microsoft 365 cloud productivity suite assessment including Exchange Online, SharePoint, Teams, and OneDrive',
        cat: 'Cloud',
        overview: "This Microsoft 365 Assessment provides a comprehensive evaluation of {customerName}'s Microsoft 365 environment within the {referenceArchitecture} practice area.",
        scope: 'The assessment covers: Exchange Online configuration, SharePoint architecture, Teams deployment, OneDrive policies, security settings, compliance configurations, and license optimization.',
        methodology: 'Our methodology follows Microsoft best practices and the Microsoft 365 Assessment framework.',
        deliverables: 'Executive Summary, Tenant Configuration Report, Security Posture Analysis, License Optimization Recommendations, and Adoption Roadmap.',
        recommendations: 'Based on our findings, we recommend a prioritized approach to optimize your Microsoft 365 investment.',
        hours: 16, rate: 175, sort: 1
      },
      {
        name: 'Azure Infrastructure',
        desc: 'Microsoft Azure cloud infrastructure assessment including VMs, networking, storage, and security services',
        cat: 'Cloud',
        overview: "This Azure Infrastructure Assessment evaluates {customerName}'s Azure environment within the {referenceArchitecture} domain.",
        scope: 'The assessment covers: virtual machines, Azure networking, storage accounts, Azure AD, security center, and cost management.',
        methodology: 'Our team utilizes Azure Well-Architected Framework and automated assessment tools.',
        deliverables: 'Azure Architecture Review, Cost Optimization Report, Security Assessment, and Performance Analysis.',
        recommendations: 'We recommend a prioritized approach to Azure optimization focusing on cost and security.',
        hours: 24, rate: 175, sort: 2
      },
      {
        name: 'On-Premises Active Directory',
        desc: 'Traditional Windows Server Active Directory Domain Services assessment including security and performance',
        cat: 'Identity',
        overview: "This Active Directory Assessment evaluates {customerName}'s on-premises AD infrastructure within the {referenceArchitecture} context.",
        scope: 'The assessment covers: domain controller health, AD replication, Group Policy, DNS configuration, and security hardening.',
        methodology: 'We utilize Microsoft best practices and specialized AD assessment tools.',
        deliverables: 'AD Health Report, Security Assessment, Group Policy Analysis, and Modernization Recommendations.',
        recommendations: 'We recommend addressing AD security and health issues in priority order.',
        hours: 16, rate: 175, sort: 3
      },
      {
        name: 'Hybrid Identity',
        desc: 'Azure AD Connect and hybrid identity synchronization assessment',
        cat: 'Identity',
        overview: "This Hybrid Identity Assessment evaluates {customerName}'s identity synchronization within the {referenceArchitecture} framework.",
        scope: 'The assessment covers: Azure AD Connect configuration, synchronization rules, password hash sync, and conditional access.',
        methodology: 'Our methodology follows Microsoft identity best practices.',
        deliverables: 'Hybrid Identity Architecture Report, Sync Configuration Review, and Migration Roadmap.',
        recommendations: 'Based on findings, we recommend optimizing your hybrid identity configuration.',
        hours: 20, rate: 175, sort: 4
      },
      {
        name: 'Network Infrastructure',
        desc: 'LAN/WAN networking assessment including switches, routers, firewalls, and wireless infrastructure',
        cat: 'Infrastructure',
        overview: "This Network Infrastructure Assessment evaluates {customerName}'s network environment within the {referenceArchitecture} practice area.",
        scope: 'The assessment covers: network topology, switching and routing, wireless infrastructure, firewall configuration, and SD-WAN.',
        methodology: 'We employ network discovery tools, traffic analysis, and configuration review.',
        deliverables: 'Network Topology Diagrams, Performance Analysis, Security Assessment, and Modernization Roadmap.',
        recommendations: 'We recommend network improvements prioritized by business impact and security risk.',
        hours: 16, rate: 175, sort: 5
      },
      {
        name: 'Endpoint Management',
        desc: 'Device management assessment with Intune, SCCM, or similar MDM/MAM solutions',
        cat: 'Management',
        overview: "This Endpoint Management Assessment evaluates {customerName}'s device management strategy within the {referenceArchitecture} domain.",
        scope: 'The assessment covers: MDM/MAM configuration, device compliance policies, application deployment, and security baselines.',
        methodology: 'Our methodology follows Microsoft endpoint management best practices.',
        deliverables: 'Endpoint Strategy Report, Compliance Analysis, and Modern Management Roadmap.',
        recommendations: 'We recommend a phased approach to modern endpoint management.',
        hours: 16, rate: 175, sort: 6
      },
      {
        name: 'Backup & Disaster Recovery',
        desc: 'Data protection, backup solutions, and business continuity assessment',
        cat: 'Data Protection',
        overview: "This Backup & DR Assessment evaluates {customerName}'s data protection strategy within the {referenceArchitecture} practice area.",
        scope: 'The assessment covers: backup policies, recovery objectives (RPO/RTO), disaster recovery plans, and compliance requirements.',
        methodology: 'Our methodology assesses backup and DR capabilities against industry best practices.',
        deliverables: 'Backup Strategy Report, DR Readiness Assessment, and Business Continuity Roadmap.',
        recommendations: 'We recommend a comprehensive approach to data protection addressing identified gaps.',
        hours: 20, rate: 175, sort: 7
      },
      {
        name: 'Security & Compliance',
        desc: 'Security posture and compliance framework assessment',
        cat: 'Security',
        overview: "This Security & Compliance Assessment evaluates {customerName}'s security posture within the {referenceArchitecture} domain.",
        scope: 'The assessment covers: security policies, access controls, threat protection, and compliance frameworks.',
        methodology: 'Our methodology follows industry frameworks including NIST CSF and CIS Controls.',
        deliverables: 'Security Posture Report, Compliance Gap Analysis, and Remediation Roadmap.',
        recommendations: 'Based on findings, we recommend a prioritized approach to address security gaps.',
        hours: 32, rate: 175, sort: 8
      }
    ];

    for (const type of assessmentTypes) {
      await executeQuery(`
        INSERT INTO dbo.AssessmentTypes (
          Id, Name, Description, Category,
          OverviewTemplate, ScopeTemplate, MethodologyTemplate, DeliverablesTemplate, RecommendationsTemplate,
          DefaultHours, DefaultRate, SortOrder, IsActive, CreatedAt, UpdatedAt
        )
        VALUES (
          NEWID(), @name, @desc, @cat,
          @overview, @scope, @methodology, @deliverables, @recommendations,
          @hours, @rate, @sort, 1, GETUTCDATE(), GETUTCDATE()
        )
      `, {
        name: type.name,
        desc: type.desc,
        cat: type.cat,
        overview: type.overview,
        scope: type.scope,
        methodology: type.methodology,
        deliverables: type.deliverables,
        recommendations: type.recommendations,
        hours: type.hours,
        rate: type.rate,
        sort: type.sort
      });
      console.log(`   - Added: ${type.name}`);
    }
    console.log('   Done.\n');

    // Verify
    console.log('6. Verifying data...\n');
    const refArchResult = await executeQuery('SELECT Name FROM dbo.AssessmentReferenceArchitectures ORDER BY SortOrder', {});
    console.log('Reference Architectures (Practice Areas):');
    refArchResult.forEach((r: any) => console.log(`   - ${r.Name}`));

    const typesResult = await executeQuery('SELECT Name FROM dbo.AssessmentTypes ORDER BY SortOrder', {});
    console.log('\nAssessment Types (Technology Platforms):');
    typesResult.forEach((t: any) => console.log(`   - ${t.Name}`));

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
