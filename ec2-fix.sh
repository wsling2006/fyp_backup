#!/bin/bash

# EC2 Quick Fix Script
# Fixes the PM2 configuration issues and restarts services

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "EC2 PM2 Configuration Fix"
echo -e "==========================================${NC}"
echo ""

# Get project directory
PROJECT_DIR=$(pwd)
echo -e "${BLUE}Project Directory: ${PROJECT_DIR}${NC}"
echo ""

# Step 1: Stop all PM2 processes
echo -e "${YELLOW}Step 1: Stopping all PM2 processes...${NC}"
pm2 stop all || true
pm2 delete all || true
echo -e "${GREEN}✓ All processes stopped${NC}"
echo ""

# Step 2: Ensure backend is built
echo -e "${YELLOW}Step 2: Checking backend build...${NC}"
if [ ! -f "${PROJECT_DIR}/backend/dist/src/main.js" ]; then
    echo "Backend not built. Building now..."
    cd "${PROJECT_DIR}/backend"
    npm run build
    echo -e "${GREEN}✓ Backend built${NC}"
else
    echo -e "${GREEN}✓ Backend already built${NC}"
fi
echo ""

# Step 3: Ensure frontend is built
echo -e "${YELLOW}Step 3: Checking frontend build...${NC}"
if [ ! -d "${PROJECT_DIR}/frontend/.next" ]; then
    echo "Frontend not built. Building now..."
    cd "${PROJECT_DIR}/frontend"
    npm run build
    echo -e "${GREEN}✓ Frontend built${NC}"
else
    echo -e "${GREEN}✓ Frontend already built${NC}"
fi
echo ""

# Step 4: Create log directories
echo -e "${YELLOW}Step 4: Creating log directories...${NC}"
mkdir -p "${PROJECT_DIR}/backend/logs"
mkdir -p "${PROJECT_DIR}/frontend/logs"
echo -e "${GREEN}✓ Log directories created${NC}"
echo ""

# Step 5: Check environment files
echo -e "${YELLOW}Step 5: Checking environment files...${NC}"

# Check backend .env
if [ ! -f "${PROJECT_DIR}/backend/.env" ]; then
    echo -e "${YELLOW}⚠ Backend .env not found. Creating template...${NC}"
    cat > "${PROJECT_DIR}/backend/.env" << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:3001
EOF
    echo -e "${RED}✗ Please configure backend/.env with your database credentials${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Backend .env exists${NC}"
fi

# Check frontend .env.local
if [ ! -f "${PROJECT_DIR}/frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠ Frontend .env.local not found. Creating...${NC}"
    cat > "${PROJECT_DIR}/frontend/.env.local" << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✓ Frontend .env.local created${NC}"
else
    echo -e "${GREEN}✓ Frontend .env.local exists${NC}"
fi
echo ""

# Step 6: Start services with PM2
echo -e "${YELLOW}Step 6: Starting services with PM2...${NC}"
cd "${PROJECT_DIR}"
pm2 start ecosystem.config.js --env production
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 7: Wait for services to start
echo -e "${YELLOW}Step 7: Waiting for services to initialize...${NC}"
sleep 5
echo ""

# Step 8: Check status
echo -e "${YELLOW}Step 8: Checking service status...${NC}"
pm2 status
echo ""

# Step 9: Test services
echo -e "${YELLOW}Step 9: Testing services...${NC}"

echo "Testing backend (port 3000)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
else
    echo -e "${RED}✗ Backend is not responding${NC}"
    echo "Checking backend logs..."
    pm2 logs backend --lines 20 --nostream
fi
echo ""

echo "Testing frontend (port 3001)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    echo -e "${GREEN}✓ Frontend is responding${NC}"
else
    echo -e "${RED}✗ Frontend is not responding${NC}"
    echo "Checking frontend logs..."
    pm2 logs frontend --lines 20 --nostream
fi
echo ""

# Step 10: Show logs
echo -e "${YELLOW}Step 10: Recent logs...${NC}"
echo ""
echo "=== Backend Logs ==="
pm2 logs backend --lines 10 --nostream
echo ""
echo "=== Frontend Logs ==="
pm2 logs frontend --lines 10 --nostream
echo ""

# Summary
echo -e "${BLUE}=========================================="
echo "Fix Complete"
echo -e "==========================================${NC}"
echo ""
echo -e "${GREEN}Services should now be running properly.${NC}"
echo ""
echo "Monitor logs:"
echo "  pm2 logs"
echo ""
echo "Check status:"
echo "  pm2 status"
echo ""
echo "If issues persist, check:"
echo "  1. Database connection (backend/.env)"
echo "  2. Backend logs: pm2 logs backend"
echo "  3. Frontend logs: pm2 logs frontend"
echo ""
echo -e "${BLUE}==========================================${NC}"
