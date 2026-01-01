#!/bin/bash

# ============================================================================
# EC2 Delete Button Diagnostic Script
# Checks if the delete employee feature is properly deployed on EC2
# ============================================================================

echo "🔍 EC2 Delete Button Diagnostic Report"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if EC2 IP is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: EC2 IP address required${NC}"
    echo "Usage: ./check-ec2-delete-button.sh <EC2_IP> <path-to-key.pem>"
    echo "Example: ./check-ec2-delete-button.sh 18.123.45.67 ~/my-key.pem"
    exit 1
fi

if [ -z "$2" ]; then
    echo -e "${RED}❌ Error: Path to SSH key required${NC}"
    echo "Usage: ./check-ec2-delete-button.sh <EC2_IP> <path-to-key.pem>"
    echo "Example: ./check-ec2-delete-button.sh 18.123.45.67 ~/my-key.pem"
    exit 1
fi

EC2_IP=$1
SSH_KEY=$2
EC2_USER="ec2-user"
PROJECT_PATH="/home/ec2-user/fyp_system"

echo -e "${BLUE}Target EC2:${NC} $EC2_IP"
echo -e "${BLUE}SSH Key:${NC} $SSH_KEY"
echo ""

# ============================================================================
# 1. Check SSH Connection
# ============================================================================
echo -e "${YELLOW}[1/10]${NC} Testing SSH connection..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "echo 'SSH OK'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to EC2${NC}"
    echo "Please check:"
    echo "  - EC2 IP address is correct"
    echo "  - SSH key path is correct"
    echo "  - EC2 security group allows SSH (port 22)"
    echo "  - EC2 instance is running"
    exit 1
fi
echo ""

# ============================================================================
# 2. Check Git Repository Status
# ============================================================================
echo -e "${YELLOW}[2/10]${NC} Checking Git repository status..."
GIT_STATUS=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "cd $PROJECT_PATH && git status --porcelain 2>&1")
GIT_BRANCH=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "cd $PROJECT_PATH && git branch --show-current 2>&1")
GIT_COMMIT=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "cd $PROJECT_PATH && git log -1 --oneline 2>&1")

echo -e "${BLUE}Branch:${NC} $GIT_BRANCH"
echo -e "${BLUE}Latest commit:${NC} $GIT_COMMIT"

if [ -n "$GIT_STATUS" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected:${NC}"
    echo "$GIT_STATUS"
else
    echo -e "${GREEN}✅ Repository is clean${NC}"
fi
echo ""

# ============================================================================
# 3. Check if Latest Commits Include Delete Feature
# ============================================================================
echo -e "${YELLOW}[3/10]${NC} Checking if delete feature commits are present..."
DELETE_COMMITS=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "cd $PROJECT_PATH && git log --oneline --grep='delete employee' -i | head -5")

if [ -n "$DELETE_COMMITS" ]; then
    echo -e "${GREEN}✅ Delete feature commits found:${NC}"
    echo "$DELETE_COMMITS"
else
    echo -e "${RED}❌ No delete feature commits found${NC}"
    echo "The delete feature may not be deployed yet!"
fi
echo ""

# ============================================================================
# 4. Check if Delete Button Code Exists in File
# ============================================================================
echo -e "${YELLOW}[4/10]${NC} Checking if delete button code exists..."
DELETE_BUTTON_CHECK=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "cd $PROJECT_PATH && grep -n 'Delete Employee' frontend/app/hr/employees/\[id\]/page.tsx 2>&1 | head -3")

if [ -n "$DELETE_BUTTON_CHECK" ]; then
    echo -e "${GREEN}✅ Delete button code found:${NC}"
    echo "$DELETE_BUTTON_CHECK"
else
    echo -e "${RED}❌ Delete button code NOT found${NC}"
    echo "The file may not have the delete button implementation!"
fi
echo ""

# ============================================================================
# 5. Check if DeleteEmployeeModal Component Exists
# ============================================================================
echo -e "${YELLOW}[5/10]${NC} Checking if DeleteEmployeeModal component exists..."
DELETE_MODAL_CHECK=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "cd $PROJECT_PATH && grep -n 'DeleteEmployeeModal' frontend/app/hr/employees/\[id\]/page.tsx 2>&1 | head -3")

if [ -n "$DELETE_MODAL_CHECK" ]; then
    echo -e "${GREEN}✅ DeleteEmployeeModal component found:${NC}"
    echo "$DELETE_MODAL_CHECK"
else
    echo -e "${RED}❌ DeleteEmployeeModal component NOT found${NC}"
