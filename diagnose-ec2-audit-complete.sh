#!/bin/bash

# Complete EC2 HR Audit Diagnostic Script
# This script checks what code is actually running on EC2 and diagnoses audit log spam

echo "=========================================="
echo "EC2 HR Audit Log Complete Diagnostic"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check current git commit on EC2
echo -e "${BLUE}[1] Checking current Git commit on EC2...${NC}"
cd ~/fyp_system || exit 1
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo "Current commit: $CURRENT_COMMIT"
echo "Last commit message:"
git log -1 --oneline
echo ""

# Step 2: Check if there are uncommitted changes
echo -e "${BLUE}[2] Checking for uncommitted changes...${NC}"
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${GREEN}✓ No uncommitted changes - clean state${NC}"
else
    echo -e "${YELLOW}⚠ WARNING: Uncommitted changes detected!${NC}"
    git status --short
fi
echo ""

# Step 3: Check the actual code in hr.controller.ts on EC2
echo -e "${BLUE}[3] Checking hr.controller.ts anti-spam code...${NC}"
CONTROLLER_FILE="backend/src/employees/hr.controller.ts"
echo "Looking for viewedEmployees Map declaration..."
if grep -q "private viewedEmployees.*Map" "$CONTROLLER_FILE"; then
    echo -e "${GREEN}✓ Found viewedEmployees Map${NC}"
    grep -A 2 "private viewedEmployees.*Map" "$CONTROLLER_FILE"
else
    echo -e "${RED}✗ NOT FOUND: viewedEmployees Map${NC}"
fi
echo ""

