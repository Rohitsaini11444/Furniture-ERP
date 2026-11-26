param(
    [string]$LiveDir = (Split-Path -Parent $PSScriptRoot),
    [string]$BackupRoot = "C:\ERP-Backups",
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"

Write-Host "[Deploy] Starting safe Live LAN deploy in $LiveDir" -ForegroundColor Cyan

Push-Location $LiveDir
try {
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    if ($branch -ne "main") {
        throw "Refusing to deploy: current branch is '$branch', expected 'main'."
    }

    $dirty = git status --porcelain
    if ($dirty) {
        throw "Working tree in $LiveDir has uncommitted changes. Commit, stash, or clean before deploying."
    }

    # 1. Pre-deploy safety backup (DB + .env + media + git bundle)
    & (Join-Path $LiveDir "scripts\backup-erp.ps1") -ProjectRoot $LiveDir -BackupRoot $BackupRoot

    # 2. Pull latest verified main branch
    git fetch origin main
    git pull --ff-only origin main
    Write-Host "  [OK] Pulled latest origin/main" -ForegroundColor Green
} finally {
    Pop-Location
}

# 3. Backend dependencies, migrations, static files, and config check
$backendDir = Join-Path $LiveDir "Backend"
$venvPy = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    throw "Backend virtualenv not found at $venvPy"
}

Push-Location $backendDir
try {
    & $venvPy -m pip install -r requirements.txt --quiet
    & $venvPy manage.py migrate --noinput
    & $venvPy manage.py collectstatic --noinput
    & $venvPy manage.py check
    Write-Host "  [OK] Backend updated and verified" -ForegroundColor Green
} finally {
    Pop-Location
}

# 4. Rebuild Frontend production bundle
if (-not $SkipFrontendBuild) {
    Push-Location (Join-Path $LiveDir "Frontend")
    try {
        npm run build
        Write-Host "  [OK] Frontend production build complete" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "[Deploy Complete] Restart scripts\start-lan-server.bat if it is currently running." -ForegroundColor Cyan
