#!/bin/bash

# ===========================================
# Mainstream Database Migration Script
# ===========================================
# Runs all database migrations in order

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

echo -e "${CYAN}${BOLD}"
echo "═══════════════════════════════════════════════════════════"
echo "  Mainstream Database Migration"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    print_error ".env file not found. Run ./setup.sh first."
    exit 1
fi

# Check if database is accessible
print_step "Checking database connection..."

# Wait for database to be ready
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T db pg_isready -U postgres -h localhost > /dev/null 2>&1; then
        print_success "Database is ready"
        break
    fi
    echo "Waiting for database... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Database is not accessible. Make sure containers are running."
    exit 1
fi

# Run migrations
print_step "Running migrations..."
echo ""

MIGRATION_DIR="scripts/migrations"
MIGRATION_COUNT=0
ERROR_COUNT=0

for migration in $(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
    filename=$(basename "$migration")
    echo -n "  Running $filename... "
    
    if docker compose exec -T db psql -U postgres -d postgres -f "/migrations/$filename" > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    else
        # Try to run it anyway and capture the error
        if docker compose exec -T db psql -U postgres -d postgres -f "/migrations/$filename" 2>&1 | grep -q "already exists"; then
            echo -e "${YELLOW}SKIPPED (already applied)${NC}"
        else
            echo -e "${RED}ERROR${NC}"
            ERROR_COUNT=$((ERROR_COUNT + 1))
        fi
    fi
done

echo ""

if [ $ERROR_COUNT -gt 0 ]; then
    print_error "$ERROR_COUNT migrations failed. Check the errors above."
    exit 1
else
    print_success "All migrations completed successfully ($MIGRATION_COUNT total)"
fi

echo ""
echo -e "${GREEN}${BOLD}Database is ready!${NC}"
echo ""
echo "You can now access Mainstream at your configured URL."

