#!/bin/bash

#############################################################################
# EC2 System Startup Script
# Use this script to start your FYP system after EC2 instance restart
#############################################################################

echo "=========================================="
echo "🚀 Starting FYP System on EC2"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /home/ubuntu/fyp_system

echo -e "${BLUE}Step 1: Checking PostgreSQL${NC}"
sudo systemctl status postgresql | grep "active (running)" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}⚠️  Starting PostgreSQL...${NC}"
    sudo systemctl start postgresql
    sleep 3
    sudo systemctl status postgresql | grep "active (running)" > /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PostgreSQL started${NC}"
    else
        echo -e "${RED}❌ PostgreSQL failed to start${NC}"
        sudo systemctl status postgresql
        exit 1
    fi
fi
echo ""

echo -e "${BLUE}Step 2: Checking database connection${NC}"
sudo -u postgres psql -d fyp_db -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection OK${NC}"
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Step 3: Stopping any errored PM2 processes${NC}"
pm2 delete all
echo -e "${GREEN}✅ Cleared PM2 processes${NC}"
echo ""

echo -e "${BLUE}Step 4: Starting Backend${NC}"
cd /home/ubuntu/fyp_system/backend

# Check if backend is built
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}⚠️  Backend not built. Building now...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Backend build failed${NC}"
        exit 1
    fi
fi

# Start backend
pm2 start dist/src/main.js --name backend
sleep 5

# Check backend status
pm2 list | grep backend | grep "online" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend started successfully${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    pm2 logs backend --lines 50
    exit 1
fi
echo ""

echo -e "${BLUE}Step 5: Starting Frontend${NC}"
cd /home/ubuntu/fyp_system/frontend

# Check if frontend is built
if [ ! -d ".next" ]; then
    echo -e "${YELLOW}⚠️  Frontend not built. Building now...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Frontend build failed${NC}"
        exit 1
    fi
fi

# Start frontend
pm2 start npm --name frontend -- start
sleep 5

# Check frontend status
pm2 list | grep frontend | grep "online" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend started successfully${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    pm2 logs frontend --lines 50
    exit 1
fi
echo ""

echo -e "${BLUE}Step 6: Saving PM2 configuration${NC}"
pm2 save
echo -e "${GREEN}✅ PM2 configuration saved${NC}"
echo ""

echo -e "${BLUE}Step 7: Final System Status${NC}"
pm2 status
echo ""

echo -e "${BLUE}Step 8: Testing Backend Health${NC}"
sleep 2
curl -s http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend responding on port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Backend not responding (may still be starting)${NC}"
fi
echo ""

echo -e "${BLUE}Step 9: Testing Frontend Health${NC}"
curl -s http://localhost:3001 > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend responding on port 3001${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not responding (may still be starting)${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}🎉 System Startup Complete!${NC}"
echo "=========================================="
echo ""
echo "Access your application at:"
echo "  Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo "  Backend:  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000/api"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check process status"
echo "  pm2 logs                - View all logs"
echo "  pm2 logs backend        - View backend logs"
echo "  pm2 logs frontend       - View frontend logs"
echo "  pm2 restart all         - Restart all processes"
echo "  pm2 monit               - Monitor processes"
echo ""
