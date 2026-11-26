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

# Parse Backend\.env if present
$envFile = Join-Path $ProjectRoot "Backend\.env"
$envMap = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line -split "=", 2
            $envMap[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
        }
    }
    Copy-Item -Path $envFile -Destination (Join-Path $targetDir "Backend.env.bak") -Force
    Write-Host "  [OK] Environment config backed up -> Backend.env.bak" -ForegroundColor Green
}

# 1. Database backup (PostgreSQL via pg_dump, or SQLite online backup)
$dbEngine = ($envMap["DB_ENGINE"] | Out-String).Trim().ToLower()
if ($dbEngine -eq "sqlite") {
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
        Write-Host "  [OK] SQLite database backed up -> db.sqlite3" -ForegroundColor Green
    }
} elseif ($envMap.ContainsKey("DB_NAME") -and $envMap["DB_NAME"]) {
    $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    if (-not $pgDump) {
        $pgDump = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
    }
    if ($pgDump) {
        $dumpDest = Join-Path $targetDir "postgres_backup.dump"
        $prevPgPass = $env:PGPASSWORD
        $env:PGPASSWORD = $envMap["DB_PASSWORD"]
        try {
            $dbHost = if ($envMap["DB_HOST"]) { $envMap["DB_HOST"] } else { "localhost" }
            $dbPort = if ($envMap["DB_PORT"]) { $envMap["DB_PORT"] } else { "5432" }
            $dbUser = if ($envMap["DB_USER"]) { $envMap["DB_USER"] } else { "postgres" }
            & $pgDump -h $dbHost -p $dbPort -U $dbUser -F c -f $dumpDest $envMap["DB_NAME"]
            if ($LASTEXITCODE -ne 0) { throw "pg_dump exited with code $LASTEXITCODE" }
            Write-Host "  [OK] PostgreSQL database backed up -> postgres_backup.dump" -ForegroundColor Green
        } finally {
            $env:PGPASSWORD = $prevPgPass
        }
    } else {
        Write-Warning "  [WARN] pg_dump.exe not found; skipped PostgreSQL dump. Add PostgreSQL bin folder to PATH."
    }
}

# 2. Backup media files (supports custom MEDIA_ROOT or Backend\media)
$mediaPath = if ($envMap["MEDIA_ROOT"] -and (Test-Path $envMap["MEDIA_ROOT"])) {
    $envMap["MEDIA_ROOT"]
} else {
    Join-Path $ProjectRoot "Backend\media"
}
if (Test-Path $mediaPath) {
    $mediaDest = Join-Path $targetDir "media"
    Copy-Item -Path $mediaPath -Destination $mediaDest -Recurse -Force
    Write-Host "  [OK] Media files backed up -> media\" -ForegroundColor Green
}

# 3. Create offline portable Git bundle (all branches & tags)
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

# 4. Retention cleanup (keep newest $KeepCount backups)
$existing = Get-ChildItem -Path $BackupRoot -Directory | Sort-Object Name -Descending
if ($existing.Count -gt $KeepCount) {
    $toDelete = $existing | Select-Object -Skip $KeepCount
    foreach ($old in $toDelete) {
        Remove-Item -Path $old.FullName -Recurse -Force
        Write-Host "  [CLEAN] Removed old backup: $($old.Name)" -ForegroundColor DarkGray
    }
}

Write-Host "[Backup] Done." -ForegroundColor Cyan
