# Service Level Pricing Persistence Fix

## Issue Description
Service level pricing updates were not persisting to the database when users edited and saved offerings. The pricing values would either revert to $0.00 or revert to previous values on page refresh.

## Root Cause Analysis

### Backend Issue (Primary)
In `backend/src/services/msp-offering.service.ts`, the `updateOffering()` method had the following problems:

1. **Pricing Field Defaulting to 0**
   - Original logic: `basePrice: (level.BasePrice !== undefined ? level.BasePrice : level.basePrice) || 0`
   - This would default to 0 if both PascalCase (from backend) and camelCase (from frontend) were undefined
   - Since service levels are **deleted and re-inserted** during updates, lost data couldn't be recovered
   - Only `basePrice` should default to 0 (required field); optional pricing fields should default to `null`

2. **Incomplete Field Mapping**
   - Backend wasn't properly extracting pricing fields that came in camelCase from the frontend
   - Frontend sends: `basePrice`, `licenseCost`, `licenseMargin`, `professionalServicesPrice`, etc. (camelCase)
   - Backend was only checking PascalCase versions first before falling back

## Fixes Implemented

### Backend Changes (`backend/src/services/msp-offering.service.ts`)

#### 1. Enhanced Field Extraction Logic (Lines 530-544)
```typescript
// Extract values supporting both camelCase and PascalCase
const basePrice = level.BasePrice !== undefined ? level.BasePrice : (level.basePrice !== undefined ? level.basePrice : 0);
const baseCost = level.BaseCost !== undefined ? level.BaseCost : (level.baseCost !== undefined ? level.baseCost : null);
const marginPercent = level.MarginPercent !== undefined ? level.MarginPercent : (level.marginPercent !== undefined ? level.marginPercent : null);
const licenseCost = level.LicenseCost !== undefined ? level.LicenseCost : (level.licenseCost !== undefined ? level.licenseCost : null);
const licenseMargin = level.LicenseMargin !== undefined ? level.LicenseMargin : (level.licenseMargin !== undefined ? level.licenseMargin : null);
const professionalServicesPrice = level.ProfessionalServicesPrice !== undefined ? level.ProfessionalServicesPrice : (level.professionalServicesPrice !== undefined ? level.professionalServicesPrice : null);
const professionalServicesCost = level.ProfessionalServicesCost !== undefined ? level.ProfessionalServicesCost : (level.professionalServicesCost !== undefined ? level.professionalServicesCost : null);
const professionalServicesMargin = level.ProfessionalServicesMargin !== undefined ? level.ProfessionalServicesMargin : (level.professionalServicesMargin !== undefined ? level.professionalServicesMargin : null);
```

**Key Changes:**
- Properly checks both naming conventions in order
- Only `basePrice` defaults to 0 (as it's required)
- All other pricing fields default to `null` instead of 0
- Prevents loss of data due to zero defaults

#### 2. Debug Logging Enhancements (Lines 414-426, 512-519, 551-557)

Added comprehensive logging to trace data flow:
```typescript
// At updateOffering() entry
console.log('[updateOffering] Received updates for offering:', {
  id,
  hasServiceLevels: !!((updates as any).ServiceLevels || (updates as any).serviceLevels),
  serviceLevelCount: ((updates as any).ServiceLevels || (updates as any).serviceLevels)?.length || 0,
  firstLevel: ((updates as any).ServiceLevels || (updates as any).serviceLevels)?.[0]
});

// Before processing each level
console.log(`[updateOffering] Inserting service level ${levelIndex}:`, {
  name: level.Name || level.name,
  basePrice,
  licenseCost,
  professionalServicesPrice,
  professionalServicesCost
});
```

### Frontend Alignment
The frontend components (`msp-offering-form.component.ts`) already properly:
1. Load offering data from API with full normalization via `normalizeOffering()`
2. Convert PascalCase to camelCase fields
3. Save edited levels with all fields intact
4. Send complete serviceLevels array with camelCase field names

## Data Flow Verification

### Create/Update Flow:
1. **Frontend Load**: API returns data in PascalCase → `normalizeOffering()` converts to camelCase
2. **Frontend Edit**: User modifies pricing fields (maintained in camelCase)
3. **Frontend Submit**: `submitForm()` sends serviceLevels array with camelCase fields
4. **Backend Extract**: New logic checks both naming conventions and uses proper defaults
5. **Database Persist**: Values saved correctly with proper null handling
6. **Frontend Verify**: On refresh, `normalizeOffering()` properly displays all fields

## Testing Recommendations

### Test Scenario 1: Edit Service Level Pricing
1. Navigate to Admin → MSP Offerings
2. Select an offering to edit
3. Click edit on a service level
4. Update pricing fields:
   - Base Price: Change from current to new value
   - License Cost: Modify cost value
   - Professional Services Price: Adjust pricing
5. Save form
6. Refresh page
7. **Expected**: All pricing values persist with exact values entered

### Test Scenario 2: Update Multiple Service Levels
1. Edit same offering
2. Update pricing for 2-3 service levels
3. Save form
4. Go to offerings list and back to same offering
5. **Expected**: All service levels show updated pricing

### Test Scenario 3: Backend Debug Logging
1. Check Node.js backend console output
2. Look for `[updateOffering]` log messages showing:
   - Received service levels count
   - First level structure
   - Individual level insertion details with pricing values
3. **Expected**: Pricing values should appear in logs for each level being inserted

## Related Files Modified

1. **backend/src/services/msp-offering.service.ts**
   - Lines 414-426: Added initial logging
   - Lines 512-519: Added pre-processing logging
   - Lines 530-544: Enhanced field extraction logic with both naming patterns
   - Lines 551-557: Added per-level insertion logging

## Build & Deployment

### Backend Build
```bash
cd backend
npm run build
node dist/server.js
```

### Frontend Build  
```bash
npm run build
ng serve  # for development
# or
npm start
```

## Previous Enhancements (Context)

This fix builds on earlier work:
- **normalizeOffering()** (msp-offerings.service.ts): Deep normalizes nested objects from PascalCase to camelCase
- **Service Level Display** (admin offerings & services overview): Shows service level details with proper pricing
- **Null-safe rendering** (templates): Uses $any() and null coalescing for undefined pricing

## Monitoring

To verify the fix is working:

1. **Frontend**: 
   - Open browser DevTools → Network tab
   - Edit a service level and submit
   - Check the PUT request payload includes serviceLevels with all pricing fields

2. **Backend**:
   - Monitor console output for `[updateOffering]` messages
   - Verify extracted pricing values match sent values
   - Check for any NULL handling

3. **Database**:
   - Query MspServiceLevels table
   - Verify pricing fields contain expected values (not 0 where null expected)
   - Example: `SELECT Id, Name, BasePrice, LicenseCost, ProfessionalServicesPrice FROM MspServiceLevels WHERE OfferingId = 'xxx'`

## Notes

- The `|| 0` default was the critical issue causing data loss
- Service levels cascade delete/recreate pattern means defaults are critical
- Frontend already sends correct camelCase field names
- Backend now handles both naming conventions safely
- Null vs 0 distinction is important for optional pricing fields
