# MSP Offering Add-on Services Feature

## Overview
This feature adds support for **offering-level add-on services** that can be selected or deselected during the quoting process. These add-ons are independent of service levels and apply to the entire MSP offering.

## Implementation Date
February 20, 2026

## Key Features

### 1. **Offering-Level Add-ons**
   - Independent services that enhance the base offering
   - Can be selected/deselected during quote creation
   - Support both monthly recurring and one-time pricing
   - Can be marked as "default selected" for automatic inclusion

### 2. **Flexible Pricing**
   - **Monthly recurring charges** with cost and margin tracking
   - **One-time setup fees** with cost and margin tracking
   - Per-unit pricing (per-user, per-device, per-GB, one-time)
   - Automatic price calculation based on cost + margin%

### 3. **Quote Integration** (Ready for implementation)
   - Add-ons can be selected when creating quotes
   - Default-selected add-ons are pre-checked
   - Pricing automatically calculated based on quantity and unit type

## Database Changes

### New Table: `MspOfferingAddOns`

```sql
CREATE TABLE dbo.MspOfferingAddOns (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    OfferingId NVARCHAR(64) NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    MonthlyPrice DECIMAL(12,2) NOT NULL DEFAULT 0,
    MonthlyCost DECIMAL(12,2) NULL,
    MarginPercent DECIMAL(6,2) NULL,
    OneTimePrice DECIMAL(12,2) NOT NULL DEFAULT 0,
    OneTimeCost DECIMAL(12,2) NULL,
    OneTimeMargin DECIMAL(6,2) NULL,
    PricingUnit NVARCHAR(50) NOT NULL DEFAULT 'per-user',
    IsActive BIT NOT NULL DEFAULT 1,
    IsDefaultSelected BIT NOT NULL DEFAULT 0,
    DisplayOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_MspOfferingAddOns_Offerings FOREIGN KEY (OfferingId)
        REFERENCES dbo.MspOfferings(Id) ON DELETE CASCADE
);
```

**Key Fields:**
- `MonthlyPrice` / `MonthlyCost` / `MarginPercent` - Recurring monthly pricing
- `OneTimePrice` / `OneTimeCost` / `OneTimeMargin` - One-time setup pricing
- `IsDefaultSelected` - Auto-select this add-on in new quotes
- `DisplayOrder` - Order for display in UI

### Migration Script
Run: `db/add-offering-addons-table.sql`

## Backend Changes

### File: `backend/src/services/msp-offering.service.ts`

#### New Interface
```typescript
export interface MSPAddOn {
  Id?: string;
  OfferingId?: string;
  Name: string;
  Description?: string;
  MonthlyPrice: number;
  MonthlyCost?: number;
  MarginPercent?: number;
  OneTimePrice?: number;
  OneTimeCost?: number;
  OneTimeMargin?: number;
  PricingUnit: string;
  IsActive?: boolean;
  IsDefaultSelected?: boolean;
  DisplayOrder?: number;
}
```

#### Updated Methods
1. **`getAllOfferings()`** - Now includes add-ons in response
2. **`getOfferingById(id)`** - Returns offering with add-ons
3. **`createOffering(offering)`** - Saves add-ons to database
4. **`updateOffering(id, updates)`** - Updates add-ons (delete + insert)

**API Response Structure:**
```json
{
  "success": true,
  "data": {
    "Id": "uuid",
    "Name": "Cloud Backup Pro",
    "Features": ["Hourly backups", "Encryption"],
    "ServiceLevels": [...],
    "AddOns": [
      {
        "Id": "uuid",
        "Name": "24/7 Premium Support",
        "Description": "Round-the-clock priority support",
        "MonthlyPrice": 50.00,
        "MonthlyCost": 35.00,
        "MarginPercent": 42.86,
        "OneTimePrice": 100.00,
        "OneTimeCost": 75.00,
        "OneTimeMargin": 33.33,
        "PricingUnit": "per-user",
        "IsDefaultSelected": false
      }
    ]
  }
}
```

## Frontend Changes

### File: `src/app/shared/services/msp-offerings.service.ts`

#### New Interface
```typescript
export interface MSPAddOn {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  monthlyCost?: number;
  marginPercent?: number;
  oneTimePrice?: number;
  oneTimeCost?: number;
  oneTimeMargin?: number;
  pricingUnit: PricingUnit;
  isActive?: boolean;
  isDefaultSelected?: boolean;
  displayOrder?: number;
}
```

Updated `MSPOffering` interface includes:
```typescript
addOns?: MSPAddOn[];
AddOns?: MSPAddOn[]; // Backend PascalCase support
```

### File: `src/app/pages/admin/msp-offering-form.component.ts`

#### New Properties
- `addOns: MSPAddOn[]` - Array of add-on services
- `showAddOnForm: boolean` - Toggle add-on form visibility
- Form fields for add-on creation (name, description, pricing, etc.)

#### New Methods
```typescript
addAddOn()                  // Add new add-on to offering
removeAddOn(index)          // Remove add-on from offering
toggleAddOnForm()           // Show/hide add-on form
resetAddOnForm()            // Clear add-on form fields
updateAddOnMonthlyPrice()   // Recalculate monthly price from cost + margin
updateAddOnOneTimePrice()   // Recalculate one-time price from cost + margin
```

#### Form Submission
The `submitForm()` method now includes:
```typescript
const offeringData = {
  name: this.name,
  description: this.description,
  // ... other fields
  serviceLevels: this.serviceLevels,
  addOns: this.addOns  // ← New
};
```

### File: `src/app/pages/admin/msp-offering-form.component.html`

#### New UI Section: "Add-on Services"
Located between "Key Features" and "Add-on Options" sections.

