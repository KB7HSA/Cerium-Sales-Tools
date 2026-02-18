# Test to verify IsActive default fix
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "Test started at: $timestamp"

$testName = "ISACTIVE_FIX_" + (Get-Random -Minimum 1000 -Maximum 9999)

# Test 1: Create offering
Write-Host "`n[1] Creating test offering with features..."
$createUrl = "http://localhost:3000/api/msp-offerings"
$createPayload = @{
    name = $testName
    description = "Testing IsActive default fix"
    category = "backup"
    basePrice = 100
    serviceLevels = @(
        @{
            name = "Basic"
            basePrice = 50
        }
    )
    features = @("Feature 1", "Feature 2")
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $createUrl `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $createPayload `
        -UseBasicParsing
    
    $createdOffering = $response.Content | ConvertFrom-Json
    $offeringId = $createdOffering.id
    
    Write-Host "[OK] Created offering: $offeringId - $testName"
    Write-Host "IsActive: $($createdOffering.isActive)"
} catch {
    Write-Host "[FAIL] Could not create offering"
    Write-Host "Error: $($_.Exception.Message)"
    exit 1
}

# Test 2: Fetch all offerings and check if new one appears
Write-Host "`n[2] Fetching all offerings from API..."
$getAllUrl = "http://localhost:3000/api/msp-offerings"

try {
    $response = Invoke-WebRequest -Uri $getAllUrl `
        -Method GET `
        -UseBasicParsing
    $allOfferings = $response.Content | ConvertFrom-Json
    
    $foundOffering = $allOfferings | Where-Object { $_.id -eq $offeringId }
    
    if ($foundOffering) {
        Write-Host "[OK] Offering found in list!"
        Write-Host "Name: $($foundOffering.name)"
        Write-Host "IsActive: $($foundOffering.isActive)"
    } else {
        Write-Host "[FAIL] Offering NOT found in list"
        Write-Host "Total offerings returned: $($allOfferings.Count)"
        exit 1
    }
} catch {
    Write-Host "[FAIL] Could not fetch offerings"
    Write-Host "Error: $($_.Exception.Message)"
    exit 1
}

Write-Host "`n✅ ALL TESTS PASSED - IsActive fix is working!"
