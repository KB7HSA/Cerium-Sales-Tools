# Assessment Template Setup

## Overview
This folder contains Word templates for Assessment document generation. Each Assessment Type can specify its own template file.

## Creating Custom Templates

1. Create a Word document (.docx) with your desired layout
2. Add placeholders using `{placeholderName}` syntax
3. Save the file to `/public/templates/`
4. In the Assessment Types admin page, set the "Document Template File" field to your filename

## Template Placeholders

When creating your Word template, use the following placeholders that will be replaced with assessment data:

### Customer & Assessment Information
| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{companyName}` | Company/Organization Name | Acme Corporation |
| `{customerName}` | Customer Contact Name | Acme Corporation |
| `{assessmentTitle}` | Full Assessment Title | Acme Corp - Microsoft 365 (Security) |
| `{practiceArea}` | Reference Architecture/Practice Area | Security |
| `{assessmentType}` | Assessment Type Name | Microsoft 365 |
| `{currentDate}` | Document Generation Date | February 20, 2026 |

### Assessment Content
| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{executiveSummary}` | Executive Summary/Overview | This Microsoft 365 Assessment provides... |
| `{scope}` | Assessment Scope | The assessment covers Exchange Online... |
| `{methodology}` | Assessment Methodology | Our methodology follows Microsoft best... |
| `{recommendations}` | Key Recommendations | Based on our findings, we recommend... |

### Pricing Information
| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{estimatedHours}` | Estimated Labor Hours | 16 |
| `{hourlyRate}` | Hourly Rate (formatted) | $175.00 |
| `{totalPrice}` | Total Assessment Price (formatted) | $2,800.00 |

## Default Template

The default template is `Assessment-Template.docx`. If a custom template is not specified for an assessment type, or if the specified template file is not found, the default template will be used.

## Template Location

All templates must be placed in:
```
/public/templates/
```

## Example Template Structure

A typical assessment template might include:

1. **Header Section**
   - Company Logo
   - `{companyName}` - Company/Organization Name
   - `{customerName}` - Customer Contact
   - `{assessmentTitle}` - Assessment Title
   - `{currentDate}` - Date

2. **Context Section**
   - Practice Area: `{practiceArea}`
   - Assessment Type: `{assessmentType}`

3. **Executive Summary Section**
   - `{executiveSummary}`

4. **Scope Section**
   - `{scope}`

5. **Methodology Section**
   - `{methodology}`

6. **Recommendations Section**
   - `{recommendations}`

7. **Investment Summary**
   - Estimated Hours: `{estimatedHours}`
   - Hourly Rate: `{hourlyRate}`
   - Total Investment: `{totalPrice}`

## Tips for Template Design

1. **Placeholder Formatting**: The placeholder syntax is case-sensitive. Use the exact placeholder names.
2. **Line Breaks**: Content with multiple lines (like methodology) will preserve line breaks.
3. **Styling**: Apply Word styles to placeholders - the formatting will be preserved.
4. **Testing**: Test your template with sample data before production use.

## Available Templates

| Filename | Description |
|----------|-------------|
| `Assessment-Template.docx` | Default assessment template |

Add your custom templates to this list as you create them.
