param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [int]$Port = 8000,
    [int]$Threads = 8
)

$ErrorActionPreference = "Stop"

$backendDir = Join-Path $ProjectRoot "Backend"
$frontendDist = Join-Path $ProjectRoot "Frontend\dist\index.html"
$pyExe = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path $pyExe)) {
    throw "Backend virtualenv not found at $pyExe. Run scripts\setup-live-lan.ps1 first."
}

$envFile = Join-Path $backendDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Warning "Backend\.env not found! Copy Backend\.env.example to Backend\.env for production security."
}

if (-not (Test-Path $frontendDist)) {
    Write-Warning "Frontend\dist\index.html not found! Building frontend first..."
    Push-Location (Join-Path $ProjectRoot "Frontend")
    try {
        npm run build
    } finally {
        Pop-Location
    }
}

# Detect LAN IPv4 addresses for display
$lanIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Furniture ERP - LAN Production Server  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Local URL : http://127.0.0.1:$Port" -ForegroundColor Green
foreach ($ip in $lanIps) {
    Write-Host "  LAN URL   : http://${ip}:$Port" -ForegroundColor Green
}
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor DarkGray
Write-Host ""

Push-Location $backendDir
try {
    & $pyExe -c "import waitress" 2>$null
    if ($LASTEXITCODE -eq 0) {
        & $pyExe -m waitress --host=0.0.0.0 --port=$Port --threads=$Threads core.wsgi:application
    } else {
        Write-Warning "waitress is not installed in Backend\venv. Install with: Backend\venv\Scripts\pip.exe install waitress"
        Write-Warning "Falling back to Django runserver (--noreload --nostatic)..."
        & $pyExe manage.py runserver "0.0.0.0:$Port" --noreload --nostatic
    }
} finally {
    Pop-Location
}
