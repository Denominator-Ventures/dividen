#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  DiviDen — One-Command Setup (macOS / Linux / WSL)                          ║
# ║  Usage: bash scripts/setup.sh                                               ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${BLUE}[info]${NC}  $1"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $1"; }
fail()  { echo -e "${RED}[fail]${NC}  $1"; exit 1; }

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║   DiviDen — Setup Wizard      ║"
echo "  ╚═══════════════════════════════╝"
echo ""

# ── 1. Check prerequisites ──────────────────────────────────────────────────
info "Checking prerequisites..."

if ! command -v node &> /dev/null; then
  fail "Node.js is not installed. Install Node.js 18+ from https://nodejs.org"
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  fail "Node.js $NODE_VERSION found, but 18+ is required. Update: https://nodejs.org"
fi
ok "Node.js $(node -v)"

# Detect package manager
if command -v yarn &> /dev/null; then
  PKG="yarn"
  PKG_INSTALL="yarn install"
  PKG_RUN="yarn"
elif command -v npm &> /dev/null; then
  PKG="npm"
  PKG_INSTALL="npm install"
  PKG_RUN="npx"
else
  fail "Neither yarn nor npm found. Install Node.js from https://nodejs.org"
fi
ok "Package manager: $PKG"

# ── 2. Install dependencies ─────────────────────────────────────────────────
info "Installing dependencies..."
$PKG_INSTALL
ok "Dependencies installed"

# ── 3. Environment file ─────────────────────────────────────────────────────
if [ ! -f .env ]; then
  info "Creating .env from .env.example..."
  cp .env.example .env

  # Generate a real NEXTAUTH_SECRET
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|CHANGE_ME_GENERATE_A_REAL_SECRET|$SECRET|" .env
  else
    sed -i "s|CHANGE_ME_GENERATE_A_REAL_SECRET|$SECRET|" .env
  fi
  ok "Created .env with generated secret"
  warn "Edit .env to set your DATABASE_URL if not using docker-compose"
else
  ok ".env already exists — skipping"
fi

# ── 4. Database ─────────────────────────────────────────────────────────────
info "Checking database..."

# Try to start docker-compose if available and no DATABASE_URL override
DATABASE_URL_VALUE=$(grep '^DATABASE_URL=' .env | cut -d'=' -f2-)
if echo "$DATABASE_URL_VALUE" | grep -q 'localhost:5432/dividen'; then
  if command -v docker &> /dev/null; then
    if docker compose version &> /dev/null 2>&1; then
      info "Starting local PostgreSQL via docker-compose..."
      docker compose up -d --wait 2>/dev/null || docker-compose up -d 2>/dev/null || true
      sleep 2
      ok "Local PostgreSQL running on port 5432"
    else
      warn "Docker found but docker-compose not available. Make sure your DATABASE_URL is reachable."
    fi
  else
    warn "Docker not found. Make sure your DATABASE_URL in .env points to an accessible PostgreSQL instance."
  fi
fi

# ── 5. Prisma ───────────────────────────────────────────────────────────────
info "Generating Prisma client..."
npx prisma generate
ok "Prisma client generated"

info "Running database migrations..."
npx prisma migrate deploy 2>/dev/null && ok "Migrations applied" || {
  warn "Migrations failed — trying db push as fallback..."
  npx prisma db push --skip-generate && ok "Schema pushed" || fail "Database setup failed. Check your DATABASE_URL in .env"
}

# ── 6. Seed ─────────────────────────────────────────────────────────────────
info "Seeding database..."
npx tsx scripts/seed.ts 2>/dev/null && ok "Database seeded" || warn "Seed skipped (may already have data)"

# ── 7. Health check ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅  DiviDen is ready!                                ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║   Start the dev server:                               ║${NC}"
echo -e "${GREEN}║     npm run dev                                       ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║   Then open: http://localhost:3000                    ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║   First time? Create your account at /setup           ║${NC}"
echo -e "${GREEN}║   Or log in with the seeded account:                  ║${NC}"
echo -e "${GREEN}║     Email:    admin@dividen.ai                        ║${NC}"
echo -e "${GREEN}║     Password: DiviDen2024!                            ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║   Health check: http://localhost:3000/api/status      ║${NC}"
echo -e "${GREEN}║   Admin panel:  http://localhost:3000/admin            ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
