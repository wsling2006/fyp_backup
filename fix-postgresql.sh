#!/bin/bash

#############################################################################
# QUICK FIX: Start PostgreSQL on EC2
# Use this if the main startup script fails at PostgreSQL step
#############################################################################

echo "============================================"
echo "🔧 PostgreSQL Quick Fix"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find PostgreSQL version
echo "Finding PostgreSQL version..."
PG_VERSION=$(ls /etc/postgresql/ 2>/dev/null | head -1)

if [ -z "$PG_VERSION" ]; then
    echo -e "${RED}❌ PostgreSQL not found in /etc/postgresql/${NC}"
    echo "Checking if PostgreSQL is installed..."
    dpkg -l | grep postgresql
    exit 1
fi

echo -e "${GREEN}✅ Found PostgreSQL version: $PG_VERSION${NC}"
echo ""

# Check current status
echo "Current status:"
sudo -u postgres pg_isready
echo ""

# Start PostgreSQL cluster
echo "Starting PostgreSQL cluster..."
sudo pg_ctlcluster $PG_VERSION main start

echo ""
echo "Waiting 3 seconds..."
sleep 3
echo ""

# Check if it's running
echo "Verifying PostgreSQL is running..."
sudo -u postgres pg_isready

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PostgreSQL is now running!${NC}"
    echo ""
    echo "Testing database connection..."
    sudo -u postgres psql -d fyp_db -c "SELECT 'Connection OK' as status;"
    echo ""
    echo -e "${GREEN}🎉 PostgreSQL is ready!${NC}"
    echo ""
    echo "Now you can start your applications:"
    echo "  cd /home/ubuntu/fyp_system/backend"
    echo "  pm2 start dist/src/main.js --name backend"
    echo ""
    echo "  cd /home/ubuntu/fyp_system/frontend"
    echo "  pm2 start npm --name frontend -- start"
else
    echo -e "${RED}❌ PostgreSQL still not running${NC}"
    echo ""
    echo "Trying alternative method..."
    sudo systemctl restart postgresql@$PG_VERSION-main
    sleep 3
    sudo -u postgres pg_isready
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PostgreSQL started with alternative method!${NC}"
    else
        echo -e "${RED}❌ PostgreSQL failed to start${NC}"
        echo ""
        echo "Check logs for errors:"
        echo "  sudo tail -50 /var/log/postgresql/postgresql-$PG_VERSION-main.log"
        echo ""
        echo "Check cluster status:"
        echo "  pg_lsclusters"
        echo ""
        echo "Manual start command:"
        echo "  sudo pg_ctlcluster $PG_VERSION main start"
    fi
fi
