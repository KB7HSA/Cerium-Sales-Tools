# Testing Service Level Pricing Updates

## Overview
This guide helps debug why service level cost, margin, and unit of measure updates aren't persisting.

## Steps to Test

### 1. Open Browser Developer Tools
- Press `F12` to open DevTools
- Go to **Console** tab
- Keep this open during testing

### 2. Navigate to Admin Section
- Go to `http://localhost:4200/admin/msp-offerings`
- Find an existing MSP offering
- Click **Edit**

### 3. Edit a Service Level
- In the offering form, locate a service level
- Click the **Edit** button on that service level
- A modal/form should open showing the service level details
- Update these fields:
  - **License Cost** (change to new value)
  - **License Margin** (change to new value)  
  - **Professional Services Cost** (change to new value)
  - **Professional Services Margin** (change to new value)
  - **Pricing Unit** (select different unit)
- Click **Save Level** or the save button in the modal

### 4. Submit the Entire Offering Form
- After editing the service level, scroll down and click **Update Offering** or **Submit**
- Watch the console for these messages:

#### Frontend Console Logs (should appear):
```
[MSPOfferingFormComponent] Offering data being sent:
  - name: "..."
  - featuresCount: X
  - serviceLevelsCount: X
  - firstServiceLevel: { ... all fields including licenseCost, licenseMargin, pricingUnit, etc. ... }

[MSPOfferingService] Updating offering:
[MSPOfferingService] Payload being sent:
  { ServiceLevels: [ { licenseCost: X, licenseMargin: Y, pricingUnit: "...", ... } ] }
```

### 5. Check Backend Logs
- Open the terminal window running the backend Node.js server
- You should see messages like:

```
[updateOffering] Received updates for offering: xxx
  hasServiceLevels: true
  serviceLevelCount: X
  firstLevel: { "licenseCost": X, "licenseMargin": Y, "pricingUnit": "..." }

[updateOffering] Processing service levels:
  count: X
  firstLevel: { JSON of the level }

[updateOffering] Inserting service level 0:
  name: "..."
  basePrice: X
  licenseCost: Y
  professionalServicesPrice: Z
  professionalServicesCost: ABC
```

### 6. Refresh and Verify
- After "Offering updated successfully!" message, refresh the page
- Go back to edit the same offering
- Check if the service level values were persisted or reverted

## What to Look For

### Success Indicators:
- ✅ Console shows all fields in the ServiceLevels array: `licenseCost`, `licenseMargin`, `professionalServicesCost`, `professionalServicesMargin`, `pricingUnit`
- ✅ Backend logs show all values being received and extracted correctly
- ✅ Backend logs show non-zero, non-null values being inserted
- ✅ After refresh, the values persist

### Failure Indicators:
- ❌ Console shows ServiceLevels but fields are missing or undefined
- ❌ Backend logs show fields as undefined or null
- ❌ Backend logs show values defaulting to 0 or null
- ❌ After refresh, values revert to previous values or show as $0.00

## Common Issues to Check

1. **Missing fields in payload**
   - If `licenseCost`, `licenseMargin`, etc. don't appear in frontend logs
   - The form component might not be preserving these fields when editing

2. **Undefined values in backend**
   - If backend logs show extracted values as `undefined`
   - Check if both camelCase and PascalCase versions are missing
   - Could indicate the form sent empty/missing values

3. **Values defaulting to 0 or null**
   - If backend shows `licenseCost: 0` and you entered 100
   - Check if the form's draft object is properly structured
   - Verify the `saveEditLevel` function is updating the correct properties

4. **Options not being re-inserted**
   - Service level options might not be persisting
   - Check if options array is being preserved when editing
   - Look for "Level has X options" logs

## Data Flow Trace

```
User edits level
  ↓
saveEditLevel() updates level object from draft
  ↓
submitForm() collects all serviceLevels
  ↓
Form component logs all serviceLevels data
  ↓
Service sends PUT with ServiceLevels payload
  ↓
Service logs full payload
  ↓
Backend receives updates
  ↓
Backend logs received serviceLevels
  ↓
Backend extracts values (both PascalCase and camelCase)
  ↓
Backend logs extracted values per level
  ↓
Backend inserts into database
  ↓
Database query returns updated offering
  ↓
Frontend normalizes response
  ↓
Frontend displays in list
```

## If Still Not Working

Once you've followed these steps and captured the logs, share:
1. The browser console logs (especially the payload being sent)
2. The backend console output (the extracted values being inserted)
3. Describe exactly what you entered vs what you see after refresh

This will help identify where in the pipeline the data is being lost.
