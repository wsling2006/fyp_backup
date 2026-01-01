#!/bin/bash

# ============================================================================
# EC2 Diagnostic Script - Check HR Audit Implementation
# ============================================================================
# This script checks what code is actually deployed on EC2
# ============================================================================

echo "========================================"
echo "EC2 HR Audit Diagnostic Check"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_fail() {
    echo -e "${RED}  ❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
}

# ============================================================================
# Check 1: Git version
# ============================================================================
print_status "Checking Git version on EC2..."
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_BRANCH=$(git branch --show-current)
echo "  Branch: $CURRENT_BRANCH"
echo "  Commit: $CURRENT_COMMIT"

EXPECTED_COMMIT="67e1869"
if [[ $CURRENT_COMMIT == *"$EXPECTED_COMMIT"* ]]; then
    print_pass "Correct commit deployed (67e1869 - debug version)"
else
    print_fail "Wrong commit! Expected 67e1869, got $CURRENT_COMMIT"
    echo ""
    echo "Run this on EC2:"
    echo "  cd /home/ubuntu/fyp_system"
    echo "  git pull origin main"
    echo "  cd backend && pm2 restart backend"
    exit 1
fi

echo ""

# ============================================================================
# Check 2: viewedEmployees Map exists in controller
# ============================================================================
print_status "Checking if viewedEmployees Map exists in hr.controller.ts..."
if grep -q "viewedEmployees = new Map" backend/src/employees/hr.controller.ts; then
    print_pass "viewedEmployees Map found in code"
else
    print_fail "viewedEmployees Map NOT found in code!"
    echo ""
    echo "The code file doesn't have the tracking Map!"
    exit 1
fi

echo ""

# ============================================================================
# Check 3: Debug logging exists
# ============================================================================
print_status "Checking if debug logging exists..."
if grep -q "AUDIT SPAM DEBUG" backend/src/employees/hr.controller.ts; then
    print_pass "Debug logging found in code"
else
    print_fail "Debug logging NOT found in code!"
    echo ""
    echo "The debug logs are missing!"
    exit 1
fi

echo ""

# ============================================================================
# Check 4: Check actual code content
# ============================================================================
print_status "Checking actual getEmployeeById implementation..."
echo ""
echo "Code snippet from hr.controller.ts:"
echo "-----------------------------------"
grep -A 30 "async getEmployeeById" backend/src/employees/hr.controller.ts | head -35
echo "-----------------------------------"
echo ""

if grep -A 30 "async getEmployeeById" backend/src/employees/hr.controller.ts | grep -q "hasViewedBefore"; then
    print_pass "hasViewedBefore logic found"
else
    print_fail "hasViewedBefore logic NOT found"
fi

echo ""

# ============================================================================
# Check 5: PM2 process status
# ============================================================================
print_status "Checking PM2 backend process..."
PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="backend") | .pm2_env.status' 2>/dev/null || echo "unknown")

if [[ "$PM2_STATUS" == "online" ]]; then
    print_pass "Backend is running (status: online)"
else
    print_warning "Backend status: $PM2_STATUS"
    echo "  Run: pm2 restart backend"
fi

# Get restart count
RESTART_COUNT=$(pm2 jlist | jq -r '.[] | select(.name=="backend") | .pm2_env.restart_time' 2>/dev/null || echo "0")
echo "  Restart count: $RESTART_COUNT"

# Get uptime
UPTIME=$(pm2 jlist | jq -r '.[] | select(.name=="backend") | .pm2_env.pm_uptime' 2>/dev/null)
if [[ -n "$UPTIME" ]]; then
    UPTIME_SECONDS=$(( $(date +%s) - $(date -d "@$((UPTIME/1000))" +%s 2>/dev/null || echo "0") ))
    echo "  Uptime: ~$((UPTIME_SECONDS/60)) minutes"
fi

echo ""

# ============================================================================
# Check 6: Recent backend logs
# ============================================================================
print_status "Checking recent backend logs for our debug messages..."
echo ""

HAS_DEBUG_LOGS=$(pm2 logs backend --lines 100 --nostream 2>/dev/null | grep -c "AUDIT SPAM DEBUG" || echo "0")

