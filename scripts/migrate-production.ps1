# ==============================================================================
# INTENTIONAL PRODUCTION DATABASE MIGRATION SCRIPT
# Project: Django ERP Furniture
# ==============================================================================
# Usage:
#   .\scripts\migrate-production.ps1
#
# Or with temporary environment variable:
#   $env:DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
#   .\scripts\migrate-production.ps1
#   Remove-Item Env:DATABASE_URL
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Red
Write-Host " [CRITICAL WARNING] PRODUCTION DATABASE MIGRATION" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Red
Write-Host "You are about to execute Django migrations against the PRODUCTION NEON DATABASE." -ForegroundColor Yellow
Write-Host "This operation will alter tables and database schemas in PRODUCTION." -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Red
Write-Host ""

# 1. Require Explicit Human Confirmation
$confirmation = Read-Host "Type exactly 'MIGRATE-PRODUCTION' to proceed"

if ($confirmation -ne "MIGRATE-PRODUCTION") {
    Write-Host "[CANCELLED] Migration aborted. Confirmation string did not match." -ForegroundColor Cyan
    exit 1
}

# 2. Retrieve DATABASE_URL securely without printing or logging credentials
$prodUrl = $env:DATABASE_URL

if ([string]::IsNullOrWhiteSpace($prodUrl)) {
    Write-Host ""
    $secureUrl = Read-Host -AsSecureString "Paste Production Neon DATABASE_URL (input will be hidden)"
    if ($secureUrl) {
        $prodUrl = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl))
    }
}

if ([string]::IsNullOrWhiteSpace($prodUrl)) {
    Write-Host "[ERROR] No DATABASE_URL provided. Migration cancelled." -ForegroundColor Red
    exit 1
}

# 3. Set Temporary Environment Variable ONLY for the duration of migration execution
Write-Host ""
Write-Host "[ACTION] Setting temporary DATABASE_URL for migration execution..." -ForegroundColor Cyan

$env:DATABASE_URL = $prodUrl

try {
    # Determine python executable path
    $pythonCmd = "python"
    if (Test-Path "Backend\venv\Scripts\python.exe") {
        $pythonCmd = "Backend\venv\Scripts\python.exe"
    }

    Write-Host "[ACTION] Executing: $pythonCmd manage.py migrate against Production..." -ForegroundColor Green
    
    # Run django migrate from Backend directory
    Push-Location "Backend"
    & $pythonCmd manage.py migrate
    Pop-Location

    Write-Host ""
    Write-Host "[SUCCESS] Production migrations completed successfully!" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Migration failed: $_" -ForegroundColor Red
}
finally {
    # 4. ALWAYS Clean up and remove temporary DATABASE_URL environment variable
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    $prodUrl = $null
    
    Write-Host ""
    Write-Host "[CLEANUP] Temporary DATABASE_URL environment variable has been cleared." -ForegroundColor Cyan
    Write-Host "[VERIFY] Local environment is restored to localhost:5432 / erp_furniture_db." -ForegroundColor Green
}
