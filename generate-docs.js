/**
 * Cerium Sales Tools — Operating Documentation Generator
 * Generates a professionally formatted DOCX file.
 * Run: node generate-docs.js
 */
const docx = require('docx');
const fs = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, TableBorders, ImageRun,
  PageBreak, TabStopPosition, TabStopType, Header, Footer,
  PageNumber, NumberFormat, convertInchesToTwip,
  TableOfContents, StyleLevel, SectionType,
} = docx;

// ── Colors & Styles ──
const BRAND_BLUE = '1E40AF';
const BRAND_DARK = '1F2937';
const LIGHT_GRAY = 'F3F4F6';
const MED_GRAY = 'E5E7EB';
const WHITE = 'FFFFFF';

// ── Helper: Screenshot placeholder ──
function screenshotPlaceholder(caption) {
  return [
    new Paragraph({
      spacing: { before: 200, after: 60 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: MED_GRAY },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: MED_GRAY },
        left: { style: BorderStyle.SINGLE, size: 1, color: MED_GRAY },
        right: { style: BorderStyle.SINGLE, size: 1, color: MED_GRAY },
      },
      shading: { type: ShadingType.CLEAR, fill: LIGHT_GRAY },
      children: [
        new TextRun({ text: '\n', break: 1 }),
        new TextRun({ text: '[ INSERT SCREENSHOT HERE ]', bold: true, color: '6B7280', size: 22 }),
        new TextRun({ text: '\n', break: 1 }),
        new TextRun({ text: '\n', break: 1 }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Figure: ${caption}`, italics: true, color: '6B7280', size: 18 }),
      ],
    }),
  ];
}

// ── Helper: Section heading ──
function sectionHeading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { before: 360, after: 120 } });
}

function subHeading(text) {
  return sectionHeading(text, HeadingLevel.HEADING_2);
}

function subSubHeading(text) {
  return sectionHeading(text, HeadingLevel.HEADING_3);
}

// ── Helper: Body paragraph ──
function bodyPara(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, ...opts })],
  });
}

// ── Helper: Bullet item ──
function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22 })],
  });
}

// ── Helper: Note/Tip box ──
function noteBox(label, text) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 6, color: BRAND_BLUE },
    },
    indent: { left: convertInchesToTwip(0.15) },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22, color: BRAND_BLUE }),
      new TextRun({ text, size: 22 }),
    ],
  });
}

// ── Helper: Simple table ──
function simpleTable(headers, rows) {
  const headerCells = headers.map(h => new TableCell({
    shading: { type: ShadingType.CLEAR, fill: BRAND_BLUE },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20 })],
    })],
    width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
  }));

  const dataRows = rows.map(row =>
    new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: String(cell), size: 20 })],
          spacing: { after: 40 },
        })],
        width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
      })),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
  });
}

// ── Helper: Page break ──
function pgBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ══════════════════════════════════════════════════════════════════════
//  BUILD DOCUMENT
// ══════════════════════════════════════════════════════════════════════

const children = [];

// ── TITLE PAGE ──
children.push(
  new Paragraph({ spacing: { before: 3000 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'Cerium Sales Tools', bold: true, size: 56, color: BRAND_BLUE })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: 'Operating Documentation', size: 36, color: BRAND_DARK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: `Version 1.0  •  ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, size: 24, color: '6B7280' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'CONFIDENTIAL — For Internal Use Only', bold: true, size: 22, color: 'DC2626' })],
  }),
  pgBreak(),
);