echo "Looking for AUDIT SPAM DEBUG logs..."
DEBUG_COUNT=$(grep -c "AUDIT SPAM DEBUG" "$CONTROLLER_FILE")
echo "Found $DEBUG_COUNT debug log statements"
if [ "$DEBUG_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Debug logging present${NC}"
    echo "Debug log locations:"
    grep -n "AUDIT SPAM DEBUG" "$CONTROLLER_FILE" | head -5
else
    echo -e "${RED}✗ NO DEBUG LOGS FOUND${NC}"
fi
echo ""

echo "Looking for spam prevention logic in getEmployeeById..."
if grep -A 20 "async getEmployeeById" "$CONTROLLER_FILE" | grep -q "viewedEmployees.has"; then
    echo -e "${GREEN}✓ Found anti-spam logic (viewedEmployees.has check)${NC}"
    echo "Code snippet:"
    grep -A 25 "async getEmployeeById" "$CONTROLLER_FILE" | grep -B 2 -A 5 "viewedEmployees"
else
    echo -e "${RED}✗ NOT FOUND: Anti-spam logic${NC}"
fi
echo ""

# Step 4: Check if backend is compiled
echo -e "${BLUE}[4] Checking backend compilation...${NC}"
if [ -d "backend/dist" ]; then
    echo -e "${GREEN}✓ backend/dist directory exists${NC}"
    DIST_CONTROLLER="backend/dist/employees/hr.controller.js"
    if [ -f "$DIST_CONTROLLER" ]; then
        echo -e "${GREEN}✓ Compiled hr.controller.js exists${NC}"
        echo "Last modified:"
        ls -lh "$DIST_CONTROLLER"
        echo ""
        echo "Checking compiled code for viewedEmployees..."
        if grep -q "viewedEmployees" "$DIST_CONTROLLER"; then
            echo -e "${GREEN}✓ viewedEmployees found in compiled code${NC}"
        else
            echo -e "${RED}✗ viewedEmployees NOT in compiled code - RECOMPILATION NEEDED!${NC}"
        fi
        echo ""
        echo "Checking compiled code for debug logs..."
        if grep -q "AUDIT SPAM DEBUG" "$DIST_CONTROLLER"; then
            echo -e "${GREEN}✓ Debug logs found in compiled code${NC}"
        else
            echo -e "${RED}✗ Debug logs NOT in compiled code - RECOMPILATION NEEDED!${NC}"
        fi
    else
        echo -e "${RED}✗ Compiled hr.controller.js NOT FOUND${NC}"
    fi
else
    echo -e "${RED}✗ backend/dist directory does not exist - BUILD NEEDED!${NC}"
fi
echo ""

# Step 5: Check PM2 process status
echo -e "${BLUE}[5] Checking PM2 backend process...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 list | grep backend || echo "Backend process not found in pm2"
    echo ""
    echo "Backend process details:"
    pm2 describe backend 2>/dev/null | grep -E "(status|uptime|restarts|created at)" || echo "No backend process details"
else
    echo -e "${YELLOW}⚠ PM2 not found${NC}"
fi
echo ""

# Step 6: Check recent audit logs
echo -e "${BLUE}[6] Analyzing recent audit logs (last 100 lines)...${NC}"
if command -v pm2 &> /dev/null; then
    echo "Looking for AUDIT SPAM DEBUG messages..."
    DEBUG_LOGS=$(pm2 logs backend --nostream --lines 100 | grep "AUDIT SPAM DEBUG" | tail -20)
    if [ -n "$DEBUG_LOGS" ]; then
        echo -e "${GREEN}✓ Found debug logs in PM2 output:${NC}"
        echo "$DEBUG_LOGS"
    else
        echo -e "${YELLOW}⚠ NO debug logs found in recent PM2 output${NC}"
        echo "This means either:"
        echo "  1. Code is not deployed/compiled correctly"
        echo "  2. Backend hasn't been restarted after code changes"
        echo "  3. No one has viewed an employee profile recently"
    fi
    echo ""
    
    echo "Checking for HR audit log spam (Employee View actions)..."
    AUDIT_LOGS=$(pm2 logs backend --nostream --lines 100 | grep "Employee View" | tail -20)
    AUDIT_COUNT=$(echo "$AUDIT_LOGS" | grep -c "Employee View" || echo "0")
    echo "Found $AUDIT_COUNT 'Employee View' audit log entries in last 100 lines"
    if [ "$AUDIT_COUNT" -gt 0 ]; then
        echo "Recent Employee View logs:"
        echo "$AUDIT_LOGS"
    fi
else
    echo -e "${YELLOW}⚠ Cannot check PM2 logs - PM2 not available${NC}"
fi
echo ""

# Step 7: Check for TypeScript compilation errors
echo -e "${BLUE}[7] Checking for TypeScript compilation errors...${NC}"
if [ -f "backend/tsconfig.json" ]; then
    cd backend
    if command -v npm &> /dev/null; then
        echo "Running TypeScript compiler check..."
        npx tsc --noEmit 2>&1 | tail -20 || echo "No TS errors (or tsc not available)"
    else
        echo -e "${YELLOW}⚠ npm not available, cannot check TS errors${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠ tsconfig.json not found${NC}"
fi
echo ""

# Step 8: Summary and recommendations
echo "=========================================="
echo -e "${BLUE}SUMMARY & RECOMMENDATIONS${NC}"
echo "=========================================="
echo ""

# Check if recompilation is needed
NEEDS_REBUILD=false
if [ ! -f "backend/dist/employees/hr.controller.js" ]; then
    NEEDS_REBUILD=true
    echo -e "${RED}❌ ISSUE: Compiled code missing${NC}"
elif ! grep -q "viewedEmployees" "backend/dist/employees/hr.controller.js"; then
    NEEDS_REBUILD=true
    echo -e "${RED}❌ ISSUE: Compiled code is outdated (missing viewedEmployees)${NC}"
fi

if [ "$NEEDS_REBUILD" = true ]; then
    echo ""
    echo -e "${YELLOW}ACTION REQUIRED: Rebuild and restart backend${NC}"
    echo "Run these commands:"
    echo "  cd ~/fyp_system/backend"
    echo "  npm run build"
    echo "  pm2 restart backend"
    echo "  pm2 logs backend --lines 50"
else
    echo -e "${GREEN}✓ Code appears to be compiled correctly${NC}"
    echo ""
    echo "If spam still occurs, check:"
    echo "  1. View PM2 logs: pm2 logs backend --lines 100"
    echo "  2. Look for [AUDIT SPAM DEBUG] messages"
    echo "  3. Check if viewedEmployees Map is being populated"
    echo "  4. Verify userId and employeeId values in logs"
fi

echo ""
echo -e "${BLUE}Testing steps:${NC}"
echo "1. Clear browser cache/localStorage"
echo "2. Login as an HR user"
echo "3. View an employee profile"
echo "4. Check logs: pm2 logs backend --lines 30 | grep 'AUDIT SPAM DEBUG'"
echo "5. Refresh the page"
echo "6. Check logs again - should see 'Already viewed, skipping audit log'"
echo ""
echo "=========================================="
echo "Diagnostic complete!"
echo "=========================================="
