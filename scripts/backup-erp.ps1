param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$BackupRoot = "C:\ERP-Backups",
    [int]$KeepCount = 30
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$targetDir = Join-Path $BackupRoot $timestamp
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

Write-Host "[Backup] Creating snapshot at $targetDir" -ForegroundColor Cyan

# 1. Safe online SQLite backup (safe even while server is running)
$dbPath = Join-Path $ProjectRoot "Backend\db.sqlite3"
$pyExe = Join-Path $ProjectRoot "Backend\venv\Scripts\python.exe"
if (-not (Test-Path $pyExe)) { $pyExe = "python" }

if (Test-Path $dbPath) {
    $dbDest = Join-Path $targetDir "db.sqlite3"
    $pyScript = @"
import sqlite3, sys
src = sqlite3.connect(sys.argv[1])
dst = sqlite3.connect(sys.argv[2])
with dst:
    src.backup(dst)
dst.close()
src.close()
"@
    & $pyExe -c $pyScript $dbPath $dbDest
    Write-Host "  [OK] Database backed up -> db.sqlite3" -ForegroundColor Green
}

# 2. Backup .env secrets
$envPath = Join-Path $ProjectRoot "Backend\.env"
if (Test-Path $envPath) {
    Copy-Item -Path $envPath -Destination (Join-Path $targetDir "Backend.env.bak") -Force
    Write-Host "  [OK] Environment config backed up -> Backend.env.bak" -ForegroundColor Green
}

# 3. Backup media files
$mediaPath = Join-Path $ProjectRoot "Backend\media"
if (Test-Path $mediaPath) {
    $mediaDest = Join-Path $targetDir "media"
    Copy-Item -Path $mediaPath -Destination $mediaDest -Recurse -Force
    Write-Host "  [OK] Media files backed up -> media\" -ForegroundColor Green
}

# 4. Create offline portable Git bundle (all branches & tags)
if (Test-Path (Join-Path $ProjectRoot ".git")) {
    $bundleDest = Join-Path $targetDir "repo.bundle"
    Push-Location $ProjectRoot
    try {
        git bundle create $bundleDest --all | Out-Null
        Write-Host "  [OK] Git repository bundle created -> repo.bundle" -ForegroundColor Green
    } catch {
        Write-Warning "  [WARN] Could not create git bundle: $_"
    } finally {
        Pop-Location
    }
}

# 5. Retention cleanup (keep newest $KeepCount backups)
$existing = Get-ChildItem -Path $BackupRoot -Directory | Sort-Object Name -Descending
if ($existing.Count -gt $KeepCount) {
    $toDelete = $existing | Select-Object -Skip $KeepCount
    foreach ($old in $toDelete) {
        Remove-Item -Path $old.FullName -Recurse -Force
        Write-Host "  [CLEAN] Removed old backup: $($old.Name)" -ForegroundColor DarkGray
    }
}

Write-Host "[Backup] Done." -ForegroundColor Cyan
