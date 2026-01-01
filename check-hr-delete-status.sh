#!/bin/bash

# Quick EC2 System Status Check
# Verifies HR deletion feature deployment

echo "=========================================="
echo "HR Deletion Feature - System Status Check"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if we're on EC2 or checking remotely
if [ -f "/home/ubuntu/fyp_system/backend/package.json" ]; then
    echo -e "${GREEN}Running on EC2 instance${NC}"
    IS_EC2=true
    BASE_PATH="/home/ubuntu/fyp_system"
else
    echo -e "${YELLOW}Running from local machine${NC}"
    IS_EC2=false
    BASE_PATH="/Users/jw/fyp_system"
fi

echo ""
echo "=== File Checks ==="

# Check key files exist
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
    else
        echo -e "${RED}✗${NC} $description (missing: $file)"
    fi
}

check_file "$BASE_PATH/backend/src/employees/hr.controller.ts" "HR Controller"
check_file "$BASE_PATH/backend/src/employees/hr.service.ts" "HR Service"
check_file "$BASE_PATH/backend/src/users/users.service.ts" "Users Service (OTP)"
check_file "$BASE_PATH/frontend/app/hr/employees/[id]/page.tsx" "Employee Detail Page"

echo ""
echo "=== Code Verification ==="

# Check for key code patterns
check_code() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
    else
        echo -e "${RED}✗${NC} $description (pattern not found: $pattern)"
    fi
}

check_code "$BASE_PATH/backend/src/employees/hr.controller.ts" "request-delete-otp" "Delete OTP endpoint"
check_code "$BASE_PATH/backend/src/employees/hr.controller.ts" "@Delete('employees/:id')" "Delete employee endpoint"
check_code "$BASE_PATH/backend/src/users/users.service.ts" "generateOtp" "OTP generation method"
check_code "$BASE_PATH/backend/src/users/users.service.ts" "sendOtpEmail" "Email sending method"
check_code "$BASE_PATH/frontend/app/hr/employees/[id]/page.tsx" "otpCode" "Correct field name (otpCode)"

if [ "$IS_EC2" = true ]; then
    echo ""
    echo "=== Process Checks ==="
    
    # Check backend process
    if pgrep -f "node dist/main.js" > /dev/null; then
        BACKEND_PID=$(pgrep -f "node dist/main.js")
        echo -e "${GREEN}✓${NC} Backend running (PID: $BACKEND_PID)"
    else
        echo -e "${RED}✗${NC} Backend not running"
    fi
    
    # Check frontend process
    if pgrep -f "next start" > /dev/null; then
        FRONTEND_PID=$(pgrep -f "next start")
        echo -e "${GREEN}✓${NC} Frontend running (PID: $FRONTEND_PID)"
    else
        echo -e "${RED}✗${NC} Frontend not running"
    fi
    
    echo ""
    echo "=== Port Checks ==="
    
    # Check backend port
    if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
        echo -e "${GREEN}✓${NC} Backend port 3000 listening"
    else
        echo -e "${YELLOW}⚠${NC} Backend port 3000 not detected"
    fi
    
    # Check frontend port
    if netstat -tuln 2>/dev/null | grep -q ":3001 "; then
        echo -e "${GREEN}✓${NC} Frontend port 3001 listening"
    else
        echo -e "${YELLOW}⚠${NC} Frontend port 3001 not detected"
    fi
    
    echo ""
    echo "=== Recent Logs ==="
    
    echo ""
    echo -e "${BLUE}Last 10 Backend Logs:${NC}"
    if [ -f "$BASE_PATH/backend/backend.log" ]; then
        tail -n 10 "$BASE_PATH/backend/backend.log"
    else
        echo "No backend log file found"
    fi
    
    echo ""
    echo -e "${BLUE}Last 10 Audit Logs:${NC}"
    if [ -f "$BASE_PATH/backend/audit.log" ]; then
        tail -n 10 "$BASE_PATH/backend/audit.log"
    else
        echo "No audit log file found"
    fi
    
    echo ""
    echo "=== Environment Check ==="
    
    # Check .env exists
    if [ -f "$BASE_PATH/backend/.env" ]; then
        echo -e "${GREEN}✓${NC} Backend .env exists"
        
        # Check email config (without showing values)
        if grep -q "MAIL_HOST" "$BASE_PATH/backend/.env"; then
            echo -e "${GREEN}✓${NC} Email configuration present"
        else
            echo -e "${RED}✗${NC} Email configuration missing"
        fi
    else
        echo -e "${RED}✗${NC} Backend .env missing"
    fi
    
    if [ -f "$BASE_PATH/frontend/.env.local" ]; then
        echo -e "${GREEN}✓${NC} Frontend .env.local exists"
    else
        echo -e "${YELLOW}⚠${NC} Frontend .env.local missing (may use defaults)"
    fi
fi

echo ""
echo "=== Git Status ==="
cd "$BASE_PATH"
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "Branch: $BRANCH"
echo "Commit: $COMMIT"

if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${GREEN}✓${NC} No uncommitted changes"
else
    echo -e "${YELLOW}⚠${NC} Uncommitted changes present"
fi

echo ""
echo "=== Summary ==="
echo ""
echo "To deploy to EC2:"
echo "  1. Update EC2 credentials in: ./deploy-hr-delete-to-ec2.sh"
echo "  2. Run: ./deploy-hr-delete-to-ec2.sh"
echo ""
echo "To test the feature:"
echo "  1. Review checklist: HR_DELETE_TESTING_CHECKLIST.md"
echo "  2. Login as HR admin"
echo "  3. Navigate to employee profile"
echo "  4. Test deletion flow with OTP"
echo ""
echo "To monitor logs:"
if [ "$IS_EC2" = true ]; then
    echo "  Backend: tail -f $BASE_PATH/backend/backend.log"
    echo "  Audit: tail -f $BASE_PATH/backend/audit.log"
    echo "  Frontend: tail -f $BASE_PATH/frontend/frontend.log"
else
    echo "  SSH to EC2 and run:"
    echo "  tail -f ~/fyp_system/backend/backend.log"
    echo "  tail -f ~/fyp_system/backend/audit.log"
fi
echo ""
echo "=========================================="
