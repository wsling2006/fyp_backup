#!/bin/bash

# Script to deploy toast notification updates to EC2
# Run this script on your EC2 instance after pulling from GitHub

set -e

echo "🚀 Deploying Toast Notification Updates to EC2..."
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Navigate to project directory
echo -e "\n${BLUE}Step 1: Navigating to project directory...${NC}"
cd /home/ubuntu/fyp_system || cd /home/ec2-user/fyp_system || cd ~/fyp_system

# Step 2: Pull latest changes
echo -e "\n${BLUE}Step 2: Pulling latest changes from GitHub...${NC}"
git pull origin main

# Step 3: Install dependencies (if any new ones)
echo -e "\n${BLUE}Step 3: Installing frontend dependencies...${NC}"
cd frontend
npm install

# Step 4: Clear Next.js cache
echo -e "\n${BLUE}Step 4: Clearing Next.js cache...${NC}"
rm -rf .next
rm -rf node_modules/.cache

# Step 5: Build frontend with new changes
echo -e "\n${BLUE}Step 5: Building frontend...${NC}"
npm run build

# Step 6: Restart PM2 processes
echo -e "\n${BLUE}Step 6: Restarting PM2 processes...${NC}"
pm2 restart all

# Step 7: Verify PM2 status
echo -e "\n${BLUE}Step 7: Checking PM2 status...${NC}"
pm2 list

echo -e "\n${GREEN}✅ Deployment Complete!${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Clear your browser cache!${NC}"
echo ""
echo "To see the new centered toast notifications:"
echo "1. Press Ctrl + Shift + R (hard refresh)"
echo "2. Or press F12 → Right-click refresh → 'Empty Cache and Hard Reload'"
echo ""
echo "🎉 Your toast notifications should now be centered and large!"
