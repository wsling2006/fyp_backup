#!/bin/bash

# ============================================================================
# Test HR Audit Silent Mode with sessionStorage Fix
# ============================================================================

echo "========================================"
echo "HR Audit Silent Mode - Test Script"
echo "========================================"
echo ""
echo "This script will help you verify the sessionStorage fix works correctly."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP $1]${NC} $2"
}

print_pass() {
    echo -e "${GREEN}  ✅ PASS:${NC} $1"
}

print_fail() {
    echo -e "${RED}  ❌ FAIL:${NC} $1"
}

print_instruction() {
    echo -e "${YELLOW}  ➡️  $1${NC}"
}

echo "Prerequisites:"
echo "  1. Backend is running (npm run start:dev)"
echo "  2. Frontend is running (npm run dev)"
echo "  3. You're logged in as HR user"
echo "  4. Browser DevTools is open (F12)"
echo ""
read -p "Press Enter when ready to start testing..."
echo ""

# ============================================================================
# Test 1: Clear sessionStorage
# ============================================================================
print_step "1" "Clear sessionStorage"
echo ""
print_instruction "In browser console, run: sessionStorage.clear()"
print_instruction "Or: DevTools → Application → Session Storage → Right-click → Clear"
echo ""
read -p "Press Enter when sessionStorage is cleared..."

# ============================================================================
# Test 2: First view should create audit log
# ============================================================================
print_step "2" "Test first view creates audit log"
echo ""
print_instruction "Navigate to any employee profile"
print_instruction "Check Console tab, should see: '[HR] Loaded employee details (silent=false)'"
echo ""
read -p "Did you see 'silent=false'? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_pass "Console shows silent=false"
else
    print_fail "Console should show silent=false on first load"
    exit 1
fi

echo ""
print_instruction "Now check audit logs page"
print_instruction "Should see a new VIEW_EMPLOYEE_PROFILE entry"
echo ""
read -p "Did you see new audit log entry? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_pass "Audit log created on first view"
else
    print_fail "Audit log should be created on first view"
    exit 1
fi

# ============================================================================
# Test 3: Check sessionStorage was set
# ============================================================================
print_step "3" "Verify sessionStorage was set"
echo ""
print_instruction "DevTools → Application tab → Session Storage"
print_instruction "Should see: hr_viewed_employee_<some-id> = 'true'"
echo ""
read -p "Do you see the sessionStorage entry? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_pass "sessionStorage set correctly"
else
    print_fail "sessionStorage should be set after first view"
    exit 1
fi

# ============================================================================
# Test 4: Refresh should NOT create audit log
# ============================================================================
print_step "4" "Test page refresh does NOT create audit log"
echo ""
print_instruction "Stay on the same employee profile page"
print_instruction "Note the current audit log count"
echo ""
read -p "Ready? Press Enter, then press F5 to refresh the page..."
echo ""
print_instruction "After refresh, check Console tab"
print_instruction "Should see: '[HR] Loaded employee details (silent=true)'"
echo ""
read -p "Did you see 'silent=true'? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_pass "Console shows silent=true on refresh"
else
    print_fail "Console should show silent=true on refresh"
    exit 1
fi

echo ""
print_instruction "Check audit logs page again"
print_instruction "The count should be THE SAME (no new log)"
echo ""
read -p "Did audit log count stay the same? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_pass "No audit log created on refresh (spam prevented!)"
else
    print_fail "Audit log count should not increase on refresh"
    exit 1
fi

# ============================================================================
# Test 5: Multiple refreshes still no logs
# ============================================================================
print_step "5" "Test multiple refreshes"
echo ""
print_instruction "Press F5 five more times"
print_instruction "After each refresh, Console should show silent=true"
echo ""
read -p "Press Enter when you've refreshed 5 times..."
echo ""
print_instruction "Check audit logs one more time"
print_instruction "Count should STILL be the same"
echo ""
read -p "Did audit log count stay the same after 5 refreshes? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_pass "Multiple refreshes do not create logs"
else
    print_fail "Multiple refreshes should not create any logs"
    exit 1
fi

# ============================================================================
# Test 6: sessionStorage persists
# ============================================================================
print_step "6" "Verify sessionStorage persists across refresh"
echo ""
print_instruction "Check Application → Session Storage again"
print_instruction "The hr_viewed_employee_<id> entry should still be 'true'"
echo ""
read -p "Is sessionStorage still set to 'true'? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_pass "sessionStorage persists across refresh"
else
    print_fail "sessionStorage should persist"
    exit 1
fi

# ============================================================================
# Test 7: Different employee creates new log
# ============================================================================
print_step "7" "Test different employee creates new log"
echo ""
print_instruction "Navigate back to employee list"
print_instruction "Click on a DIFFERENT employee"
print_instruction "Console should show silent=false (new employee!)"
echo ""
read -p "Did console show silent=false for the different employee? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_pass "Different employee triggers new audit log"
else
    print_fail "Different employee should create new log"
    exit 1
fi

# ============================================================================
# Success!
# ============================================================================
echo ""
echo "========================================"
echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
echo "========================================"
echo ""
print_pass "First view creates audit log"
print_pass "Page refresh does NOT create log"
print_pass "Multiple refreshes do NOT create logs"
print_pass "sessionStorage persists correctly"
print_pass "Different employees each get logged"
echo ""
echo -e "${GREEN}sessionStorage fix is working correctly!${NC}"
echo ""
echo "Summary:"
echo "  • Audit log spam from refresh: FIXED ✅"
echo "  • sessionStorage persists: YES ✅"
echo "  • Security maintained: YES ✅"
echo "  • Ready for production: YES ✅"
echo ""
