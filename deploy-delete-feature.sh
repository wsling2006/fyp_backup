#!/bin/bash

# ============================================================================
# Quick Deploy Delete Feature to EC2
# Updates code, rebuilds frontend, and restarts services
# ============================================================================

echo "🚀 Deploy Delete Employee Feature to EC2"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}❌ Error: Missing arguments${NC}"
    echo ""
    echo "Usage: ./deploy-delete-feature.sh <EC2_IP> <path-to-key.pem>"
    echo "Example: ./deploy-delete-feature.sh 18.123.45.67 ~/my-key.pem"
    exit 1
fi

EC2_IP=$1
SSH_KEY=$2
EC2_USER="ec2-user"
PROJECT_PATH="/home/ec2-user/fyp_system"

echo -e "${BLUE}Target EC2:${NC} $EC2_IP"
echo ""

# Test SSH connection
echo -e "${YELLOW}[1/7]${NC} Testing SSH connection..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "echo 'SSH OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to EC2${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection successful${NC}"
echo ""

# Pull latest code
echo -e "${YELLOW}[2/7]${NC} Pulling latest code from GitHub..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'EOF'
cd /home/ec2-user/fyp_system
echo "Current branch: $(git branch --show-current)"
echo "Current commit: $(git log -1 --oneline)"
echo ""
echo "Pulling latest changes..."
git pull origin main
echo ""
echo "New commit: $(git log -1 --oneline)"
EOF
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# Install frontend dependencies
echo -e "${YELLOW}[3/7]${NC} Installing frontend dependencies..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'EOF'
cd /home/ec2-user/fyp_system/frontend
npm install
EOF
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Build frontend
echo -e "${YELLOW}[4/7]${NC} Building frontend (this may take 2-3 minutes)..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'EOF'
cd /home/ec2-user/fyp_system/frontend
npm run build
EOF
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# Restart frontend
echo -e "${YELLOW}[5/7]${NC} Restarting frontend service..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'EOF'
pm2 restart frontend
EOF
echo -e "${GREEN}✅ Frontend restarted${NC}"
echo ""

# Restart backend (to ensure delete endpoints are loaded)
echo -e "${YELLOW}[6/7]${NC} Restarting backend service..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'EOF'
pm2 restart backend
EOF
echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

# Check status
echo -e "${YELLOW}[7/7]${NC} Checking service status..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'EOF'
pm2 list | grep -E "frontend|backend"
echo ""
echo "Recent frontend logs:"
pm2 logs frontend --lines 10 --nostream | tail -10
EOF
echo ""

# ============================================================================
# VERIFICATION STEPS
# ============================================================================
echo "========================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}📋 Verification Steps:${NC}"
echo ""
echo "1. Open browser: http://$EC2_IP:3000"
echo "2. Login as HR user"
echo "3. Navigate to: HR Dashboard → Employees → Click any employee"
echo "4. Look for: 🗑️ Delete Employee button (red outline, top right)"
echo ""
echo -e "${BLUE}🧪 Test Delete Feature:${NC}"
echo ""
echo "1. Click 'Delete Employee' button"
echo "2. Read warnings → Click 'Proceed with Deletion'"
echo "3. Enter your password → Click 'Request OTP Code'"
echo "4. Check OTP in backend logs:"
echo "   ssh -i \"$SSH_KEY\" $EC2_USER@$EC2_IP \"pm2 logs backend --lines 50 | grep -i otp\""
echo "5. Enter OTP → Click 'Delete Employee'"
echo ""
echo -e "${BLUE}📊 Monitor Logs:${NC}"
echo ""
echo "Watch frontend logs:"
echo "  ssh -i \"$SSH_KEY\" $EC2_USER@$EC2_IP \"pm2 logs frontend\""
echo ""
echo "Watch backend logs (for OTP):"
echo "  ssh -i \"$SSH_KEY\" $EC2_USER@$EC2_IP \"pm2 logs backend\""
echo ""
echo -e "${YELLOW}💡 Troubleshooting:${NC}"
echo ""
echo "If button still not visible:"
echo "1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)"
echo "2. Clear browser cache completely"
echo "3. Open in incognito/private mode"
echo "4. Check browser console (F12) for errors"
echo ""
echo "========================================"
