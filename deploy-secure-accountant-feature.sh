#!/bin/bash

################################################################################
# 🔒 SECURE ACCOUNTANT DOWNLOAD - DEPLOYMENT SCRIPT
# 
# This script deploys the secure accountant receipt download feature to EC2
# 
# Usage: ./deploy-secure-accountant-feature.sh
################################################################################

set -e  # Exit on any error

echo "========================================================================"
echo "🔒 DEPLOYING SECURE ACCOUNTANT RECEIPT DOWNLOAD FEATURE"
echo "========================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pull latest code
echo -e "${BLUE}📥 Step 1: Pulling latest code from GitHub${NC}"
git pull origin main
echo ""

# Step 2: Run database migration
echo -e "${BLUE}🗄️  Step 2: Running database migration${NC}"
echo "Adding malware_scan_status column to claims table..."
psql -h localhost -U postgres -d fyp_db -c "
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS malware_scan_status VARCHAR(20) DEFAULT 'CLEAN';
"
echo "Setting existing claims to CLEAN status..."
psql -h localhost -U postgres -d fyp_db -c "
UPDATE claims 
SET malware_scan_status = 'CLEAN' 
WHERE malware_scan_status IS NULL;
"
echo -e "${GREEN}✅ Database migration complete${NC}"
echo ""

# Step 3: Install dependencies
echo -e "${BLUE}📦 Step 3: Installing dependencies${NC}"
cd backend
npm install --silent
cd ..
echo ""

# Step 4: Build backend
echo -e "${BLUE}🔨 Step 4: Building backend${NC}"
cd backend
npm run build
cd ..
echo ""

# Step 5: Restart backend
echo -e "${BLUE}🔄 Step 5: Restarting backend service${NC}"
pm2 restart backend
echo ""

# Step 6: Wait for backend to start
echo -e "${BLUE}⏳ Step 6: Waiting for backend to start (10 seconds)${NC}"
sleep 10
echo ""

# Step 7: Check PM2 status
echo -e "${BLUE}📊 Step 7: Checking service status${NC}"
pm2 status
echo ""

# Step 8: Test endpoint (if curl available)
if command -v curl &> /dev/null; then
    echo -e "${BLUE}🧪 Step 8: Testing new endpoint${NC}"
    echo "Testing: GET /api/accountant/claims (should return 401 without auth)"
    curl -s -o /dev/null -w "Status Code: %{http_code}\n" http://localhost:3000/api/accountant/claims/test/receipt || true
    echo ""
fi

# Step 9: Check logs
echo -e "${BLUE}📋 Step 9: Checking recent logs${NC}"
echo "Backend logs (last 20 lines):"
pm2 logs backend --lines 20 --nostream
echo ""

# Success
echo "========================================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "========================================================================"
echo ""
echo -e "${YELLOW}📝 NEXT STEPS:${NC}"
echo ""
echo "1. Verify Database:"
echo "   psql -h localhost -U postgres -d fyp_db"
echo "   \d claims"
echo "   SELECT malware_scan_status FROM claims LIMIT 5;"
echo ""
echo "2. Test Backend Endpoint (with auth):"
echo "   # Login as accountant with MFA"
echo "   # Get JWT token"
echo "   # curl -H \"Authorization: Bearer <token>\" \\"
echo "     http://localhost:3000/api/accountant/claims/<claim-id>/receipt"
echo ""
echo "3. Check Audit Logs:"
echo "   SELECT * FROM audit_logs"
echo "   WHERE action = 'ACCOUNTANT_DOWNLOADED_RECEIPT'"
echo "   ORDER BY created_at DESC LIMIT 10;"
echo ""
echo -e "${YELLOW}🔍 TROUBLESHOOTING:${NC}"
echo "  - Check logs: pm2 logs backend --lines 100"
echo "  - Check status: pm2 status"
echo "  - Restart backend: pm2 restart backend"
echo "  - View errors: pm2 logs backend --err --lines 50"
echo ""
echo -e "${YELLOW}📚 DOCUMENTATION:${NC}"
echo "  - Read: SECURE_ACCOUNTANT_DOWNLOAD_IMPLEMENTATION.md"
echo "  - API Docs: Section 'API Documentation'"
echo "  - Testing: Section 'Testing Checklist'"
echo ""
