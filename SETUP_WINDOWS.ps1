param(
    [string]$ProjectPath = "",
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    $ProjectPath = $PSScriptRoot
}

$ProjectPath = (Resolve-Path $ProjectPath).Path
Set-Location $ProjectPath

function Assert-Step {
    param([string]$Name)

    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE. Setup stopped."
    }
}

Write-Host ""
Write-Host "DispatchFlow Next.js Setup" -ForegroundColor Cyan
Write-Host "Project: $ProjectPath" -ForegroundColor DarkGray

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
    throw "package.json was not found. Run this script from the folder containing package.json, src and prisma."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js was not found. Install Node.js 22 LTS or newer and reopen PowerShell."
}

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
    throw "Corepack was not found. Reinstall Node.js and reopen PowerShell."
}

Write-Host "Node version:" -ForegroundColor Yellow
node -v
Assert-Step "Node version check"

$mysqlHost = Read-Host "MySQL host [127.0.0.1]"
if ([string]::IsNullOrWhiteSpace($mysqlHost)) { $mysqlHost = "127.0.0.1" }

$mysqlPort = Read-Host "MySQL port [3306]"
if ([string]::IsNullOrWhiteSpace($mysqlPort)) { $mysqlPort = "3306" }

$dbName = Read-Host "Database name [dispatchflow_nextjs]"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "dispatchflow_nextjs" }

$dbUser = Read-Host "MySQL username [root]"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "root" }

$dbPasswordSecure = Read-Host "MySQL password (press Enter if blank)" -AsSecureString
$dbPasswordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPasswordSecure)
try {
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($dbPasswordPtr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($dbPasswordPtr)
}

$encodedUser = [System.Uri]::EscapeDataString($dbUser)
$encodedPassword = [System.Uri]::EscapeDataString($dbPassword)

if ([string]::IsNullOrWhiteSpace($dbPassword)) {
    $databaseUrl = "mysql://${encodedUser}@${mysqlHost}:${mysqlPort}/${dbName}"
} else {
    $databaseUrl = "mysql://${encodedUser}:${encodedPassword}@${mysqlHost}:${mysqlPort}/${dbName}"
}

$existingGoogleClientId = ""
$existingGoogleSecret = ""
if (Test-Path ".env") {
    $existingEnv = Get-Content ".env" -Raw
    if ($existingEnv -match 'GOOGLE_CLIENT_ID="([^"]*)"') { $existingGoogleClientId = $Matches[1] }
    if ($existingEnv -match 'GOOGLE_CLIENT_SECRET="([^"]*)"') { $existingGoogleSecret = $Matches[1] }
}

$envText = @"
DATABASE_URL="$databaseUrl"
APP_URL="http://127.0.0.1:3000"
SESSION_COOKIE_NAME="dispatchflow_next_session"
SESSION_DAYS="30"
T2F_URL="https://truck2fleet.com/public/"
GOOGLE_CLIENT_ID="$existingGoogleClientId"
GOOGLE_CLIENT_SECRET="$existingGoogleSecret"
"@

[System.IO.File]::WriteAllText(
    (Join-Path $ProjectPath ".env"),
    $envText,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "Make sure Laragon MySQL/MariaDB is running." -ForegroundColor Yellow
Write-Host "Prisma will create the database if the MySQL user has permission." -ForegroundColor Yellow

Write-Host "Preparing pnpm..." -ForegroundColor Yellow
corepack prepare pnpm@10.13.1 --activate
Assert-Step "pnpm preparation"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
corepack pnpm install --no-frozen-lockfile
Assert-Step "Dependency installation"

Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
corepack pnpm exec prisma generate
Assert-Step "Prisma Client generation"

Write-Host "Creating/updating database tables..." -ForegroundColor Yellow
corepack pnpm exec prisma db push
Assert-Step "Prisma database push"

if (-not $SkipSeed) {
    $setupMarker = Join-Path $ProjectPath ".dispatchflow-setup-complete"
    $seedPrompt = if (Test-Path $setupMarker) {
        "Reset/load demo data? Existing portal data will be replaced. [y/N]"
    } else {
        "Load demo data and demo accounts? [Y/n]"
    }
    $seedAnswer = Read-Host $seedPrompt
    if ([string]::IsNullOrWhiteSpace($seedAnswer)) {
        $seedAnswer = if (Test-Path $setupMarker) { "N" } else { "Y" }
    }
    if ($seedAnswer -match '^[Yy]$') {
        Write-Host "Loading demo data..." -ForegroundColor Yellow
        corepack pnpm run db:seed
        Assert-Step "Database seed"
    } else {
        Write-Host "Demo seed skipped. Existing data was preserved." -ForegroundColor DarkYellow
    }
}

[System.IO.File]::WriteAllText((Join-Path $ProjectPath ".dispatchflow-setup-complete"), (Get-Date).ToString("o"))

Write-Host "Running TypeScript check..." -ForegroundColor Yellow
corepack pnpm run typecheck
Assert-Step "TypeScript check"

Write-Host "Running ESLint..." -ForegroundColor Yellow
corepack pnpm run lint
Assert-Step "ESLint"

Write-Host ""
Write-Host "SETUP COMPLETED SUCCESSFULLY." -ForegroundColor Green
Write-Host "Run: corepack pnpm dev" -ForegroundColor Green
Write-Host "Open: http://127.0.0.1:3000" -ForegroundColor Green
Write-Host "Google callback: http://127.0.0.1:3000/api/auth/google/callback" -ForegroundColor Green
