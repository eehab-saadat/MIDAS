# MIDAS Diagnosis Endpoint Test Script
# This script checks if all services are running and ready for diagnosis

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIDAS Diagnosis System Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Test 1: Check Flask Backend
Write-Host "[1/3] Checking Flask Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/ping" -Method GET -TimeoutSec 3 2>$null
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Flask backend is running on port 5000" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Flask backend returned status: $($response.StatusCode)" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ❌ Flask backend is NOT running on port 5000" -ForegroundColor Red
    Write-Host "     Start it with: python backend/app.py" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""

# Test 2: Check Ollama Service
Write-Host "[2/3] Checking Ollama Service..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 3 2>$null
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        $modelCount = $data.models.Count
        Write-Host "  ✅ Ollama is running with $modelCount model(s)" -ForegroundColor Green
        
        # Check for MedGemma model
        $hasMedGemma = $false
        foreach ($model in $data.models) {
            if ($model.name -like "*medgemma*") {
                Write-Host "     ✅ Found MedGemma model: $($model.name)" -ForegroundColor Green
                $hasMedGemma = $true
                break
            }
        }
        
        if (-not $hasMedGemma) {
            Write-Host "     ⚠️  MedGemma model not found!" -ForegroundColor Yellow
            Write-Host "     Pull it with: ollama pull amsaravi/medgemma-4b-it:q6" -ForegroundColor Yellow
            $allGood = $false
        }
    }
} catch {
    Write-Host "  ❌ Ollama is NOT running on port 11434" -ForegroundColor Red
    Write-Host "     Start it with: ollama serve" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""

# Test 3: Check Next.js Frontend
Write-Host "[3/3] Checking Next.js Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 3 2>$null
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Next.js frontend is running on port 3000" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Next.js frontend returned status: $($response.StatusCode)" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ❌ Next.js frontend is NOT running on port 3000" -ForegroundColor Red
    Write-Host "     Start it with: npm run dev (in frontend folder)" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "" 
    Write-Host "  🎉 ALL SYSTEMS READY!" -ForegroundColor Green
    Write-Host "" 
    Write-Host "  You can now use the AI Diagnosis feature:" -ForegroundColor White
    Write-Host "  1. Open http://localhost:3000" -ForegroundColor White
    Write-Host "  2. Select a patient" -ForegroundColor White
    Write-Host "  3. Add medical images to session" -ForegroundColor White
    Write-Host "  4. Click 'Get AI Diagnosis'" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "" 
    Write-Host "  ⚠️  SOME SERVICES ARE NOT READY" -ForegroundColor Yellow
    Write-Host "" 
    Write-Host "  Please start the missing services and run this check again." -ForegroundColor White
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to close"

