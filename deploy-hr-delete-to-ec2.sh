#!/bin/bash

# HR Employee Deletion Feature - Complete EC2 Deployment Script
# This script deploys the employee deletion feature with OTP email functionality

set -e  # Exit on error

echo "=========================================="
echo "HR Employee Deletion Feature Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# EC2 connection details (update these)
EC2_USER="ubuntu"
EC2_HOST="your-ec2-public-ip"
EC2_KEY_PATH="~/.ssh/your-key.pem"
APP_PATH="/home/ubuntu/fyp_system"

echo -e "${YELLOW}Step 1: Testing SSH connection...${NC}"
if ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" "echo 'SSH connection successful'"; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ SSH connection failed. Please check your EC2 credentials.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Pulling latest code from GitHub...${NC}"
ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ubuntu/fyp_system
echo "Pulling latest code..."
git fetch origin
git reset --hard origin/main
git pull origin main
echo "✓ Code updated"
ENDSSH

echo ""
echo -e "${YELLOW}Step 3: Installing backend dependencies...${NC}"
ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ubuntu/fyp_system/backend
echo "Installing/updating dependencies..."
npm install
echo "✓ Backend dependencies installed"
ENDSSH

echo ""
echo -e "${YELLOW}Step 4: Rebuilding backend...${NC}"
ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ubuntu/fyp_system/backend
echo "Building backend..."
npm run build
echo "✓ Backend built successfully"
ENDSSH

echo ""
echo -e "${YELLOW}Step 5: Installing frontend dependencies...${NC}"
ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ubuntu/fyp_system/frontend
echo "Installing/updating dependencies..."
npm install
echo "✓ Frontend dependencies installed"
ENDSSH

echo ""
echo -e "${YELLOW}Step 6: Rebuilding frontend...${NC}"
ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ubuntu/fyp_system/frontend
echo "Building frontend..."
npm run build
echo "✓ Frontend built successfully"
ENDSSH

echo ""
echo -e "${YELLOW}Step 7: Restarting backend service...${NC}"
ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ubuntu/fyp_system/backend
echo "Stopping existing backend process..."
pkill -f "node dist/main.js" || echo "No existing backend process found"
sleep 2
echo "Starting backend..."
nohup node dist/main.js > backend.log 2>&1 &
sleep 3
if pgrep -f "node dist/main.js" > /dev/null; then
    echo "✓ Backend started successfully"
else
    echo "✗ Backend failed to start. Check logs."
    exit 1
fi
ENDSSH

echo ""
echo -e "${YELLOW}Step 8: Restarting frontend service...${NC}"
ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ubuntu/fyp_system/frontend
echo "Stopping existing frontend process..."
pkill -f "next start" || echo "No existing frontend process found"
sleep 2
echo "Starting frontend..."
nohup npm start > frontend.log 2>&1 &
sleep 3
if pgrep -f "next start" > /dev/null; then
    echo "✓ Frontend started successfully"
else
    echo "✗ Frontend failed to start. Check logs."
    exit 1
fi
ENDSSH

echo ""
echo -e "${YELLOW}Step 9: Checking service health...${NC}"
ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
echo "Checking backend health..."
sleep 2
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ Backend is healthy"
else
    echo "⚠ Backend health check failed (may not have health endpoint)"
fi

echo ""
echo "Checking frontend..."
if pgrep -f "next start" > /dev/null; then
    echo "✓ Frontend is running"
else
    echo "✗ Frontend is not running"
fi

echo ""
echo "Recent backend logs:"
tail -n 20 /home/ubuntu/fyp_system/backend/backend.log

echo ""
echo "Recent frontend logs:"
tail -n 20 /home/ubuntu/fyp_system/frontend/frontend.log
ENDSSH

echo ""
echo -e "${GREEN}=========================================="
echo -e "Deployment Complete!"
echo -e "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Access your application at: http://$EC2_HOST:3001"
echo "2. Login as an HR admin user"
echo "3. Navigate to an employee profile"
echo "4. Test the employee deletion feature"
echo "5. Check your email for OTP"
echo ""
echo "To monitor logs:"
echo "  Backend: ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST 'tail -f /home/ubuntu/fyp_system/backend/backend.log'"
echo "  Frontend: ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST 'tail -f /home/ubuntu/fyp_system/frontend/frontend.log'"
echo ""
echo "To check audit logs:"
echo "  ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST 'tail -f /home/ubuntu/fyp_system/backend/audit.log'"
