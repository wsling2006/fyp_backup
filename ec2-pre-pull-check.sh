#!/bin/bash

# EC2 Pre-Pull Verification Script
# Run this ON EC2 to check the current state before pulling changes

echo "=================================================="
echo "EC2 Pre-Pull Verification"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in backend directory. Please cd to backend first.${NC}"
    exit 1
fi

echo "1️⃣  Checking Git Status..."
echo "----------------------------"
git status
echo ""

echo "2️⃣  Checking Current Branch..."
echo "----------------------------"
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"
echo ""

echo "3️⃣  Checking Remote Changes..."
echo "----------------------------"
git fetch origin
BEHIND=$(git rev-list HEAD..origin/$BRANCH --count)
echo "Commits behind origin: $BEHIND"
if [ "$BEHIND" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Your local code is $BEHIND commits behind GitHub${NC}"
    echo "You need to pull changes!"
else
    echo -e "${GREEN}✅ Local code is up to date${NC}"
fi
echo ""

echo "4️⃣  Checking Migration File (Current)..."
echo "----------------------------"
if grep -q "Check if column already exists" src/migrations/1704067200000-AddMalwareScanStatusToClaims.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Migration file has the fix (column existence check)${NC}"
else
    echo -e "${RED}❌ Migration file does NOT have the fix${NC}"
    echo "First few lines of migration:"
    head -15 src/migrations/1704067200000-AddMalwareScanStatusToClaims.ts 2>/dev/null
fi
echo ""

echo "5️⃣  Checking Database Migration Status..."
echo "----------------------------"
if command -v npm &> /dev/null; then
    npm run typeorm migration:show 2>/dev/null || echo "Could not check migration status"
else
    echo "npm not found, skipping migration check"
fi
echo ""

echo "6️⃣  Checking if malware_scan_status column exists in database..."
echo "----------------------------"
# This requires database credentials - adjust as needed
if command -v psql &> /dev/null; then
    echo "Run this command to check:"
    echo "psql -h localhost -U your_user -d your_db -c \"SELECT column_name FROM information_schema.columns WHERE table_name='claims' AND column_name='malware_scan_status';\""
else
    echo "psql not found, cannot check database"
fi
echo ""

echo "=================================================="
echo "Summary"
echo "=================================================="
if [ "$BEHIND" -gt 0 ]; then
    echo -e "${YELLOW}📥 ACTION REQUIRED: Pull changes from GitHub${NC}"
    echo ""
    echo "Run these commands:"
    echo "  git stash                    # Save local changes"
    echo "  git pull origin $BRANCH      # Pull remote changes"
    echo "  npm install                  # Update dependencies"
    echo "  npm run build                # Rebuild TypeScript"
    echo "  npm run typeorm migration:run  # Run migrations"
    echo "  pm2 restart backend          # Restart app"
else
    echo -e "${GREEN}✅ No pull needed, local is up to date${NC}"
fi
echo ""