fi
echo ""

# ============================================================================
# 6. Check PM2 Process Status
# ============================================================================
echo -e "${YELLOW}[6/10]${NC} Checking PM2 processes..."
PM2_STATUS=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "pm2 list | grep -E 'frontend|backend'" 2>&1)

if [ -n "$PM2_STATUS" ]; then
    echo "$PM2_STATUS"
    
    # Check if frontend is online
    if echo "$PM2_STATUS" | grep -q "frontend.*online"; then
        echo -e "${GREEN}✅ Frontend is running${NC}"
    else
        echo -e "${RED}❌ Frontend is NOT running${NC}"
    fi
    
    # Check if backend is online
    if echo "$PM2_STATUS" | grep -q "backend.*online"; then
        echo -e "${GREEN}✅ Backend is running${NC}"
    else
        echo -e "${RED}❌ Backend is NOT running${NC}"
    fi
else
    echo -e "${RED}❌ PM2 not found or no processes running${NC}"
fi
echo ""

# ============================================================================
# 7. Check Frontend Build Status
# ============================================================================
echo -e "${YELLOW}[7/10]${NC} Checking frontend build status..."
FRONTEND_BUILD=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "ls -lh $PROJECT_PATH/frontend/.next/BUILD_ID 2>&1")

if echo "$FRONTEND_BUILD" | grep -q "BUILD_ID"; then
    BUILD_DATE=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "stat -f '%Sm' $PROJECT_PATH/frontend/.next/BUILD_ID 2>&1")
    echo -e "${GREEN}✅ Frontend build exists${NC}"
    echo -e "${BLUE}Build date:${NC} $BUILD_DATE"
    
    # Check if build is recent (within last 24 hours)
    BUILD_AGE=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "echo \$(( (\$(date +%s) - \$(stat -f %m $PROJECT_PATH/frontend/.next/BUILD_ID)) / 3600 ))")
    echo -e "${BLUE}Build age:${NC} $BUILD_AGE hours ago"
    
    if [ "$BUILD_AGE" -gt 24 ]; then
        echo -e "${YELLOW}⚠️  Build is older than 24 hours - may need rebuild${NC}"
    fi
else
    echo -e "${RED}❌ Frontend build NOT found - needs to be built!${NC}"
fi
echo ""

# ============================================================================
# 8. Check Backend Delete Endpoints
# ============================================================================
echo -e "${YELLOW}[8/10]${NC} Checking backend delete endpoints..."
DELETE_ENDPOINT_CHECK=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "cd $PROJECT_PATH && grep -n 'delete/request-otp' backend/src/employees/hr.controller.ts 2>&1 | head -2")

if [ -n "$DELETE_ENDPOINT_CHECK" ]; then
    echo -e "${GREEN}✅ Delete endpoints found in backend:${NC}"
    echo "$DELETE_ENDPOINT_CHECK"
else
    echo -e "${RED}❌ Delete endpoints NOT found${NC}"
fi
echo ""

# ============================================================================
# 9. Compare Local vs EC2 Commits
# ============================================================================
echo -e "${YELLOW}[9/10]${NC} Comparing local vs EC2 commits..."

# Get local latest commit
LOCAL_COMMIT=$(cd /Users/jw/fyp_system && git log -1 --oneline 2>&1)
echo -e "${BLUE}Local latest commit:${NC} $LOCAL_COMMIT"
echo -e "${BLUE}EC2 latest commit:${NC} $GIT_COMMIT"

LOCAL_HASH=$(echo "$LOCAL_COMMIT" | awk '{print $1}')
EC2_HASH=$(echo "$GIT_COMMIT" | awk '{print $1}')

if [ "$LOCAL_HASH" = "$EC2_HASH" ]; then
    echo -e "${GREEN}✅ EC2 is up to date with local${NC}"
else
    echo -e "${RED}❌ EC2 is BEHIND local - needs git pull!${NC}"
    
    # Show commits difference
    COMMITS_BEHIND=$(cd /Users/jw/fyp_system && git log --oneline $EC2_HASH..$LOCAL_HASH 2>&1 | head -10)
    if [ -n "$COMMITS_BEHIND" ]; then
        echo -e "${YELLOW}Commits not on EC2:${NC}"
        echo "$COMMITS_BEHIND"
    fi
fi
echo ""

# ============================================================================
# 10. Check Frontend Logs for Errors
# ============================================================================
echo -e "${YELLOW}[10/10]${NC} Checking recent frontend logs..."
FRONTEND_LOGS=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "pm2 logs frontend --lines 20 --nostream 2>&1 | tail -20")

