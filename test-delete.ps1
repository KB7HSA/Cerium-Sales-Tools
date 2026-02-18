#!/usr/bin/env pwsh

# Generate unique test name
$testName = "DELETE_TEST_$(Get-Random -Minimum 1000 -Maximum 9999)"

# Create test offering
$testJson = @{
    name = $testName
    description = "This offering will be deleted to test the fix"
    category = "backup"
    setupFee = 500
} | ConvertTo-Json

Write-Host "Creating test offering..."
$createResp = Invoke-WebRequest -Uri "http://localhost:3000/api/msp-offerings" -Method Post -Body $testJson -ContentType "application/json" -UseBasicParsing -ErrorAction Continue 2>$null
if ($createResp.StatusCode -eq 201) {
    $created = $createResp.Content | ConvertFrom-Json
    $testId = $created.data.Id
    Write-Host "[OK] Created offering: $testId - $testName"
    
    # Verify it appears in the list
    Write-Host ""
    Write-Host "Verifying offering is in list..."
    $listResp = Invoke-WebRequest -Uri "http://localhost:3000/api/msp-offerings" -Method Get -UseBasicParsing -ErrorAction Continue 2>$null
    $offerings = $listResp.Content | ConvertFrom-Json
    $found = $offerings.data | Where-Object { $_.Id -eq $testId }
    
    if ($found) {
        Write-Host "[OK] Offering found in list before delete"
        $countBefore = @($offerings.data).Count
        Write-Host "     Total offerings before delete: $countBefore"
    }
    
    # Delete the offering
    Write-Host ""
    Write-Host "Deleting offering..."
    $deleteResp = Invoke-WebRequest -Uri "http://localhost:3000/api/msp-offerings/$testId" -Method Delete -UseBasicParsing -ErrorAction Continue 2>$null
    if ($deleteResp.StatusCode -eq 200) {
        Write-Host "[OK] Delete request successful (HTTP $($deleteResp.StatusCode))"
        
        # Verify it no longer appears in the list
        Write-Host ""
        Write-Host "Verifying offering is NOT in list after delete..."
        Start-Sleep -Milliseconds 500
        $listResp2 = Invoke-WebRequest -Uri "http://localhost:3000/api/msp-offerings" -Method Get -UseBasicParsing -ErrorAction Continue 2>$null
        $offerings2 = $listResp2.Content | ConvertFrom-Json
        $stillThere = $offerings2.data | Where-Object { $_.Id -eq $testId }
        $countAfter = @($offerings2.data).Count
        
        if ($stillThere) {
            Write-Host "[FAIL] Offering still appears in list after delete!"
            Write-Host "       IsActive value: $($stillThere.IsActive)"
        } else {
            Write-Host "[OK] Offering does NOT appear in list after delete"
            Write-Host "     Total offerings after delete: $countAfter (was $countBefore)"
            Write-Host ""
            Write-Host "[SUCCESS] DELETE FIX IS WORKING CORRECTLY!"
        }
    } else {
        Write-Host "[FAIL] Delete request failed: HTTP $($deleteResp.StatusCode)"
    }
} else {
    Write-Host "[FAIL] Failed to create test offering"
}
