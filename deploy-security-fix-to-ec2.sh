#!/bin/bash

# ============================================
# Security Fix Deployment Script for EC2
# ============================================
# This script updates your EC2 instance with all security fixes
# Run this on your EC2 instance after pulling from GitHub
# ============================================

set -e  # Exit on error

echo "============================================"
echo "🚀 Deploying Security Fixes to EC2"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop any running processes
echo "📦 Step 1: Stopping existing processes..."
pkill -f "next dev" || true
pkill -f "next start" || true
pkill -f "npm run dev" || true
pkill -f "npm start" || true
sleep 2
echo -e "${GREEN}✓${NC} Processes stopped"
echo ""

# Step 2: Pull latest changes from GitHub
echo "📥 Step 2: Pulling latest changes from GitHub..."
git fetch origin
git pull origin main
echo -e "${GREEN}✓${NC} Latest changes pulled"
echo ""

# Step 3: Install/update frontend dependencies
echo "📦 Step 3: Installing frontend dependencies..."
cd ~/fyp_system/frontend
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 4: Build frontend
echo "🔨 Step 4: Building frontend..."
npm run build
echo -e "${GREEN}✓${NC} Frontend built successfully"
echo ""

# Step 5: Make security audit script executable
echo "🔐 Step 5: Setting up security audit script..."
cd ~/fyp_system
chmod +x security-audit.sh
echo -e "${GREEN}✓${NC} Security audit script ready"
echo ""

# Step 6: Run security audit
echo "🔍 Step 6: Running security audit..."
./security-audit.sh
echo ""

# Step 7: Restart application
echo "🔄 Step 7: Starting application..."
cd ~/fyp_system/frontend

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to manage application..."
    pm2 stop frontend || true
    pm2 delete frontend || true
    pm2 start npm --name "frontend" -- start
    pm2 save
    echo -e "${GREEN}✓${NC} Application started with PM2"
else
    echo "PM2 not found. Starting with nohup..."
    nohup npm start > ~/fyp_system/logs/frontend.log 2>&1 &
    echo -e "${GREEN}✓${NC} Application started with nohup"
fi
echo ""

echo "============================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo "============================================"
echo ""
echo "📊 Summary:"
echo "  • Security fixes deployed"
echo "  • Frontend rebuilt"
echo "  • Security audit passed"
echo "  • Application restarted"
echo ""
echo "🔍 Verify deployment:"
echo "  • Check application: http://your-ec2-ip:3000"
echo "  • View logs: tail -f ~/fyp_system/logs/frontend.log"
echo "  • Run audit: ./security-audit.sh"
echo ""
