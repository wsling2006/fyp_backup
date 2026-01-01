#!/bin/bash

# HR MODULE - QUICK START SCRIPT
# Run this script to get the HR module up and running in 5 minutes

set -e

echo "🏢 HR MODULE - QUICK START SETUP"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${BLUE}📋 Step 1: Checking prerequisites...${NC}"
echo ""

# Check if backend exists
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found"
    exit 1
fi

# Check if frontend exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found"
    exit 1
fi

echo "✅ Project structure looks good"
echo ""

# Step 2: Run database migration
echo -e "${BLUE}📊 Step 2: Running database migration...${NC}"
echo ""
cd backend
npm run migration:run
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Migration may have already been run (this is okay)${NC}"
fi
cd ..
echo ""

# Step 3: Create/Update HR test user
echo -e "${BLUE}👤 Step 3: Setting up HR test user...${NC}"
echo ""
read -p "Enter email for HR user (e.g., hr@test.com): " HR_EMAIL

if [ -z "$HR_EMAIL" ]; then
    echo "❌ Error: Email cannot be empty"
    exit 1
fi

# Update user role in database
psql -U jw -d fyp_db -c "UPDATE users SET role = 'human_resources' WHERE email = '$HR_EMAIL';" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ User $HR_EMAIL updated to HR role${NC}"
else
    echo -e "${YELLOW}⚠️  Could not update user. You may need to do this manually:${NC}"
    echo "   psql -U jw -d fyp_db"
    echo "   UPDATE users SET role = 'human_resources' WHERE email = '$HR_EMAIL';"
fi
echo ""

# Step 4: Check if ClamAV is running
echo -e "${BLUE}🛡️  Step 4: Checking ClamAV status...${NC}"
echo ""
if systemctl is-active --quiet clamav-daemon 2>/dev/null; then
    echo -e "${GREEN}✅ ClamAV is running${NC}"
else
    echo -e "${YELLOW}⚠️  ClamAV may not be running. Document uploads require ClamAV.${NC}"
    echo "   To start: sudo systemctl start clamav-daemon"
fi
echo ""

# Step 5: Start backend
echo -e "${BLUE}🚀 Step 5: Starting backend...${NC}"
echo ""
echo "Opening new terminal for backend..."
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/backend && npm run dev"' 2>/dev/null || {
    echo "Could not open terminal automatically."
    echo "Please manually run:"
    echo "  cd backend && npm run dev"
}
echo ""

# Step 6: Start frontend
echo -e "${BLUE}🎨 Step 6: Starting frontend...${NC}"
echo ""
echo "Opening new terminal for frontend..."
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/frontend && npm run dev"' 2>/dev/null || {
    echo "Could not open terminal automatically."
    echo "Please manually run:"
    echo "  cd frontend && npm run dev"
}
echo ""

# Step 7: Summary
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo "=================================="
echo ""
echo "🎉 The HR module is now ready to use!"
echo ""
echo "Next steps:"
echo "  1. Wait for backend to start (http://localhost:3000)"
echo "  2. Wait for frontend to start (http://localhost:3001)"
echo "  3. Open browser: http://localhost:3001"
echo "  4. Login with: $HR_EMAIL"
echo "  5. You'll be redirected to: /hr/employees"
echo ""
echo "📚 Documentation:"
echo "  - Backend API: HR_MODULE_IMPLEMENTATION_COMPLETE.md"
echo "  - Frontend UI: HR_UI_MODULE_IMPLEMENTATION.md"
echo "  - Testing Guide: HR_UI_MODULE_TESTING_GUIDE.md"
echo "  - Quick Reference: README_HR_MODULE_COMPLETE.md"
echo ""
echo "🧪 Testing:"
echo "  - Backend tests: ./test-hr-module.sh"
echo "  - UI tests: Follow HR_UI_MODULE_TESTING_GUIDE.md"
echo ""
echo "🐛 Troubleshooting:"
echo "  - Check backend logs in the terminal"
echo "  - Check frontend logs in the terminal"
echo "  - Browser console: F12 > Console tab"
echo "  - Database: psql -U jw -d fyp_db"
echo ""
echo -e "${GREEN}Happy HR Managing! 🏢✨${NC}"
