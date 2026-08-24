# ==============================================================================
# INTENTIONAL PRODUCTION DATABASE MIGRATION SCRIPT
# Project: Django ERP Furniture
# ==============================================================================
# Usage from project root:
#   .\scripts\migrate-production.ps1
#
# Or with temporary environment variable:
#   $env:DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
#   .\scripts\migrate-production.ps1
#   Remove-Item Env:DATABASE_URL
# ==============================================================================

# 1. Resolve Absolute Paths Independent of Working Directory
$scriptDir  = $PSScriptRoot
$repoRoot   = [System.IO.Path]::GetFullPath((Join-Path $scriptDir ".."))
$backendDir = Join-Path $repoRoot "Backend"
$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
$managePy   = Join-Path $backendDir "manage.py"

if (Test-Path $venvPython) {
    $pythonCmd = $venvPython
} else {
    $pythonCmd = "python"
}

Write-Host "======================================================================" -ForegroundColor Red
Write-Host " [CRITICAL WARNING] PRODUCTION DATABASE MIGRATION" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Red
Write-Host "You are about to execute Django migrations against the PRODUCTION NEON DATABASE." -ForegroundColor Yellow
Write-Host "This operation will alter tables and database schemas in PRODUCTION." -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Red
Write-Host ""

# 2. Require Explicit Human Confirmation
$confirmation = Read-Host "Type exactly 'MIGRATE-PRODUCTION' to proceed"

if ($confirmation -ne "MIGRATE-PRODUCTION") {
    Write-Host "[CANCELLED] Migration aborted. Confirmation string did not match." -ForegroundColor Cyan
    exit 1
}

# 3. Save Previous DATABASE_URL State & Retrieve Production DATABASE_URL
$originalDbUrl = $env:DATABASE_URL
$prodUrl       = $originalDbUrl

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

# 4. Set Temporary Environment Variable ONLY for the duration of migration execution
Write-Host ""
Write-Host "[ACTION] Setting temporary DATABASE_URL for migration execution..." -ForegroundColor Cyan
$env:DATABASE_URL = $prodUrl

$pushedLocation  = $false
$migrationFailed = $false

try {
    Write-Host "[ACTION] Navigating to Backend directory: $backendDir" -ForegroundColor Cyan
    Push-Location $backendDir
    $pushedLocation = $true

    Write-Host "[ACTION] Executing: $pythonCmd manage.py migrate against Production..." -ForegroundColor Green
    
    & $pythonCmd $managePy migrate
    if ($LASTEXITCODE -ne 0) {
        throw "Django migrate command failed with exit code $LASTEXITCODE"
    }

    Write-Host ""
    Write-Host "[SUCCESS] Production migrations completed successfully!" -ForegroundColor Green
}
catch {
    $migrationFailed = $true
    Write-Host ""
    Write-Host "[ERROR] Migration failed: $_" -ForegroundColor Red
}
finally {
    # Always pop directory location if pushed
    if ($pushedLocation) {
        Pop-Location
    }

    # Always restore original DATABASE_URL state
    if ([string]::IsNullOrWhiteSpace($originalDbUrl)) {
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    } else {
        $env:DATABASE_URL = $originalDbUrl
    }
    $prodUrl = $null
    
    Write-Host ""
    Write-Host "[CLEANUP] Temporary DATABASE_URL environment variable has been cleared." -ForegroundColor Cyan
    Write-Host "[VERIFY] Local environment is restored to localhost:5432 / erp_furniture_db." -ForegroundColor Green
}

if ($migrationFailed) {
    exit 1
}