**Features:**
- Purple-themed to distinguish from service-level options (green)
- Dual pricing inputs (Monthly recurring + One-time setup)
- Cost, margin%, and calculated price fields
- "Default selected" checkbox
- List view of all configured add-ons
- Edit/remove capabilities

**Form Fields:**
1. Service Name (required)
2. Description (optional)
3. Pricing Unit (dropdown)
4. **Monthly Recurring:**
   - Cost ($)
   - Margin (%)
   - Price (auto-calculated, read-only)
5. **One-time Setup:**
   - Cost ($)
   - Margin (%)
   - Price (auto-calculated, read-only)
6. Default Selected (checkbox)

## Usage Examples

### Example 1: Creating an Offering with Add-ons

```typescript
const offering = {
  name: "Cloud Backup Pro",
  description: "Enterprise backup solution",
  category: "backup",
  features: ["Hourly backups", "AES-256 encryption"],
  serviceLevels: [
    {
      name: "Standard",
      basePrice: 10,
      pricingUnit: "per-user"
    }
  ],
  addOns: [
    {
      name: "24/7 Premium Support",
      description: "Priority support with 1-hour response",
      monthlyPrice: 50,
      monthlyCost: 35,
      marginPercent: 42.86,
      oneTimePrice: 100,
      oneTimeCost: 75,
      oneTimeMargin: 33.33,
      pricingUnit: "per-user",
      isDefaultSelected: false
    },
    {
      name: "Compliance Reporting",
      description: "HIPAA/SOC 2 compliance reports",
      monthlyPrice: 30,
      monthlyCost: 20,
      marginPercent: 50,
      oneTimePrice: 0,
      pricingUnit: "one-time",
      isDefaultSelected: true
    }
  ]
};
```

### Example 2: Common Add-on Services

**Support Add-ons:**
- 24/7 Premium Support
- Dedicated Account Manager
- Onboarding/Training Services

**Feature Add-ons:**
- Advanced Reporting Dashboard
- API Access
- White-label Branding
- Compliance Certifications
- SLA Upgrades

**Capacity Add-ons:**
- Additional Storage packs
- Extra User Licenses
- Bandwidth Upgrades

## Difference from Service Level Options

| Feature | **Add-on Services** (This Feature) | **Service Level Options** |
|---------|-----------------------------------|---------------------------|
| **Scope** | Offering-level | Service-level specific |
| **Independence** | Independent of service tier | Tied to specific tier |
| **Use Case** | Cross-tier enhancements | Tier-specific customizations |
| **Examples** | Premium support, Compliance reports | Extra storage for Premium tier |
| **Selection** | Applied to entire offering | Applied to specific service level |
| **Default** | Can be default-selected | Always optional |

## Quote Integration (Next Steps)

When implementing quote generation with add-ons:

1. **Display add-ons** when user selects an offering
2. **Pre-check default add-ons** (`IsDefaultSelected = true`)
3. **Calculate pricing:**
   ```typescript
   const monthlyTotal = quantity * (
     serviceLevel.basePrice +
     selectedAddOns.reduce((sum, addon) => sum + addon.monthlyPrice, 0)
   );
   
   const oneTimeTotal = quantity * (
     offering.setupFee +
     selectedAddOns.reduce((sum, addon) => sum + addon.oneTimePrice, 0)
   );
   ```
4. **Save selected add-ons** with quote line items
5. **Display on quote/proposal** document

## Testing Checklist

- [x] Database table created successfully
- [x] Backend API returns add-ons for offerings
- [x] Create offering with add-ons
- [x] Update offering add-ons
- [x] Delete offering (cascades to add-ons)
- [x] Frontend form allows adding/removing add-ons
- [x] Pricing calculations work correctly
- [x] Default-selected checkbox persists
- [ ] Quote integration displays add-ons
- [ ] Quotegeneration includes add-on pricing
- [ ] Reports show add-on revenue

## Files Modified

### Database
- `db/mssql-schema.sql` - Added `MspOfferingAddOns` table definition
- `db/add-offering-addons-table.sql` - Migration script (NEW)

### Backend
- `backend/src/services/msp-offering.service.ts`
  - Added `MSPAddOn` interface
  - Updated `MSPOffering` interface
  - Modified `getAllOfferings()`, `getOfferingById()`, `createOffering()`, `updateOffering()`

### Frontend
- `src/app/shared/services/msp-offerings.service.ts`
  - Added `MSPAddOn` interface
  - Updated `MSPOffering` interface

- `src/app/pages/admin/msp-offering-form.component.ts`
  - Added add-on management properties and methods
  - Updated form submission to include add-ons

- `src/app/pages/admin/msp-offering-form.component.html`
  - Added "Add-on Services" UI section
  - Add-on form with dual pricing (monthly + one-time)
  - List view of configured add-ons

## Rollback Instructions

If you need to rollback this feature:

1. **Database:**
   ```sql
   DROP TABLE IF EXISTS dbo.MspOfferingAddOns;
   ```

2. **Backend:** Remove `AddOns` property from interfaces and queries

3. **Frontend:** Remove add-on UI section and methods

## Future Enhancements

1. **Add-on Categories** - Group add-ons by type (support, features, capacity)
2. **Add-on Dependencies** - Require specific service level for certain add-ons
3. **Quantity Limits** - Min/max quantities for add-ons
4. **Promotional Pricing** - Temporary discounts on add-ons
5. **Bundle Discounts** - Discounts when multiple add-ons selected
6. **Usage-based Pricing** - Track and bill actual usage
7. **Add-on Analytics** - Most popular add-ons, revenue tracking

## Support

For questions or issues, contact the development team.

---
**Status:** ✅ COMPLETED  
**Last Updated:** February 20, 2026
