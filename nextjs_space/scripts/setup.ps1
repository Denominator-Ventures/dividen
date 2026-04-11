# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  DiviDen — One-Command Setup (Windows PowerShell)                           ║
# ║  Usage: .\scripts\setup.ps1                                                 ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
$ErrorActionPreference = "Stop"

function Info($msg) { Write-Host "[info]  $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "[ok]    $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[warn]  $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[fail]  $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  DiviDen - Setup Wizard" -ForegroundColor White
Write-Host "  =====================" -ForegroundColor DarkGray
Write-Host ""

# ── 1. Check prerequisites ──────────────────────────────────────────────────
Info "Checking prerequisites..."

try {
    $nodeVer = (node -v) -replace 'v',''
    $major = [int]($nodeVer.Split('.')[0])
    if ($major -lt 18) { Fail "Node.js $nodeVer found, but 18+ is required." }
    Ok "Node.js v$nodeVer"
} catch {
    Fail "Node.js is not installed. Install from https://nodejs.org"
}

# Detect package manager
$usesYarn = $false
try { yarn --version | Out-Null; $usesYarn = $true } catch {}

if ($usesYarn) {
    $pkgInstall = "yarn install"
    Ok "Package manager: yarn"
} else {
    $pkgInstall = "npm install"
    Ok "Package manager: npm"
}

# ── 2. Install dependencies ─────────────────────────────────────────────────
Info "Installing dependencies..."
Invoke-Expression $pkgInstall
Ok "Dependencies installed"

# ── 3. Environment file ─────────────────────────────────────────────────────
if (!(Test-Path .env)) {
    Info "Creating .env from .env.example..."
    Copy-Item .env.example .env

    $secret = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    (Get-Content .env) -replace 'CHANGE_ME_GENERATE_A_REAL_SECRET', $secret | Set-Content .env
    Ok "Created .env with generated secret"
    Warn "Edit .env to set your DATABASE_URL if not using docker-compose"
} else {
    Ok ".env already exists - skipping"
}

# ── 4. Database ─────────────────────────────────────────────────────────────
Info "Checking database..."
$dbUrl = (Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=',''

if ($dbUrl -match 'localhost:5432/dividen') {
    try {
        docker compose version | Out-Null
        Info "Starting local PostgreSQL via docker-compose..."
        docker compose up -d --wait 2>$null
        Start-Sleep -Seconds 3
        Ok "Local PostgreSQL running on port 5432"
    } catch {
        Warn "Docker not available. Make sure your DATABASE_URL in .env is reachable."
    }
}

# ── 5. Prisma ───────────────────────────────────────────────────────────────
Info "Generating Prisma client..."
npx prisma generate
Ok "Prisma client generated"

Info "Running database migrations..."
try {
    npx prisma migrate deploy
    Ok "Migrations applied"
} catch {
    Warn "Migrations failed - trying db push as fallback..."
    try {
        npx prisma db push --skip-generate
        Ok "Schema pushed"
    } catch {
        Fail "Database setup failed. Check your DATABASE_URL in .env"
    }
}

# ── 6. Seed ─────────────────────────────────────────────────────────────────
Info "Seeding database..."
try {
    npx tsx scripts/seed.ts
    Ok "Database seeded"
} catch {
    Warn "Seed skipped (may already have data)"
}

# ── 7. Done ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  DiviDen is ready!" -ForegroundColor Green
Write-Host "  ================" -ForegroundColor Green
Write-Host ""
Write-Host "  Start the dev server:" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Then open: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  First time? Create your account at /setup" -ForegroundColor White
Write-Host "  Or log in with the seeded account:" -ForegroundColor White
Write-Host "    Email:    admin@dividen.ai" -ForegroundColor Gray
Write-Host "    Password: DiviDen2024!" -ForegroundColor Gray
Write-Host ""
Write-Host "  Health check: http://localhost:3000/api/status" -ForegroundColor White
Write-Host "  Admin panel:  http://localhost:3000/admin" -ForegroundColor White
Write-Host ""
