param(
    [string]$LiveDir = (Split-Path -Parent $PSScriptRoot),
    [string]$TargetRef = "HEAD~1",
    [string]$BackupRoot = "C:\ERP-Backups"
)

$ErrorActionPreference = "Stop"

Write-Host "[Rollback] Preparing rollback in $LiveDir -> $TargetRef" -ForegroundColor Yellow

Push-Location $LiveDir
try {
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    if ($branch -ne "main") {
        throw "Rollback is only allowed on 'main' branch (current: '$branch')."
    }

    $dirty = git status --porcelain
    if ($dirty) {
        throw "Working tree is not clean. Resolve uncommitted files before rolling back."
    }

    # Always snapshot before rolling back
    & (Join-Path $LiveDir "scripts\backup-erp.ps1") -ProjectRoot $LiveDir -BackupRoot $BackupRoot

    $resolved = (git rev-parse --short $TargetRef).Trim()
    git reset --hard $TargetRef
    Write-Host "  [OK] Rolled back main to $resolved" -ForegroundColor Green
} finally {
    Pop-Location
}

# Rebuild Frontend + collectstatic for the restored commit
Push-Location (Join-Path $LiveDir "Frontend")
try {
    npm run build
} finally {
    Pop-Location
}

$backendDir = Join-Path $LiveDir "Backend"
$venvPy = Join-Path $backendDir "venv\Scripts\python.exe"
Push-Location $backendDir
try {
    & $venvPy manage.py collectstatic --noinput
    & $venvPy manage.py check
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "[Rollback Complete]" -ForegroundColor Yellow
Write-Host "- Restart scripts\start-lan-server.bat to serve the restored version."
Write-Host "- Note: If the rolled-back release applied DB migrations, restore db.sqlite3 from your pre-deploy backup in $BackupRoot."
