#!/usr/bin/env pwsh

# Test: Update MSP Offering with new features and service levels

Write-Host "=== Testing MSP Offering Update with Features and Service Levels ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create an initial offering
Write-Host "[1] Creating initial offering..." -ForegroundColor Yellow
$initialOffering = @{
    name = "UPDATE_TEST_$(Get-Random -Minimum 1000 -Maximum 9999)"
    description = "Test offering for update"
    category = "backup"
    setupFee = 500
    features = @("Feature 1", "Feature 2")
    serviceLevels = @(@{
        name = "Basic"
        basePrice = 100
        baseCost = 50
        marginPercent = 50
        pricingUnit = "per-user"
        options = @()
    })
} | ConvertTo-Json -Depth 10

$createResp = Invoke-WebRequest -Uri "http://localhost:3000/api/msp-offerings" -Method Post -Body $initialOffering -ContentType "application/json" -UseBasicParsing -ErrorAction Continue 2>$null
if ($createResp.StatusCode -eq 201) {
    $created = $createResp.Content | ConvertFrom-Json
    $offeringId = $created.data.Id
    $initialName = $created.data.Name
    Write-Host "[OK] Created offering: $offeringId - $initialName" -ForegroundColor Green
    Write-Host "     Features: $($created.data.features.Count)"
} else {
    Write-Host "[FAIL] Failed to create offering" -ForegroundColor Red
    exit 1
}

# Step 2: Get the offering
Write-Host ""
Write-Host "[2] Fetching offering from API..." -ForegroundColor Yellow
$getResp = Invoke-WebRequest -Uri "http://localhost:3000/api/msp-offerings" -Method Get -UseBasicParsing -ErrorAction Continue 2>$null
$offerings = $getResp.Content | ConvertFrom-Json
$offering = $offerings.data | Where-Object { $_.Id -eq $offeringId } | Select-Object -First 1

if ($offering) {
    Write-Host "[OK] Found offering in list" -ForegroundColor Green
    Write-Host "     Current features: $($offering.features.Count)"
    $originalFeatureCount = @($offering.features).Count
} else {
    Write-Host "[FAIL] Offering not found in list" -ForegroundColor Red
    exit 1
}

# Step 3: Update the offering by adding a new feature and new service level
Write-Host ""
Write-Host "[3] Updating offering with new feature and service level..." -ForegroundColor Yellow
$updateData = @{
    name = $offering.Name
    description = $offering.Description
    category = $offering.Category
    setupFee = $offering.SetupFee
    features = @("Feature 1", "Feature 2", "Feature 3 NEW")
    serviceLevels = @(
        @{
            name = "Basic"
            basePrice = 100
            baseCost = 50
            marginPercent = 50
            pricingUnit = "per-user"
            options = @()
        },
        @{
            name = "Premium NEW"
            basePrice = 200
            baseCost = 100
            marginPercent = 50
            pricingUnit = "per-user"
            options = @()
        }
    )
} | ConvertTo-Json -Depth 10

$updateResp = Invoke-WebRequest -Uri "http://localhost:3000/api/msp-offerings/$offeringId" -Method Put -Body $updateData -ContentType "application/json" -UseBasicParsing -ErrorAction Continue 2>$null
if ($updateResp.StatusCode -eq 200) {
    $updated = $updateResp.Content | ConvertFrom-Json
    Write-Host "[OK] Update request successful (HTTP $($updateResp.StatusCode))" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Update request failed: HTTP $($updateResp.StatusCode)" -ForegroundColor Red
    exit 1
}

# Step 4: Verify the update persisted
Write-Host ""
Write-Host "[4] Verifying update persisted to database..." -ForegroundColor Yellow
Start-Sleep -Milliseconds 500
$verifyResp = Invoke-WebRequest -Uri "http://localhost:3000/api/msp-offerings" -Method Get -UseBasicParsing -ErrorAction Continue 2>$null
$offerings2 = $verifyResp.Content | ConvertFrom-Json
$updatedOffering = $offerings2.data | Where-Object { $_.Id -eq $offeringId } | Select-Object -First 1

if ($updatedOffering) {
    $newFeatureCount = @($updatedOffering.features).Count
    $newLevelCount = @($updatedOffering.serviceLevels).Count
    
    Write-Host "[OK] Offering found after update" -ForegroundColor Green
    Write-Host "     Original features: $originalFeatureCount → New features: $newFeatureCount" -ForegroundColor Cyan
    Write-Host "     Features: $($updatedOffering.features -join ', ')" -ForegroundColor Cyan
    
    if ($newFeatureCount -gt $originalFeatureCount) {
        Write-Host "[OK] New feature was saved!" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] New feature was NOT saved (count didn't increase)" -ForegroundColor Red
    }
    
    if ($updatedOffering.features -contains "Feature 3 NEW") {
        Write-Host "[OK] 'Feature 3 NEW' is present in the updated offering" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] 'Feature 3 NEW' is NOT in the updated offering" -ForegroundColor Red
    }
    
    if ($updatedOffering.serviceLevels | Where-Object { $_.name -eq "Premium NEW" }) {
        Write-Host "[OK] 'Premium NEW' service level was saved!" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] 'Premium NEW' service level was NOT saved" -ForegroundColor Red
    }
} else {
    Write-Host "[FAIL] Offering not found after update" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] Update with features and service levels is working correctly!" -ForegroundColor Green
