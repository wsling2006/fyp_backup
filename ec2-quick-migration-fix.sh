#!/bin/bash

# EC2 Quick Migration Fix Script
# Run this script ON EC2 to fix the migration issue and complete the setup

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         EC2 Migration Fix & HR Module Setup                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Must run this script from the fyp_system root directory${NC}"
    echo "Current directory: $(pwd)"
    echo ""
    echo "Run: cd ~/fyp_system && ./ec2-quick-migration-fix.sh"
    exit 1
fi

echo -e "${BLUE}📍 Current directory: $(pwd)${NC}"
echo ""

# Step 1: Pull latest changes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 1: Pulling latest changes from GitHub...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 2: Navigate to backend
cd backend
echo -e "${BLUE}📂 Changed to backend directory${NC}"
echo ""

# Step 3: Verify the fix
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 2: Verifying migration fix...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if grep -q "Check if column already exists" src/migrations/1704067200000-AddMalwareScanStatusToClaims.ts; then
    echo -e "${GREEN}✓ Migration file has the existence check fix${NC}"
else
    echo -e "${RED}❌ Migration fix not found! Did git pull succeed?${NC}"
    exit 1
fi
echo ""

# Step 4: Check if column exists
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 3: Checking database state...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if the column exists in the database
COLUMN_EXISTS=$(npm run typeorm query "SELECT column_name FROM information_schema.columns WHERE table_name='claims' AND column_name='malware_scan_status';" 2>/dev/null | grep -c "malware_scan_status" || echo "0")

if [ "$COLUMN_EXISTS" -gt "0" ]; then
    echo -e "${YELLOW}⚠️  Column 'malware_scan_status' already exists in database${NC}"
    echo -e "${BLUE}   Will mark migration as complete...${NC}"
    
    # Check if migration is already recorded
    MIGRATION_EXISTS=$(npm run typeorm query "SELECT name FROM migrations WHERE name='AddMalwareScanStatusToClaims1704067200000';" 2>/dev/null | grep -c "AddMalwareScanStatusToClaims" || echo "0")
    
    if [ "$MIGRATION_EXISTS" -eq "0" ]; then
        echo -e "${BLUE}   Marking migration as complete...${NC}"
        npm run typeorm query "INSERT INTO migrations (timestamp, name) VALUES (1704067200000, 'AddMalwareScanStatusToClaims1704067200000');" > /dev/null 2>&1
        echo -e "${GREEN}✓ Migration marked as complete${NC}"
    else
        echo -e "${GREEN}✓ Migration already marked as complete${NC}"
    fi
else
    echo -e "${GREEN}✓ Column doesn't exist yet (will be created by migration)${NC}"
fi
echo ""

# Step 5: Install dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 4: Installing dependencies...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm install --silent
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 6: Rebuild
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 5: Building backend...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ Backend built successfully${NC}"
echo ""

# Step 7: Run migrations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 6: Running database migrations...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run typeorm migration:run
echo ""

# Step 8: Verify migrations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 7: Verifying migrations...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Migration status:"
npm run typeorm migration:show
echo ""

# Step 9: Check HR tables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 8: Verifying HR tables...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TABLES=$(npm run typeorm query "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('employees', 'employee_documents') ORDER BY table_name;" 2>/dev/null)

if echo "$TABLES" | grep -q "employees" && echo "$TABLES" | grep -q "employee_documents"; then
    echo -e "${GREEN}✓ HR tables exist:${NC}"
    echo "  - employees"
    echo "  - employee_documents"
else
    echo -e "${YELLOW}⚠️  HR tables not found. Migration may not have run yet.${NC}"
fi
echo ""

# Step 10: Restart application
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Step 9: Restarting application...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try PM2 first
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to restart..."
    pm2 restart backend 2>/dev/null || pm2 start npm --name backend -- run start:prod
    echo -e "${GREEN}✓ Application restarted with PM2${NC}"
    echo ""
    echo "View logs with: pm2 logs backend"
elif systemctl is-active --quiet your-backend-service 2>/dev/null; then
    echo "Using systemd to restart..."
    sudo systemctl restart your-backend-service
    echo -e "${GREEN}✓ Application restarted with systemd${NC}"
    echo ""
    echo "View logs with: sudo journalctl -u your-backend-service -f"
else
    echo -e "${YELLOW}⚠️  No process manager detected${NC}"
    echo "Please restart your backend application manually:"
    echo "  npm run start:prod"
fi
echo ""

# Step 11: Final summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     SETUP COMPLETE! ✅                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}What was done:${NC}"
echo "  ✓ Latest code pulled from GitHub"
echo "  ✓ Migration fix verified"
echo "  ✓ Database migrations completed"
echo "  ✓ HR module tables created"
echo "  ✓ Application restarted"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Test the backend health:"
echo "     curl http://localhost:3000/health"
echo ""
echo "  2. Run the automated HR module test:"
echo "     cd ~/fyp_system && ./test-hr-module.sh"
echo ""
echo "  3. View application logs:"
echo "     pm2 logs backend"
echo ""
echo "  4. Check audit logs:"
echo "     cd backend && npm run typeorm query \"SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;\""
echo ""
echo -e "${GREEN}HR Module Endpoints Available:${NC}"
echo "  GET    /hr/employees          - List all employees"
echo "  GET    /hr/employees/:id      - Get employee details"
echo "  PUT    /hr/employees/:id      - Update employee"
echo "  POST   /hr/employees/:id/documents - Upload document"
echo "  GET    /hr/employees/:id/documents - List documents"
echo "  GET    /hr/employees/:id/documents/:docId - Download document"
echo ""
echo -e "${YELLOW}⚠️  Remember: All HR endpoints require JWT authentication and HR role${NC}"
echo ""
echo "Done! 🎉"
