param(
    [string]$LiveDir = "C:\ERP-Live",
    [string]$RepoUrl = "",
    [int]$Port = 8000,
    [switch]$ConfigureFirewall
)

$ErrorActionPreference = "Stop"
$devRoot = Split-Path -Parent $PSScriptRoot

if (-not $RepoUrl) {
    Push-Location $devRoot
    try {
        $RepoUrl = (git remote get-url origin).Trim()
    } finally {
        Pop-Location
    }
}

Write-Host "[Setup] Setting up Live LAN ERP at: $LiveDir" -ForegroundColor Cyan
Write-Host "[Setup] Git source (main branch): $RepoUrl" -ForegroundColor Cyan

# 1. Clone main branch into isolated Live directory
if (Test-Path (Join-Path $LiveDir ".git")) {
    Write-Host "  [SKIP] Git repository already exists at $LiveDir" -ForegroundColor Yellow
} else {
    git clone --branch main --single-branch $RepoUrl $LiveDir
    Write-Host "  [OK] Cloned main branch to $LiveDir" -ForegroundColor Green
}

# 2. Create Python virtualenv & install backend dependencies
$backendDir = Join-Path $LiveDir "Backend"
$venvPy = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    python -m venv (Join-Path $backendDir "venv")
    Write-Host "  [OK] Created Backend\venv" -ForegroundColor Green
}
& $venvPy -m pip install --upgrade pip
& $venvPy -m pip install -r (Join-Path $backendDir "requirements.txt")
Write-Host "  [OK] Installed Backend requirements" -ForegroundColor Green

# 3. Generate secure Backend\.env if not present
$envFile = Join-Path $backendDir ".env"
if (-not (Test-Path $envFile)) {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secretKey = [Convert]::ToBase64String($bytes) -replace '[+/=]', 'x'

    $lanIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } |
        Select-Object -ExpandProperty IPAddress
    $hostsList = (@("127.0.0.1", "localhost") + $lanIps) | Select-Object -Unique
    $allowedHosts = $hostsList -join ","

    $envContent = @"
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=$secretKey
DJANGO_ALLOWED_HOSTS=$allowedHosts
DB_ENGINE=sqlite
DJANGO_ENABLE_HTTPS=False
"@
    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Host "  [OK] Generated secure Backend\.env (ALLOWED_HOSTS=$allowedHosts)" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] Backend\.env already exists" -ForegroundColor Yellow
}

# 4. Run Django migrate + collectstatic + check
Push-Location $backendDir
try {
    & $venvPy manage.py migrate --noinput
    & $venvPy manage.py collectstatic --noinput
    & $venvPy manage.py check
    Write-Host "  [OK] Django migrations, static files, and checks complete" -ForegroundColor Green
} finally {
    Pop-Location
}

# 5. Build Frontend production bundle
$frontendDir = Join-Path $LiveDir "Frontend"
Push-Location $frontendDir
try {
    if (Test-Path "package-lock.json") {
        npm ci
    } else {
        npm install
    }
    npm run build
    Write-Host "  [OK] Frontend production bundle built" -ForegroundColor Green
} finally {
    Pop-Location
}

# 6. Optional Windows Firewall rule (Private & Domain networks ONLY - never Public)
if ($ConfigureFirewall) {
    $ruleName = "Furniture ERP LAN (Port $Port)"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        New-NetFirewallRule `
            -DisplayName $ruleName `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort $Port `
            -Action Allow `
            -Profile Private,Domain | Out-Null
        Write-Host "  [OK] Firewall rule created for Private/Domain LAN on TCP $Port" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] Firewall rule '$ruleName' already exists" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[Setup Complete]" -ForegroundColor Cyan
Write-Host "1. If migrating existing data, copy your db.sqlite3 and media/ into $LiveDir\Backend\"
Write-Host "2. Start the server anytime using: $LiveDir\scripts\start-lan-server.bat"
Write-Host "3. Deploy future updates safely using: $LiveDir\scripts\deploy-live.bat"