// ── TABLE OF CONTENTS ──
children.push(
  sectionHeading('Table of Contents'),
  new TableOfContents('Table of Contents', {
    hyperlink: true,
    headingStyleRange: '1-3',
  }),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  1. INTRODUCTION
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('1. Introduction'),
  bodyPara('Cerium Sales Tools is a web-based enterprise application designed to streamline the sales engineering workflow at Cerium Networks. It provides integrated tools for labor budgeting, quote management, document generation, E-Rate opportunity tracking, Cisco renewal analysis, and managed service provider (MSP) quoting—all secured with Microsoft 365 single sign-on (SSO) and role-based access control (RBAC).'),
  subHeading('1.1 Purpose of This Document'),
  bodyPara('This document provides comprehensive operational guidance for all users of the Cerium Sales Tools platform. It covers navigation, key features, administrative functions, and common workflows.'),
  subHeading('1.2 Audience'),
  bullet('Sales Engineers — primary users of quoting, labor budgeting, SOW/assessment generation, and renewal analysis'),
  bullet('Sales Managers — quote approval, reporting, and team oversight'),
  bullet('System Administrators — user management, configuration, and application settings'),
  bullet('Executive Leadership — high-level dashboards and analytics'),
  subHeading('1.3 System Requirements'),
  bullet('Modern web browser (Chrome, Edge, Firefox, Safari — latest versions)'),
  bullet('Microsoft 365 account with organization credentials'),
  bullet('Network access to the application URL and Azure AD authentication endpoints'),
  subHeading('1.4 Technology Stack'),
  simpleTable(
    ['Layer', 'Technology'],
    [
      ['Frontend', 'Angular 21, Tailwind CSS'],
      ['Backend', 'Node.js / Express, TypeScript'],
      ['Database', 'Microsoft SQL Server (Azure SQL)'],
      ['Authentication', 'Azure Active Directory / MSAL v5'],
      ['AI Engine', 'Azure OpenAI (GPT-4o)'],
      ['Document Generation', 'docxtemplater (DOCX), XLSX (Excel)'],
      ['External Data', 'USAC SODA API (E-Rate)'],
    ]
  ),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  2. GETTING STARTED
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('2. Getting Started'),
  subHeading('2.1 Signing In'),
  bodyPara('Cerium Sales Tools uses Microsoft 365 Single Sign-On exclusively. There are no local usernames or passwords.'),
  subSubHeading('Sign-In Process'),
  bullet('Navigate to the application URL in your web browser.'),
  bullet('Click the "Sign in with Microsoft 365" button on the login page.'),
  bullet('You will be redirected to the Microsoft login page (or a popup will appear).'),
  bullet('Enter your organization Microsoft 365 credentials.'),
  bullet('After successful authentication, you will be redirected to the main dashboard.'),
  ...screenshotPlaceholder('Sign-In Page with Microsoft 365 SSO Button'),
  noteBox('Note', 'First-time users will be assigned a "Pending" role and will have no access to application modules until a Super Admin approves their account and assigns an appropriate role.'),
  subHeading('2.2 Understanding Your Role'),
  bodyPara('Access to features is controlled by your assigned role. Contact your administrator if you need elevated access.'),
  simpleTable(
    ['Role', 'Access Level', 'Description'],
    [
      ['Super Admin', 'Full Access', 'Complete control of all features, admin settings, user management, and configuration'],
      ['Manager', 'Extended Access', 'View, create, edit, and manage modules; approve/deny quotes; access admin-level module features'],
      ['User', 'Standard Access', 'View, create, and edit data across all modules; cannot access admin pages or delete records'],
      ['Read Only', 'View Only', 'Browse all modules and data but cannot create, edit, or delete anything'],
      ['Pending', 'No Access', 'Newly registered users awaiting Super Admin approval; cannot see any modules'],
    ]
  ),
  subHeading('2.3 Navigation Overview'),
  bodyPara('The application uses a collapsible sidebar for primary navigation. The sidebar organizes features into logical groups:'),
  bullet('Dashboard — Key metrics and analytics'),
  bullet('MSP Services — Managed service provider tools and quoting'),
  bullet('Labor Budget — Cost estimation calculator and guided wizard'),
  bullet('Quote Management — Central hub for all quote types'),
  bullet('SOW Documents — AI-powered Statement of Work generation'),
  bullet('Assessments — AI-powered technology assessment generation'),
  bullet('E-Rate — USAC opportunity and FRN tracking'),
  bullet('Cisco Renewals — Hardware and software renewal analysis'),
  bullet('Admin — System configuration (Super Admin only)'),
  ...screenshotPlaceholder('Main Application Layout with Sidebar Navigation'),
  noteBox('Tip', 'The sidebar can be collapsed by clicking the toggle icon at the top. On mobile devices, use the hamburger menu to open the sidebar.'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  3. DASHBOARD
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('3. Dashboard'),
  bodyPara('The Tech Sales Dashboard provides a real-time overview of key business metrics. It is the default landing page after sign-in.'),
  subHeading('3.1 Metrics Cards'),
  bodyPara('The top row displays summary counts for:'),
  bullet('Total Customers — Number of customer records in the system'),
  bullet('Total Quotes — Number of quotes created across all types'),
  bullet('SOW Documents — Number of Statements of Work generated'),
  ...screenshotPlaceholder('Dashboard Metrics Cards'),
  subHeading('3.2 Charts and Trends'),
  bodyPara('The dashboard includes several interactive charts powered by ApexCharts:'),
  bullet('Quotes by Day — 30-day area chart showing daily quote creation trends. Includes a date range picker.'),
  bullet('Quotes by Month — Bar chart with dual axes showing monthly quote count and total cost for the current year.'),
  bullet('SOW Documents by Day — 30-day trend chart for SOW generation activity.'),
  bullet('Assessments by Day — 30-day trend chart for assessment generation activity.'),
  bullet('Monthly Target — Radial gauge showing progress toward monthly goals.'),
  ...screenshotPlaceholder('Dashboard Charts — Quotes by Day and Quotes by Month'),
  ...screenshotPlaceholder('Dashboard Charts — SOW and Assessment Trends'),
  noteBox('Note', 'All dashboard data refreshes automatically when the page loads. Charts pull from the GET /api/dashboard/stats endpoint.'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  4. MSP SERVICES
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('4. MSP Services'),
  bodyPara('The MSP (Managed Service Provider) Services module provides tools for browsing service offerings, creating MSP quotes, and monitoring managed infrastructure.'),
  subHeading('4.1 MSP Dashboard'),
  bodyPara('The MSP Dashboard provides a summary of all MSP-type quotes organized by approval status (Approved, Pending, Denied). It shows total counts, monthly recurring revenue, and add-on breakdowns per quote.'),
  ...screenshotPlaceholder('MSP Dashboard — Quote Status Summary'),
  subHeading('4.2 Services Overview'),
  bodyPara('Displays the complete catalog of active MSP offerings organized by category:'),
  bullet('Backup & Recovery — Data protection and disaster recovery services'),
  bullet('Support Services — Technical support tiers and SLAs'),
  bullet('Database Management — Database administration and monitoring'),
  bullet('Consulting — Strategic IT consulting services'),
  bodyPara('Each offering card displays:'),
  bullet('Service name and description'),
  bullet('Available service levels (e.g., Basic, Standard, Premium)'),
  bullet('Per-unit pricing including base price and professional services'),
  bullet('Pricing unit (per user/month, per device/month, etc.)'),
  ...screenshotPlaceholder('Services Overview — Offering Catalog with Service Levels'),
  subHeading('4.3 MSP Quote Builder'),
  bodyPara('The quote builder allows users to create MSP service quotes for customers:'),
  subSubHeading('Creating an MSP Quote'),
  bullet('Step 1: Select a customer from the dropdown'),
  bullet('Step 2: Choose an MSP service offering'),
  bullet('Step 3: Select a service level (Basic, Standard, Premium, etc.)'),
  bullet('Step 4: Choose any add-on options'),
  bullet('Step 5: Set quantity and duration in months'),
  bullet('Step 6: Review pricing — setup fees, monthly cost, and total'),
  bullet('Step 7: Click "Create Quote" to save'),
  ...screenshotPlaceholder('MSP Quote Builder — Service Selection and Pricing'),
  noteBox('Tip', 'A 10% annual discount is automatically applied when the quote duration is 12 months or longer.'),
  subHeading('4.4 Managed Servers'),
  bodyPara('The Managed Servers page displays a monitoring dashboard showing server health metrics including CPU utilization, memory usage, storage capacity, uptime, and last backup timestamp.'),
  ...screenshotPlaceholder('Managed Servers — Server Health Dashboard'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  5. LABOR BUDGET
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('5. Labor Budget'),
  bodyPara('The Labor Budget module is a powerful cost estimation system for professional services engagements. It supports multi-solution budgets with catalog-driven work items, overhead and contingency calculations, and pre-built solution blueprints.'),
  subHeading('5.1 Key Concepts'),
  simpleTable(
    ['Concept', 'Description'],
    [
      ['Solution', 'An independent cost group within a budget. Each solution has its own work items, overhead %, and contingency %.'],
      ['Work Item', 'A line item from the labor catalog with quantity, hours per unit, and hourly rate.'],
      ['Blueprint', 'A pre-built template that populates a solution with grouped work items, PM settings, and adoption settings.'],
      ['Group', 'Work items within a solution organized by logical groupings (e.g., "Network Design", "Implementation").'],
      ['Section', 'A catalog-level category applied to work items (e.g., "Network Engineering", "Security").'],
      ['Reference Architecture', 'A Cisco practice area tag (Enterprise Networking, Data Center, Security, Collaboration, Contact Center).'],
    ]
  ),
  subHeading('5.2 Labor Budget Calculator'),
  bodyPara('The calculator is the primary tool for building detailed labor budgets:'),
  subSubHeading('Adding Work Items'),
  bullet('Click "Add Item" to open the labor catalog dialog'),
  bullet('Filter by section, reference architecture, or search by name'),
  bullet('Select items and they will be added to the active solution'),
  bullet('Adjust quantity, hours per unit, and hourly rate for each item'),
  ...screenshotPlaceholder('Labor Budget Calculator — Main View with Solutions'),
  subSubHeading('Using Blueprints'),
  bullet('Click "Load Blueprint" to browse available solution blueprints'),
  bullet('Filter blueprints by reference architecture'),
  bullet('Select a blueprint to auto-populate work items with pre-configured quantities and rates'),
  ...screenshotPlaceholder('Labor Budget Calculator — Blueprint Selection Dialog'),
  subSubHeading('Cost Calculations'),
  bodyPara('The calculator computes costs using the following formula:'),
  bullet('Line Cost = Quantity × Hours Per Unit × Rate Per Hour'),
  bullet('Solution Subtotal = Sum of all Line Costs'),
  bullet('Overhead = Solution Subtotal × Overhead %'),
  bullet('Contingency = Solution Subtotal × Contingency %'),
  bullet('Solution Total = Solution Subtotal + Overhead + Contingency'),
  bullet('Grand Total = Sum of all Solution Totals'),
  subSubHeading('Creating a Quote from the Budget'),
  bullet('Click "Create Quote" after building your budget'),
  bullet('Select the customer and enter any notes'),
  bullet('The quote is saved as a "labor" type quote with all work items and groups'),
  ...screenshotPlaceholder('Labor Budget Calculator — Quote Creation Dialog'),
  subHeading('5.3 Labor Budget Wizard'),
  bodyPara('The wizard provides a guided 6-step process for building a labor budget:'),
  simpleTable(
    ['Step', 'Name', 'Description'],
    [
      ['1', 'Customer', 'Select the customer from the dropdown'],
      ['2', 'Solutions', 'Add and name solutions; optionally load a blueprint'],
      ['3', 'Work Items', 'Add items from the catalog, set quantities and rates'],
      ['4', 'Project Management', 'Configure PM percentage, hours, and rate'],
      ['5', 'Adoption', 'Configure adoption hours and rate'],
      ['6', 'Review', 'Review grand total = labor + PM + adoption; send to calculator'],
    ]
  ),
  ...screenshotPlaceholder('Labor Budget Wizard — Step-by-Step Interface'),
  noteBox('Tip', 'The wizard can hand off the completed budget to the full calculator for further refinement by clicking "Send to Calculator" on the Review step.'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  6. QUOTE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('6. Quote Management'),
  bodyPara('The Quote Management page is the central hub for viewing, editing, approving, and exporting all quote types (MSP and Labor).'),
  subHeading('6.1 Viewing Quotes'),
  bullet('Use the tab bar to filter by status: All, Pending, Approved, Denied'),
  bullet('Click any quote row to expand and see detailed information'),
  bullet('Labor quotes display grouped work items with section breakdowns and subtotals'),
  bullet('MSP quotes show service details, add-ons, and pricing tiers'),
  ...screenshotPlaceholder('Quote Management — Quote List with Status Tabs'),
  subHeading('6.2 Editing Quotes'),
  bodyPara('Pending quotes can be edited inline:'),
  bullet('Click the edit icon on a pending quote row'),
  bullet('Modify quantity, duration, hourly rate, or notes'),
  bullet('Click "Save" to update the quote'),
  subHeading('6.3 Approving and Denying Quotes'),
  bullet('Click the "Approve" button (green checkmark) to approve a pending quote'),
  bullet('Click the "Deny" button (red X) to deny a pending quote'),
  bullet('Status changes are immediate and reflected in the tab counts'),
  noteBox('Note', 'Only users with Manager or Admin roles can approve or deny quotes.'),
  subHeading('6.4 Exporting Quotes'),
  bodyPara('Quotes can be exported to CSV using configurable export schemas:'),
  bullet('Click the "Export" button on any quote'),
  bullet('The export uses the default schema for that quote type (MSP or Labor)'),
  bullet('Export schemas can be customized in Admin → Export Schemas'),
  subHeading('6.5 Generating a SOW from a Quote'),
  bodyPara('Approved labor quotes can be sent directly to the SOW Generator:'),
  bullet('Click the "Generate SOW" button on an approved labor quote'),
  bullet('The SOW Generator will open pre-populated with customer name, total hours, hourly rate, and total price'),
  ...screenshotPlaceholder('Quote Management — Expanded Quote Detail with Action Buttons'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  7. SOW GENERATOR
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('7. SOW Document Generator'),
  bodyPara('The SOW (Statement of Work) Generator creates professional DOCX documents using AI-powered content generation and customizable templates.'),
  subHeading('7.1 Generate Tab'),
  subSubHeading('Step 1: Configure the SOW'),
  bullet('Select a Practice Area (Reference Architecture) — filters available SOW types'),
  bullet('Select a SOW Type — determines the template, content sections, and AI prompts'),
  bullet('Select the Customer'),
  bullet('The Title auto-generates based on your selections but can be edited'),
  ...screenshotPlaceholder('SOW Generator — Configuration Form'),
  subSubHeading('Step 2: AI Content Generation'),
  bodyPara('Four AI-powered sections can be individually enabled or disabled:'),
  simpleTable(
    ['Section', 'Description'],
    [
      ['Executive Overview', 'High-level project summary and business justification'],
      ['Key Findings', 'Discovery findings and current state analysis'],
      ['Recommendations', 'Proposed solutions and architecture recommendations'],
      ['Scope of Work', 'Detailed scope, deliverables, and exclusions'],
    ]
  ),
  bullet('Toggle each section on/off using the switch controls'),
  bullet('Click "Generate Document" to produce all enabled AI sections in parallel'),
  bullet('Technical reference files from the SOW type\'s resource folder are injected as AI context'),
  ...screenshotPlaceholder('SOW Generator — AI Section Toggles and Generation Controls'),
  subSubHeading('Step 3: Review and Download'),
  bullet('Review the generated content in the preview panel'),
  bullet('Use the "Professional Review" button to get an AI quality assessment (rating, suggestions)'),
  bullet('Click "Download DOCX" to download the final document'),
  ...screenshotPlaceholder('SOW Generator — Generated Document Preview'),
  subSubHeading('Content Sections'),
  bodyPara('SOW types can define custom content sections. Each section has:'),
  bullet('Name — Section title in the document'),
  bullet('Type — text, image, or template tag'),
  bullet('Content — Default text or markdown content'),
  bullet('Image — Optional image to embed in the document'),
  bullet('Template Tag — Maps to a placeholder in the DOCX template'),
  subHeading('7.2 History Tab'),
  bodyPara('The History tab shows all previously generated SOW documents:'),
  bullet('Search and filter by status: Draft, Generated, Sent, Completed, Archived'),
  bullet('Download any document as DOCX'),
  bullet('Change document status'),
  bullet('Delete documents (Manager/Admin only)'),
  ...screenshotPlaceholder('SOW Generator — History Tab with Status Filters'),
  subHeading('7.3 Debug Tools'),
  bodyPara('The debug panel (available when expanded) shows:'),
  bullet('System prompt — The full AI system prompt being used'),
  bullet('User prompt — The specific generation prompt for each section'),
  bullet('Token usage — Number of tokens used for generation'),
  noteBox('Tip', 'AI prompts are configured per SOW Type in Admin → SOW Types. Temperature and prompt templates can be customized.'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  8. ASSESSMENT GENERATOR
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('8. Assessment Generator'),
  bodyPara('The Assessment Generator creates AI-powered technology assessment documents. It follows the same workflow as the SOW Generator with assessment-specific templates and prompts.'),
  subHeading('8.1 Creating an Assessment'),
  bullet('Select a Practice Area (Reference Architecture)'),
  bullet('Select an Assessment Type — determines template and AI prompts'),
  bullet('Select the Customer'),
  bullet('Enable or disable AI sections: Overview, Findings, Recommendations, Scope'),
  bullet('Click "Generate Document" to create the assessment'),
  ...screenshotPlaceholder('Assessment Generator — Configuration and AI Section Toggles'),
  subHeading('8.2 AI-Powered Content'),
  bodyPara('Each section uses customizable AI prompts configured per Assessment Type:'),
  bullet('Overview Template — Sets the tone and structure for the executive overview'),
  bullet('Findings Prompt — Guides the AI to generate relevant discovery findings'),
  bullet('Recommendations Prompt — Shapes architecture and solution recommendations'),
  bullet('Scope Template — Defines scope, methodology, and deliverables'),
  subHeading('8.3 History and Downloads'),
  bodyPara('Generated assessments appear in the History tab with the same search, filter, download, and status management as SOW documents.'),
  ...screenshotPlaceholder('Assessment Generator — History Tab'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  9. E-RATE MODULE
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('9. E-Rate Module'),
  bodyPara('The E-Rate module provides tools for tracking USAC (Universal Service Administrative Company) E-Rate opportunities, including Form 470 applications and Funding Request Numbers (FRNs).'),
  subHeading('9.1 E-Rate Dashboard'),
  bodyPara('The dashboard provides a visual summary of the E-Rate landscape:'),
  bullet('Stats Cards — Total opportunities, states covered, manufacturers, new records from latest refresh'),
  bullet('Opportunities by State — Bar chart showing opportunity count per state'),
  bullet('Opportunities by Manufacturer — Horizontal bar chart with percentage breakdown'),
  bullet('Funding Year filter dropdown'),
  ...screenshotPlaceholder('E-Rate Dashboard — Stats and Charts'),
  subHeading('9.2 E-Rate Opportunities (Form 470)'),
  bodyPara('Browse and manage USAC Form 470 data for target states:'),
  subSubHeading('Downloading Data'),
  bullet('Click "Download Updates" to fetch the latest Form 470 data from the USAC SODA API'),
  bullet('The system fetches data for configured states (default: ID, WA, OR, MT, AK) and funding year'),
  bullet('New records are highlighted with a blue background'),
  ...screenshotPlaceholder('E-Rate Opportunities — Data Table with New Record Highlighting'),
  subSubHeading('Filtering and Searching'),
  bullet('Text search across all fields'),
  bullet('Filter by State, Service Type, User Status'),
  bullet('Column-level checkbox filters for State and Service Type'),
  bullet('"Show New Only" toggle to see only records from the latest refresh'),
  subSubHeading('User Status Assignment'),
  bodyPara('Each opportunity can be assigned a tracking status:'),
  simpleTable(
    ['Status', 'Description'],
    [
      ['In Process', 'Actively working on this opportunity'],
      ['Reviewing', 'Under review by the team'],
      ['Responded', 'Response has been submitted'],
      ['Bypassed', 'Intentionally skipped'],
      ['Not Interested', 'Not pursuing this opportunity'],
    ]
  ),
  subHeading('9.3 FRN Status Tracking'),
  bodyPara('Track Funding Request Numbers with detailed status information:'),
  bullet('Download FRN data with real-time SSE progress (two-phase: fetching → processing)'),
  bullet('Filter by funding year, state, FRN status, and user status'),
  bullet('Assign user tracking status to each FRN'),
  ...screenshotPlaceholder('FRN Status — Download Progress and Data Table'),
  subHeading('9.4 FRN Dashboard'),
  bodyPara('Service provider analysis of FRN data:'),
  bullet('Stats: Total FRNs, Total Funding ($), Service Providers, Funding Years'),
  bullet('Expandable table of service providers with per-year funding breakdown'),
  bullet('Service type filter and average discount percentage'),
  ...screenshotPlaceholder('FRN Dashboard — Service Provider Analysis'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  10. CISCO RENEWALS
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('10. Cisco Renewals'),
  bodyPara('The Cisco Renewals module provides comprehensive hardware and software renewal tracking with AI-powered strategic analysis.'),
  subHeading('10.1 Renewals Summary'),
  bodyPara('The summary page combines hardware and software renewal data with AI analytics:'),
  subSubHeading('Customer View'),
  bullet('Select a customer from the dropdown to view their renewal portfolio'),
  bullet('Hardware summary: item count, quantity, opportunity value, architectures, product families'),
  bullet('Software summary: item count, quantity, opportunity value, list price, offer types'),
  bullet('Architecture breakdowns for both hardware and software'),
  ...screenshotPlaceholder('Cisco Renewals Summary — Customer Renewal Portfolio'),
  subSubHeading('EOL Timeline'),
  bodyPara('End-of-Life timeline buckets help prioritize renewal urgency:'),
  bullet('Already Expired — Immediate action required'),
  bullet('Within 6 Months — Urgent renewal candidates'),
  bullet('6–12 Months — Near-term planning'),
  bullet('1–2 Years — Medium-term pipeline'),
  bullet('2+ Years — Long-term planning'),
  subSubHeading('AI Strategic Analysis'),
  bullet('Click "Generate AI Analysis" to receive comprehensive renewal strategy recommendations'),
  bullet('AI generates a markdown report analyzing the customer\'s renewal portfolio'),
  bullet('Shows token usage and model information'),
  bullet('Debug panel reveals the system and user prompts'),
  ...screenshotPlaceholder('Cisco Renewals Summary — AI Analysis Output'),
  subSubHeading('Export Options'),
  bullet('Export to Excel (XLSX) — Full data export with formatting'),
  bullet('Export to Markdown (.md) — AI analysis with data tables'),
  bullet('Export to DOCX — Professional document format'),
  subHeading('10.2 Hardware Renewals'),
  bodyPara('Detailed browser for individual hardware renewal line items:'),
  bullet('Filters: Search, architecture, customer, product family, LDOS date range, user status'),
  bullet('Views: Table view or customer summary view'),
  bullet('Summary cards: Total customers, items, quantity, and opportunity value'),
  bullet('Sortable columns with pagination (10/25/50/100 per page)'),
  bullet('Per-item user status assignment with configurable status labels'),
  bullet('Export to Excel'),
  ...screenshotPlaceholder('Hardware Renewals — Filtered Table View'),
  subHeading('10.3 Software Renewals'),
  bodyPara('Detailed browser for software renewal line items with additional fields:'),
  bullet('Total list price, subscription ID, and contract number columns'),
  bullet('Filters: Search, architecture, customer, offer type, contract status, end date range'),
  bullet('Same pagination, sorting, status assignment, and export features as hardware'),
  ...screenshotPlaceholder('Software Renewals — Table View with Additional Fields'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  11. ADMIN — USER & ROLE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('11. Administration'),
  bodyPara('The Admin section is restricted to Super Admin users. It provides configuration and management tools for the entire application.'),
  noteBox('Important', 'All Admin pages are protected by the Super Admin guard. Only users with the "admin" role can access these pages.'),
  subHeading('11.1 User Management'),
  bodyPara('Manage user accounts and role assignments:'),
  bullet('View all registered users with search and role/status filters'),
  bullet('See each user\'s current role, status, department, and module permissions'),
  bullet('Change a user\'s role (admin, manager, user, readonly, pending)'),
  bullet('Assign module-level permissions'),
  ...screenshotPlaceholder('Admin — User Management List'),
  ...screenshotPlaceholder('Admin — User Role and Permission Editor'),
  subHeading('11.2 Customer Management'),
  bodyPara('Full CRUD management for customer records:'),
  bullet('Add new customers with name, company, email, phone, and status'),
  bullet('Inline editing — click any field to edit directly in the table'),
  bullet('Toggle customer active/inactive status'),
  bullet('Delete customers (requires confirmation)'),
  ...screenshotPlaceholder('Admin — Customer Management'),
  subHeading('11.3 MSP Offerings'),
  bodyPara('Configure the MSP service catalog:'),
  bullet('Create offerings with category, description, and pricing'),
  bullet('Define service levels (e.g., Basic, Standard, Premium) with per-level pricing'),
  bullet('Add optional add-on services'),
  bullet('Toggle offerings active/inactive'),
  bullet('Delete offerings'),
  ...screenshotPlaceholder('Admin — MSP Offerings Management'),
  subHeading('11.4 Labor Budget Admin'),
  bodyPara('Three management sections for the labor budget system:'),
  subSubHeading('Catalog Items'),
  bullet('Add, edit, and delete labor catalog items'),
  bullet('Fields: Name, hours, rate, unit price, section, unit of measure, reference architecture, description, tooltip'),
  subSubHeading('Sections'),
  bullet('Manage section groupings for organizing catalog items'),
  subSubHeading('Solution Blueprints'),
  bullet('Create and edit pre-built solution templates'),
  bullet('Configure blueprint items with quantities and rates'),
  bullet('Set default overhead %, contingency %, PM settings, and adoption settings'),
  bullet('Tag blueprints with a reference architecture'),
  ...screenshotPlaceholder('Admin — Labor Budget Catalog Management'),
  ...screenshotPlaceholder('Admin — Solution Blueprint Editor'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  12. ADMIN — APPLICATION CONFIGURATION
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('12. Application Configuration'),
  subHeading('12.1 Assessment Types'),
  bodyPara('Configure the types of assessments available in the Assessment Generator:'),
  bullet('Name, description, and linked reference architectures'),
  bullet('Template file name — the DOCX template used for generation'),
  bullet('Resource folder — technical reference files for AI context injection'),
  bullet('AI prompts: Overview, Findings, Recommendations, Scope templates'),
  bullet('AI Temperature — Controls creativity vs. precision (0.0–1.0)'),
  bullet('Default hours and rate for assessment pricing'),
  bullet('Active/inactive toggle and sort order'),
  ...screenshotPlaceholder('Admin — Assessment Type Configuration'),
  subHeading('12.2 SOW Types'),
  bodyPara('Configure Statement of Work types with content sections:'),
  bullet('Same fields as Assessment Types plus Category and Content Sections'),
  bullet('Content Sections are a JSON array defining document sections'),
  bullet('Each section has: name, type (text/image/template tag), content, image file, template tag, and enabledByDefault flag'),
  ...screenshotPlaceholder('Admin — SOW Type with Content Sections'),
  subHeading('12.3 Export Schemas'),
  bodyPara('Configure CSV export column layouts for quotes:'),
  bullet('Create schemas per quote type (MSP or Labor)'),
  bullet('Define columns: source field, export header, display order, format type'),
  bullet('Toggle columns on/off'),
  bullet('Drag-and-drop reorder'),
  bullet('Clone schemas to create variants'),
  bullet('Set a default schema per quote type'),
  ...screenshotPlaceholder('Admin — Export Schema Configuration'),
  subHeading('12.4 Admin Settings'),
  bodyPara('General application configuration:'),
  subSubHeading('Pricing Units'),
  bullet('Configure available pricing units for MSP offerings (per user/month, per device/month, etc.)'),
  bullet('Enable or disable specific units'),
  bullet('Reset to defaults'),
  subSubHeading('Labor Units'),
  bullet('Manage unit of measure values for labor catalog items'),
  bullet('Add, delete, or reset to defaults'),
  ...screenshotPlaceholder('Admin — Settings Page'),
  subHeading('12.5 E-Rate Settings'),
  bodyPara('Configure E-Rate module behavior:'),
  bullet('SODA API URL — the USAC data endpoint'),
  bullet('Target States — comma-separated state abbreviations to fetch'),
  bullet('Funding Year — the target E-Rate funding year'),
  bullet('Status Codes — configurable status labels with colors and sort order for opportunity tracking'),
  ...screenshotPlaceholder('Admin — E-Rate Settings and Status Codes'),
  subHeading('12.6 Menu Admin'),
  bodyPara('Control sidebar menu visibility and ordering:'),
  bullet('Toggle show/hide for any menu item'),
  bullet('Reorder items up or down'),
  bullet('Protected items (e.g., Admin, Users) cannot be hidden'),
  bullet('"Run Migration" button to seed or update the menu configuration'),
  ...screenshotPlaceholder('Admin — Menu Configuration'),
  subHeading('12.7 Renewal Statuses'),
  bodyPara('Configure the status labels used for Cisco renewal tracking:'),
  bullet('Separate configurations for Hardware and Software renewal types'),
  bullet('Each status has a name, color (green, blue, yellow, red, gray, purple), and sort order'),
  bullet('Add, remove, and reorder statuses'),
  ...screenshotPlaceholder('Admin — Renewal Status Configuration'),
  subHeading('12.8 Renewals AI Admin'),
  bodyPara('Customize the AI system prompt used for Cisco renewal analysis:'),
  bullet('Edit the system prompt text that guides the AI Cisco Solutions Architect persona'),
  bullet('Adjust temperature and max token settings'),
  bullet('Save changes or reset to the default prompt'),
  bullet('View AI service status and model information'),
  ...screenshotPlaceholder('Admin — Renewals AI Prompt Configuration'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  13. COMMON WORKFLOWS
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('13. Common Workflows'),
  subHeading('13.1 Creating a Labor Quote End-to-End'),
  bodyPara('This workflow covers the full process from labor estimation to quote creation:'),
  bullet('1. Navigate to Labor Budget → Calculator'),
  bullet('2. Click "Add Solution" to create a new solution group'),
  bullet('3. Optionally load a Blueprint to pre-populate work items'),
  bullet('4. Add additional work items from the catalog'),
  bullet('5. Adjust quantities, hours, and rates as needed'),
  bullet('6. Set overhead % and contingency % for the solution'),
  bullet('7. Review the grand total at the bottom'),
  bullet('8. Click "Create Quote" → select customer → save'),
  bullet('9. Navigate to Quote Management to find the new quote in "Pending" status'),
  noteBox('Tip', 'Use the Labor Budget Wizard for a guided step-by-step experience, then send to the Calculator for final adjustments.'),
  subHeading('13.2 Generating a SOW from an Approved Quote'),
  bullet('1. Navigate to Quote Management'),
  bullet('2. Find the approved labor quote'),
  bullet('3. Click "Generate SOW" on the expanded quote detail'),
  bullet('4. In the SOW Generator, select the Practice Area and SOW Type'),
  bullet('5. Enable the desired AI content sections'),
  bullet('6. Click "Generate Document" — wait for AI content generation'),
  bullet('7. Review the generated content and use "Professional Review" for quality feedback'),
  bullet('8. Click "Download DOCX" to get the final document'),
  subHeading('13.3 Tracking E-Rate Opportunities'),
  bullet('1. Navigate to E-Rate → Opportunities'),
  bullet('2. Click "Download Updates" to fetch the latest USAC data'),
  bullet('3. Filter by state, service type, or search terms'),
  bullet('4. Assign a user status to each opportunity (In Process, Reviewing, etc.)'),
  bullet('5. Use the E-Rate Dashboard for a visual summary'),
  bullet('6. Check FRN Status for funded request tracking'),
  subHeading('13.4 Analyzing Cisco Renewals'),
  bullet('1. Navigate to Cisco Renewals → Summary'),
  bullet('2. Select a customer from the dropdown'),
  bullet('3. Review hardware and software renewal portfolios'),
  bullet('4. Examine the EOL Timeline buckets for prioritization'),
  bullet('5. Click "Generate AI Analysis" for strategic recommendations'),
  bullet('6. Export the analysis as Excel, Markdown, or DOCX'),
  bullet('7. Use Hardware/Software Renewals pages for detailed item-level review'),
  subHeading('13.5 Onboarding a New User'),
  bullet('1. The new user signs in with Microsoft 365 (they will be assigned "Pending" role)'),
  bullet('2. A Super Admin navigates to Admin → Users'),
  bullet('3. Find the new user in the list (filter by "Pending" role)'),
  bullet('4. Click the user to open their profile'),
  bullet('5. Assign the appropriate role (user, manager, or admin)'),
  bullet('6. Optionally configure module-level permissions'),
  bullet('7. The user can now access the assigned features on their next page load'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  14. SECURITY
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('14. Security'),
  subHeading('14.1 Authentication'),
  bullet('All authentication is handled through Microsoft Azure Active Directory'),
  bullet('MSAL (Microsoft Authentication Library) v5 manages token acquisition and renewal'),
  bullet('Tokens are cached in browser localStorage for persistent sessions'),
  bullet('ID tokens are verified on the backend using Azure AD\'s JWKS signing keys'),
  subHeading('14.2 Authorization'),
  bullet('Role-Based Access Control (RBAC) enforced on both frontend and backend'),
  bullet('Frontend: Route guards prevent unauthorized navigation'),
  bullet('Backend: requireRole() middleware validates user role from the database per request'),
  bullet('Admin endpoints require "admin" role; destructive operations require "admin" or "manager"'),
  subHeading('14.3 API Security'),
  bullet('All API requests (except health check and auth sync) require a valid JWT bearer token'),
  bullet('Rate limiting: 200 requests/minute globally; 10/minute for AI; 20/minute for auth'),
  bullet('Helmet.js security headers applied'),
  bullet('CORS restricted to configured origins'),
  bullet('Request body size limited to 10MB'),
  bullet('Path traversal protection on file access endpoints'),
  subHeading('14.4 Data Protection'),
  bullet('SQL Server connection uses TLS encryption'),
  bullet('Sensitive configuration stored in environment variables (.env) — never committed to source control'),
  bullet('User preferences use JWT-derived email — no client-supplied identity spoofing'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  15. TROUBLESHOOTING
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('15. Troubleshooting'),
  subHeading('15.1 Blank Page After Login'),
  bodyPara('If you see a blank white page after signing in:'),
  bullet('Clear your browser cache and cookies for the application domain'),
  bullet('Open browser Developer Tools (F12) → Application → Local Storage → clear all "msal." entries'),
  bullet('Reload the page — you should be redirected to the sign-in page'),
  noteBox('Cause', 'This can occur when stale MSAL authentication state persists in localStorage after a session timeout or server restart.'),
  subHeading('15.2 Menus Not Appearing'),
  bodyPara('If the sidebar shows no menu items:'),
  bullet('Check your user role — "Pending" users see no menus'),
  bullet('Contact a Super Admin to verify your role assignment'),
  bullet('Check the browser console for API errors (e.g., 401 or 500 on /api/menu-config)'),
  bullet('Try signing out and back in to refresh your user profile'),
  subHeading('15.3 AI Generation Not Working'),
  bullet('Check the AI status badge in the SOW/Assessment Generator (green = configured, red = not configured)'),
  bullet('Verify Azure OpenAI configuration in the backend .env file'),
  bullet('Check the browser console for 500 errors on /api/ai/* endpoints'),
  bullet('Ensure the AI temperature is between 0.0 and 1.0 in the admin settings'),
  subHeading('15.4 Database Connection Errors'),
  bullet('If you see "Connection is closed" errors in the backend logs, the database pool may have been lost'),
  bullet('The backend has auto-reconnection logic — wait a few seconds and retry'),
  bullet('If errors persist, restart the backend server'),
  bullet('Verify Azure SQL firewall rules allow connections from your IP'),
  subHeading('15.5 E-Rate Data Not Loading'),
  bullet('Verify E-Rate settings in Admin → E-Rate Settings'),
  bullet('Check that the SODA API URL is correct'),
  bullet('Ensure target states and funding year are configured'),
  bullet('The USAC API may have rate limits — wait and retry if downloads fail'),
  subHeading('15.6 Export/Download Issues'),
  bullet('Ensure your browser allows file downloads from the application'),
  bullet('For DOCX downloads, check that the document was generated successfully (no 500 errors in console)'),
  bullet('Large exports may take several seconds — wait for the download to begin'),
  pgBreak(),
);

// ══════════════════════════════════════════════════════════════════════
//  APPENDIX A: KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════════════════
children.push(
  sectionHeading('Appendix A: Quick Reference'),
  subHeading('A.1 URL Quick Reference'),
  simpleTable(
    ['Page', 'URL Path'],
    [
      ['Dashboard', '/'],
      ['MSP Dashboard', '/msp-dashboard'],
      ['Services Overview', '/msp-services'],
      ['MSP Quote Builder', '/msp-quote'],
      ['Labor Budget Calculator', '/labor-budget'],
      ['Labor Budget Wizard', '/labor-budget-wizard'],
      ['Quote Management', '/quote-management'],
      ['SOW Generator', '/sow-generator'],
      ['Assessment Generator', '/assessment-generator'],
      ['E-Rate Opportunities', '/e-rate'],
      ['E-Rate Dashboard', '/e-rate/dashboard'],
      ['FRN Status', '/e-rate/frn-status'],
      ['FRN Dashboard', '/e-rate/frn-dashboard'],
      ['Cisco Renewals Summary', '/cisco-renewals/summary'],
      ['Hardware Renewals', '/cisco-renewals/hardware'],
      ['Software Renewals', '/cisco-renewals/software'],
      ['User Management', '/admin/users'],
      ['Customer Management', '/admin/customers'],
      ['Admin Settings', '/admin/settings'],
      ['User Profile', '/profile'],
    ]
  ),
  subHeading('A.2 Role Permission Matrix'),
  simpleTable(
    ['Action', 'Pending', 'Read Only', 'User', 'Manager', 'Admin'],
    [
      ['View dashboards & data', '✗', '✓', '✓', '✓', '✓'],
      ['Create quotes', '✗', '✗', '✓', '✓', '✓'],
      ['Edit quotes', '✗', '✗', '✓', '✓', '✓'],
      ['Approve/deny quotes', '✗', '✗', '✗', '✓', '✓'],
      ['Delete records', '✗', '✗', '✗', '✓', '✓'],
      ['Generate SOW/assessments', '✗', '✗', '✓', '✓', '✓'],
      ['Download documents', '✗', '✗', '✓', '✓', '✓'],
      ['Access Admin pages', '✗', '✗', '✗', '✗', '✓'],
      ['Manage users', '✗', '✗', '✗', '✗', '✓'],
      ['Configure system settings', '✗', '✗', '✗', '✗', '✓'],
    ]
  ),
);

// ══════════════════════════════════════════════════════════════════════
//  BUILD AND SAVE
// ══════════════════════════════════════════════════════════════════════

const doc = new Document({
  creator: 'Cerium Networks',
  title: 'Cerium Sales Tools — Operating Documentation',
  description: 'Comprehensive operating documentation for Cerium Sales Tools',
  styles: {
    default: {
      document: {
        run: { size: 22, font: 'Calibri' },
      },
      heading1: {
        run: { size: 32, bold: true, color: BRAND_BLUE, font: 'Calibri' },
        paragraph: { spacing: { before: 360, after: 120 } },
      },
      heading2: {
        run: { size: 28, bold: true, color: BRAND_DARK, font: 'Calibri' },
        paragraph: { spacing: { before: 240, after: 100 } },
      },
      heading3: {
        run: { size: 24, bold: true, color: BRAND_DARK, font: 'Calibri' },
        paragraph: { spacing: { before: 200, after: 80 } },
      },
    },
  },
  features: { updateFields: true },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.25),
          right: convertInchesToTwip(1),
        },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'Cerium Sales Tools — Operating Documentation', italics: true, size: 16, color: '9CA3AF' }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Confidential  •  Page ', size: 16, color: '9CA3AF' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9CA3AF' }),
            new TextRun({ text: ' of ', size: 16, color: '9CA3AF' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '9CA3AF' }),
          ],
        })],
      }),
    },
    children,
  }],
});

async function generate() {
  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, 'Cerium_Sales_Tools_Operating_Documentation.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Documentation generated: ${outPath}`);
  console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

generate().catch(err => { console.error('Failed to generate:', err); process.exit(1); });
