#!/bin/bash

# 🚀 COMPLETE EC2 FRESH START
# This script will:
# 1. Clean up old backups
# 2. Pull latest code
# 3. Rebuild everything
# 4. Restart services
# 5. Run debug tests

echo "========================================"
echo "🚀 EC2 COMPLETE FRESH START"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will:${NC}"
echo "  1. Stop all PM2 services"
echo "  2. Clean up old backup files"
echo "  3. Pull latest code from GitHub"
echo "  4. Rebuild backend and frontend"
echo "  5. Restart all services"
echo "  6. Show debug information"
echo ""

read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}=== STEP 1: Stop Services ===${NC}"
pm2 stop all
echo ""

echo -e "${BLUE}=== STEP 2: Cleanup Old Backups ===${NC}"
cd /home/ubuntu

# Remove old backups
echo "Removing old backups..."
rm -rf fyp 2>/dev/null && echo "  ✓ Removed fyp"
rm -rf fyp_system_old 2>/dev/null && echo "  ✓ Removed fyp_system_old"
rm -rf fyp_backup_20251219_123429 2>/dev/null && echo "  ✓ Removed fyp_backup_20251219_123429"
rm -rf fyp_system_backup_20251219_183025 2>/dev/null && echo "  ✓ Removed fyp_system_backup_20251219_183025"
rm -rf fyp_system_backup_20251219_183328 2>/dev/null && echo "  ✓ Removed fyp_system_backup_20251219_183328"
rm -rf backend_env_backup 2>/dev/null && echo "  ✓ Removed backend_env_backup"
rm -rf frontend_env_backup 2>/dev/null && echo "  ✓ Removed frontend_env_backup"
rm -f package-lock.json 2>/dev/null && echo "  ✓ Removed package-lock.json"
rm -f AuthContext.tsx 2>/dev/null && echo "  ✓ Removed AuthContext.tsx"

echo ""
echo -e "${GREEN}Remaining files:${NC}"
ls -lh
echo ""

echo -e "${BLUE}=== STEP 3: Pull Latest Code ===${NC}"
cd /home/ubuntu/fyp_system

echo "Current commit:"
git log --oneline -1

echo ""
echo "Pulling latest code..."
git stash 2>/dev/null
git pull origin main

echo ""
echo "Latest commit:"
git log --oneline -1
echo ""

echo -e "${BLUE}=== STEP 4: Rebuild Backend ===${NC}"
cd /home/ubuntu/fyp_system/backend

echo "Cleaning backend build..."
rm -rf dist node_modules/.cache

echo "Installing dependencies..."
npm install --silent

echo "Building backend..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend build successful${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}=== STEP 5: Rebuild Frontend ===${NC}"
cd /home/ubuntu/fyp_system/frontend

echo "Cleaning frontend build..."
rm -rf .next node_modules/.cache

echo "Installing dependencies..."
npm install --silent

echo "Building frontend (this may take 1-2 minutes)..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend build successful${NC}"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}=== STEP 6: Restart All Services ===${NC}"
cd /home/ubuntu/fyp_system
pm2 restart all

echo ""
echo "Waiting for services to start..."
sleep 5
echo ""

pm2 list
echo ""

echo -e "${BLUE}=== STEP 7: Check Service Logs ===${NC}"
echo "Backend logs:"
pm2 logs backend --lines 10 --nostream
echo ""

echo "Frontend logs:"
pm2 logs frontend --lines 10 --nostream
echo ""

echo -e "${BLUE}=== STEP 8: Test Backend API ===${NC}"
echo "Testing backend health..."
curl -s http://localhost:3000/purchase-requests >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
else
    echo -e "${RED}✗ Backend not responding (might need auth)${NC}"
fi
echo ""

echo -e "${BLUE}=== STEP 9: Database Status ===${NC}"
echo "Total claims in database:"
sudo -u postgres psql -d fyp_db -t -c "SELECT COUNT(*) FROM claims;" 2>/dev/null || echo "Could not check database"
echo ""

echo -e "${BLUE}=== STEP 10: Disk Space ===${NC}"
df -h /home/ubuntu
echo ""

echo "========================================"
echo -e "${GREEN}✅ FRESH START COMPLETE!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Open your browser: http://your-ec2-ip:3001"
echo "2. Hard refresh: Ctrl + Shift + R"
echo "3. Open DevTools: F12"
echo "4. Go to Console tab"
echo "5. Login as accountant"
echo "6. Go to Purchase Requests page"
echo "7. Look for [DEBUG] messages in console"
echo ""
echo -e "${BLUE}Expected console output:${NC}"
echo "  [DEBUG] Total requests loaded: X"
echo "  [DEBUG] Request 1: {hasClaims: 'YES', claimsCount: X, ...}"
echo ""
echo -e "${YELLOW}If claims still don't show, share:${NC}"
echo "  - Console [DEBUG] output"
echo "  - PM2 logs: pm2 logs --lines 50"
echo "  - Network tab response for /api/purchase-requests"
echo ""
echo -e "${GREEN}Everything is fresh and clean! 🎉${NC}"
echo ""