if echo "$FRONTEND_LOGS" | grep -qi "error"; then
    echo -e "${RED}⚠️  Errors found in frontend logs:${NC}"
    echo "$FRONTEND_LOGS"
else
    echo -e "${GREEN}✅ No errors in recent frontend logs${NC}"
    echo "Last 5 log lines:"
    echo "$FRONTEND_LOGS" | tail -5
fi
echo ""

# ============================================================================
# SUMMARY & RECOMMENDATIONS
# ============================================================================
echo "========================================"
echo -e "${BLUE}📊 DIAGNOSTIC SUMMARY${NC}"
echo "========================================"
echo ""

# Calculate issues
ISSUES=0

# Check if code is present
if [ -z "$DELETE_BUTTON_CHECK" ]; then
    echo -e "${RED}❌ Issue: Delete button code missing from file${NC}"
    ((ISSUES++))
fi

if [ -z "$DELETE_MODAL_CHECK" ]; then
    echo -e "${RED}❌ Issue: DeleteEmployeeModal component missing${NC}"
    ((ISSUES++))
fi

# Check if commits are synced
if [ "$LOCAL_HASH" != "$EC2_HASH" ]; then
    echo -e "${RED}❌ Issue: EC2 is behind local repository${NC}"
    ((ISSUES++))
fi

# Check if build is old
if [ "$BUILD_AGE" -gt 24 ] 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: Frontend build is older than 24 hours${NC}"
fi

# Check if processes are running
if ! echo "$PM2_STATUS" | grep -q "frontend.*online"; then
    echo -e "${RED}❌ Issue: Frontend is not running${NC}"
    ((ISSUES++))
fi

if ! echo "$PM2_STATUS" | grep -q "backend.*online"; then
    echo -e "${RED}❌ Issue: Backend is not running${NC}"
    ((ISSUES++))
fi

echo ""

# ============================================================================
# RECOMMENDED ACTIONS
# ============================================================================
if [ $ISSUES -gt 0 ]; then
    echo -e "${YELLOW}🔧 RECOMMENDED ACTIONS:${NC}"
    echo ""
    
    if [ "$LOCAL_HASH" != "$EC2_HASH" ]; then
        echo -e "${BLUE}1. Update EC2 code:${NC}"
        echo "   ssh -i \"$SSH_KEY\" $EC2_USER@$EC2_IP \"cd $PROJECT_PATH && git pull origin main\""
        echo ""
    fi
    
    if [ -z "$DELETE_BUTTON_CHECK" ] || [ -z "$DELETE_MODAL_CHECK" ] || [ "$BUILD_AGE" -gt 24 ] 2>/dev/null; then
        echo -e "${BLUE}2. Rebuild frontend:${NC}"
        echo "   ssh -i \"$SSH_KEY\" $EC2_USER@$EC2_IP \"cd $PROJECT_PATH/frontend && npm install && npm run build\""
        echo ""
    fi
    
    if ! echo "$PM2_STATUS" | grep -q "frontend.*online" || ! echo "$PM2_STATUS" | grep -q "backend.*online"; then
        echo -e "${BLUE}3. Restart PM2 processes:${NC}"
        echo "   ssh -i \"$SSH_KEY\" $EC2_USER@$EC2_IP \"pm2 restart frontend && pm2 restart backend\""
        echo ""
    fi
    
    echo -e "${BLUE}4. Verify deployment:${NC}"
    echo "   - Open browser: http://$EC2_IP:3000"
    echo "   - Login as HR user"
    echo "   - Navigate to any employee page"
    echo "   - Look for 'Delete Employee' button (red outline)"
    echo ""
    
    echo -e "${YELLOW}💡 Quick Fix (All-in-One):${NC}"
    echo "ssh -i \"$SSH_KEY\" $EC2_USER@$EC2_IP << 'EOF'"
    echo "cd $PROJECT_PATH"
    echo "git pull origin main"
    echo "cd frontend"
    echo "npm install"
    echo "npm run build"
    echo "pm2 restart frontend"
    echo "pm2 restart backend"
    echo "pm2 logs frontend --lines 50"
    echo "EOF"
    echo ""
else
    echo -e "${GREEN}✅ All checks passed! Delete button should be visible on EC2.${NC}"
    echo ""
    echo "If you still don't see the button, try:"
    echo "1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)"
    echo "2. Clear browser cache"
    echo "3. Open in incognito/private mode"
    echo "4. Check browser console (F12) for JavaScript errors"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Diagnostic complete!${NC}"
echo "========================================"
