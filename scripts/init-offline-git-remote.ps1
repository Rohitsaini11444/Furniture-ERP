param(
    [string]$BareRepoPath = "D:\ERP-Git-Server\Furniture-ERP.git"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $BareRepoPath)) {
    New-Item -ItemType Directory -Path $BareRepoPath -Force | Out-Null
    git init --bare $BareRepoPath
    Write-Host "[OK] Created bare offline Git repository at: $BareRepoPath" -ForegroundColor Green
} else {
    Write-Host "[SKIP] Bare repository already exists at: $BareRepoPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To use this 100% offline LAN Git repository from your Dev PC:" -ForegroundColor Cyan
Write-Host "  git remote add lan `"$BareRepoPath`""
Write-Host "  git push lan development"
Write-Host "  git push lan main"
Write-Host ""
Write-Host "Or if sharing over office LAN (e.g. \\SERVER-PC\ERP-Git\Furniture-ERP.git):" -ForegroundColor Cyan
Write-Host "  git remote add lan `"\\SERVER-PC\ERP-Git\Furniture-ERP.git`""
Write-Host "  git clone --branch main --single-branch `"\\SERVER-PC\ERP-Git\Furniture-ERP.git`" C:\ERP-Live"
