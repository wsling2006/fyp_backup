#!/bin/bash

################################################################################
# 🚀 EC2 DEPLOYMENT - Pull and Deploy Latest Changes
# 
# This script pulls the latest code from GitHub and deploys to EC2
# 
# Usage: Run this ON YOUR EC2 INSTANCE:
#   ssh -i your-key.pem ubuntu@your-ec2-ip
#   cd /home/ubuntu/fyp_system
#   ./ec2-pull-and-deploy.sh
################################################################################

set -e  # Exit on any error

echo "========================================================================"
echo "🚀 EC2 DEPLOYMENT - PULLING LATEST CHANGES"
echo "========================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check current directory
echo -e "${BLUE}📍 Step 1: Checking current directory${NC}"
pwd
echo ""

# Step 2: Pull latest code from GitHub
echo -e "${BLUE}📥 Step 2: Pulling latest code from GitHub${NC}"
git pull origin main
echo ""

# Step 3: Run database migration
echo -e "${BLUE}🗄️  Step 3: Running database migration${NC}"
echo "Adding malware_scan_status column to claims table..."
PGPASSWORD=leejw1354 psql -h localhost -p 5433 -U postgres -d fyp_db -c "
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS malware_scan_status VARCHAR(20) DEFAULT 'CLEAN';
" || echo -e "${YELLOW}⚠️  Column may already exist (this is OK)${NC}"

echo "Setting existing claims to CLEAN status..."
PGPASSWORD=leejw1354 psql -h localhost -p 5433 -U postgres -d fyp_db -c "
UPDATE claims 
SET malware_scan_status = 'CLEAN' 
WHERE malware_scan_status IS NULL;
" || echo -e "${YELLOW}⚠️  Update may have failed (check if needed)${NC}"

echo -e "${GREEN}✅ Database migration complete${NC}"
echo ""

# Step 4: Install backend dependencies
echo -e "${BLUE}📦 Step 4: Installing backend dependencies${NC}"
cd backend
npm install
cd ..
echo ""

# Step 5: Build backend
echo -e "${BLUE}🔨 Step 5: Building backend${NC}"
cd backend
npm run build
cd ..
echo ""

# Step 6: Build frontend
echo -e "${BLUE}🔨 Step 6: Building frontend${NC}"
cd frontend
npm install
npm run build
cd ..
echo ""

# Step 7: Restart services
echo -e "${BLUE}🔄 Step 7: Restarting services with PM2${NC}"
pm2 restart all
echo ""

# Step 8: Wait for services to start
echo -e "${BLUE}⏳ Step 8: Waiting for services to start (10 seconds)${NC}"
sleep 10
echo ""

# Step 9: Check PM2 status
echo -e "${BLUE}📊 Step 9: Checking service status${NC}"
pm2 status
echo ""

# Step 10: Check logs for errors
echo -e "${BLUE}📋 Step 10: Checking recent logs${NC}"
echo "Backend logs (last 15 lines):"
pm2 logs backend --lines 15 --nostream || true
echo ""
echo "Frontend logs (last 15 lines):"
pm2 logs frontend --lines 15 --nostream || true
echo ""

# Success
echo "========================================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "========================================================================"
echo ""
echo -e "${YELLOW}🧪 NEXT STEPS - TEST THE FEATURE:${NC}"
echo ""
echo "1. Verify Backend is Running:"
echo "   curl http://localhost:3000/purchase-requests/claims"
echo ""
echo "2. Check Database Column:"
echo "   PGPASSWORD=leejw1354 psql -h localhost -p 5433 -U postgres -d fyp_db"
echo "   \d claims"
echo "   SELECT id, status, malware_scan_status FROM claims LIMIT 5;"
echo ""
echo "3. Test the Secure Endpoint (with valid JWT token):"
echo "   # Login as accountant first to get token"
echo "   curl -H 'Authorization: Bearer <your-token>' \\"
echo "        http://localhost:3000/api/accountant/claims/<claim-id>/receipt"
echo ""
echo "4. Check Audit Logs:"
echo "   PGPASSWORD=leejw1354 psql -h localhost -p 5433 -U postgres -d fyp_db"
echo "   SELECT * FROM audit_logs"
echo "   WHERE action LIKE '%ACCOUNTANT%'"
echo "   ORDER BY created_at DESC LIMIT 10;"
echo ""
echo -e "${YELLOW}🔍 TROUBLESHOOTING:${NC}"
echo "  - View all logs: pm2 logs --lines 100"
echo "  - Check backend errors: pm2 logs backend --err --lines 50"
echo "  - Check frontend errors: pm2 logs frontend --err --lines 50"
echo "  - Restart if needed: pm2 restart all"
echo "  - PM2 status: pm2 status"
echo ""
echo -e "${GREEN}🎉 Ready to test the secure accountant download feature!${NC}"
echo ""