if [[ "$HAS_DEBUG_LOGS" -gt 0 ]]; then
    print_pass "Found $HAS_DEBUG_LOGS debug log entries"
    echo ""
    echo "Recent debug logs:"
    echo "-----------------------------------"
    pm2 logs backend --lines 100 --nostream 2>/dev/null | grep "AUDIT SPAM DEBUG" | tail -10
    echo "-----------------------------------"
else
    print_fail "NO debug logs found!"
    echo ""
    echo "This means either:"
    echo "  1. Code wasn't restarted after pull"
    echo "  2. No one has viewed an employee profile since restart"
    echo "  3. The code isn't actually deployed"
    echo ""
    echo "Action: View an employee profile in the browser, then check logs again"
fi

echo ""

# ============================================================================
# Check 7: Git diff with origin
# ============================================================================
print_status "Checking if local is in sync with origin..."
git fetch origin -q
DIFF_COUNT=$(git diff origin/main --name-only | wc -l)

if [[ "$DIFF_COUNT" -eq 0 ]]; then
    print_pass "Local code is in sync with origin/main"
else
    print_warning "Local code differs from origin/main ($DIFF_COUNT files)"
    git diff origin/main --name-status
fi

echo ""

# ============================================================================
# Check 8: Node modules check
# ============================================================================
print_status "Checking if node_modules are up to date..."
if [ -d "backend/node_modules" ]; then
    print_pass "node_modules directory exists"
    
    # Check if package.json is newer than node_modules
    if [ "backend/package.json" -nt "backend/node_modules" ]; then
        print_warning "package.json is newer than node_modules"
        echo "  Run: cd backend && npm install"
    else
        print_pass "node_modules are up to date"
    fi
else
    print_fail "node_modules directory NOT found"
    echo "  Run: cd backend && npm install"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "========================================"
echo "Diagnostic Summary"
echo "========================================"
echo ""

# Check if code is correct
CODE_OK=false
if grep -q "viewedEmployees = new Map" backend/src/employees/hr.controller.ts && \
   grep -q "AUDIT SPAM DEBUG" backend/src/employees/hr.controller.ts && \
   grep -A 30 "async getEmployeeById" backend/src/employees/hr.controller.ts | grep -q "hasViewedBefore"; then
    CODE_OK=true
fi

# Check if backend is running
BACKEND_OK=false
if [[ "$PM2_STATUS" == "online" ]]; then
    BACKEND_OK=true
fi

if $CODE_OK && $BACKEND_OK; then
    if [[ "$HAS_DEBUG_LOGS" -gt 0 ]]; then
        print_pass "Everything looks good! Debug logs are working."
        echo ""
        echo "Next step: Test in browser and watch logs:"
        echo "  pm2 logs backend --lines 0"
    else
        print_warning "Code is deployed correctly, but no debug logs yet."
        echo ""
        echo "Action needed:"
        echo "  1. Open browser and view an employee profile"
        echo "  2. Watch logs: pm2 logs backend --lines 0"
        echo "  3. You should see [AUDIT SPAM DEBUG] messages"
    fi
else
    print_fail "Issues detected!"
    echo ""
    if ! $CODE_OK; then
        echo "❌ Code issue: The server-side tracking code is missing"
        echo "   Run: git pull origin main"
    fi
    if ! $BACKEND_OK; then
        echo "❌ Backend issue: Backend is not running properly"
        echo "   Run: cd backend && pm2 restart backend"
    fi
fi

echo ""
echo "========================================"
echo ""

# ============================================================================
# Quick fix commands
# ============================================================================
echo "Quick Fix Commands (if needed):"
echo ""
echo "1. Update code and restart:"
echo "   cd /home/ubuntu/fyp_system && git pull origin main && cd backend && pm2 restart backend"
echo ""
echo "2. Watch logs live:"
echo "   pm2 logs backend --lines 0"
echo ""
echo "3. Check specific endpoint:"
echo "   curl -H \"Authorization: Bearer YOUR_TOKEN\" http://localhost:3001/hr/employees/EMPLOYEE_ID"
echo ""
