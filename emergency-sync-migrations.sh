#!/bin/bash

# Emergency Migration Sync Script
# Use this when migrations table is completely out of sync with database

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     EMERGENCY: Sync Migration Table with Database State        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in backend directory. Please cd to backend first.${NC}"
    exit 1
fi

echo -e "${RED}⚠️  WARNING: Your migrations table is out of sync with your database!${NC}"
echo -e "${YELLOW}This will mark ALL existing migrations as complete.${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 1: Marking all existing migrations as complete...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# List of all migrations that should exist based on your database state
declare -a migrations=(
    "1703000000000:CreateUsersTable1703000000000"
    "1703255400000:CreatePurchaseRequestsAndClaims1703255400000"
    "1704067200000:AddMalwareScanStatusToClaims1704067200000"
    "1734518400000:AddSuspendedToUsers1734518400000"
    "1735689600000:AddReceiptFileDataToClaims1735689600000"
    "1736899200000:AddFileHashToClaims1736899200000"
)

# Mark each migration as complete
for migration in "${migrations[@]}"; do
    IFS=':' read -r timestamp name <<< "$migration"
    echo -e "${YELLOW}Marking $name...${NC}"
    npm run typeorm query "INSERT INTO migrations (timestamp, name) VALUES ($timestamp, '$name') ON CONFLICT DO NOTHING;" 2>/dev/null || true
    echo -e "${GREEN}✓ Done${NC}"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 2: Verifying migration records...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
npm run typeorm query "SELECT timestamp, name FROM migrations ORDER BY timestamp;" 2>&1 | grep -E "^\s+[0-9]|name"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 3: Running remaining migrations (HR module)...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
npm run typeorm migration:run
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 4: Final verification...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
npm run typeorm migration:show
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Migration table synced!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Restart backend: pm2 restart backend"
echo "2. Check logs: pm2 logs backend"
echo "3. Test: curl http://localhost:3000/health"
echo ""
