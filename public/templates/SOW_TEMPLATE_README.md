# SOW Template Setup

## Overview
This folder contains Word templates for Statement of Work (SOW) document generation.

## Template Placeholders

When creating your Word template, use the following placeholders that will be replaced with quote data:

### Quote Information
| Placeholder | Description | Example |
|------------|-------------|---------|
| `{companyName}` | Company/Organization Name | Acme Corporation |
| `{customerName}` | Customer Contact Name | Acme Corporation |
| `{serviceName}` | MSP Service Name | Managed Security |
| `{serviceLevelName}` | Service Level/Tier | Premium |
| `{numberOfUsers}` | Number of Users/Licenses | 50 |
| `{durationMonths}` | Contract Duration (months) | 12 |
| `{pricingUnitLabel}` | Unit Label | /user/month |

### Pricing Information
| Placeholder | Description | Example |
|------------|-------------|---------|
| `{monthlyPrice}` | Monthly Price ($) | $2,500.00 |
| `{totalPrice}` | Total Contract Value ($) | $30,000.00 |
| `{setupFee}` | One-time Setup Fee ($) | $500.00 |
| `{discountAmount}` | Discount Applied ($) | $1,000.00 |
| `{basePricePerUnit}` | License Price Per Unit ($) | $25.00 |
| `{professionalServicesPrice}` | Professional Services Per Unit ($) | $10.00 |
| `{perUnitTotal}` | Total Per Unit Price ($) | $35.00 |

### Dates & References
| Placeholder | Description | Example |
|------------|-------------|---------|
| `{quoteId}` | Quote Reference ID | QT-12345 |
| `{createdDate}` | Quote Created Date | 2026-02-20 |
| `{currentDate}` | SOW Generation Date | 2026-02-20 |
| `{notes}` | Additional Notes | Special terms apply |

### Tables (Loops)
For add-on services, use loop syntax:
```
{#selectedOptions}
  {name} | {monthlyPrice} | {pricingUnit}
{/selectedOptions}
```

For labor work items:
```
{#workItems}
  {name} | {section} | {lineHours} | {ratePerHour} | {lineTotal}
{/workItems}
```

## How to Create Template

1. Create a new Word document (.docx)
2. Design your SOW layout with company branding
3. Insert placeholders where dynamic data should appear
4. Save as `sow-template.docx` in this folder

## File Location
Place your template file here:
`public/templates/sow-template.docx`

## Implementation Note
Once the template is placed, the SOW generator service will need to be updated to:
1. Install dependencies: `npm install docxtemplater pizzip file-saver`
2. Load the template from this location
3. Replace placeholders with quote data
4. Generate and download the final document
