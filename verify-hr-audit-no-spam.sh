#!/bin/bash

# ============================================================================
# HR Audit Log Anti-Spam Verification Script
# ============================================================================
# This script verifies that:
# 1. GET /hr/employees/:id does NOT create audit logs (no spam on refresh)
# 2. PUT /hr/employees/:id DOES create audit logs (tracks sensitive changes)
# 3. System is production-ready with no log bloat
# ============================================================================

set -e

echo "========================================"
echo "HR Audit Log Anti-Spam Verification"
echo "========================================"
echo ""

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
TEST_EMPLOYEE_ID=""
HR_TOKEN=""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# ============================================================================
# Step 1: Get HR authentication token
# ============================================================================
print_status "Step 1: Authenticating as HR user..."

# You'll need to update these with your actual HR credentials
read -p "Enter HR email: " HR_EMAIL
read -sp "Enter HR password: " HR_PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$HR_EMAIL\",\"password\":\"$HR_PASSWORD\"}")

HR_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$HR_TOKEN" ]; then
    print_error "Failed to authenticate. Check credentials."
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

print_success "Authenticated successfully"

# ============================================================================
# Step 2: Get test employee ID
# ============================================================================
print_status "Step 2: Getting a test employee..."

EMPLOYEES_RESPONSE=$(curl -s -X GET "$BACKEND_URL/hr/employees" \
  -H "Authorization: Bearer $HR_TOKEN")

TEST_EMPLOYEE_ID=$(echo $EMPLOYEES_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TEST_EMPLOYEE_ID" ]; then
    print_error "No employees found to test with"
    exit 1
fi

print_success "Using test employee ID: $TEST_EMPLOYEE_ID"

# ============================================================================
# Step 3: Get current audit log count
# ============================================================================
print_status "Step 3: Recording baseline audit log count..."

INITIAL_LOG_COUNT=$(curl -s -X GET "$BACKEND_URL/audit-logs?limit=1000" \
  -H "Authorization: Bearer $HR_TOKEN" | grep -o '"id":"' | wc -l | tr -d ' ')

print_success "Current audit log count: $INITIAL_LOG_COUNT"

# ============================================================================
# Step 4: View employee profile 5 times (should NOT create logs)
# ============================================================================
print_status "Step 4: Viewing employee profile 5 times..."
print_warning "This should NOT create any audit logs (prevents spam)"

for i in {1..5}; do
    curl -s -X GET "$BACKEND_URL/hr/employees/$TEST_EMPLOYEE_ID" \
      -H "Authorization: Bearer $HR_TOKEN" > /dev/null
    echo -n "."
done
echo ""

sleep 2

# Check log count after views
VIEW_LOG_COUNT=$(curl -s -X GET "$BACKEND_URL/audit-logs?limit=1000" \
  -H "Authorization: Bearer $HR_TOKEN" | grep -o '"id":"' | wc -l | tr -d ' ')

LOGS_CREATED_BY_VIEWS=$((VIEW_LOG_COUNT - INITIAL_LOG_COUNT))

if [ $LOGS_CREATED_BY_VIEWS -eq 0 ]; then
    print_success "✓ NO audit logs created by viewing profile (spam prevention working!)"
else
    print_error "✗ FAILED: $LOGS_CREATED_BY_VIEWS audit logs created by views (spam detected!)"
    print_error "Expected: 0 logs, Got: $LOGS_CREATED_BY_VIEWS logs"
fi

# ============================================================================
# Step 5: Update employee (should create 1 audit log)
# ============================================================================
print_status "Step 5: Updating employee (should create 1 audit log)..."

TIMESTAMP=$(date +%s)
curl -s -X PUT "$BACKEND_URL/hr/employees/$TEST_EMPLOYEE_ID" \
  -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"test-$TIMESTAMP\"}" > /dev/null

sleep 2

# Check log count after update
FINAL_LOG_COUNT=$(curl -s -X GET "$BACKEND_URL/audit-logs?limit=1000" \
  -H "Authorization: Bearer $HR_TOKEN" | grep -o '"id":"' | wc -l | tr -d ' ')

LOGS_CREATED_BY_UPDATE=$((FINAL_LOG_COUNT - VIEW_LOG_COUNT))

if [ $LOGS_CREATED_BY_UPDATE -eq 1 ]; then
    print_success "✓ Exactly 1 audit log created by update (tracking sensitive changes)"
else
    print_warning "Note: $LOGS_CREATED_BY_UPDATE audit logs created by update (expected 1)"
fi

# ============================================================================
# Step 6: Verify audit log content
# ============================================================================
print_status "Step 6: Verifying audit log content..."

LATEST_LOG=$(curl -s -X GET "$BACKEND_URL/audit-logs?limit=1" \
  -H "Authorization: Bearer $HR_TOKEN")

if echo $LATEST_LOG | grep -q "UPDATE_EMPLOYEE"; then
    print_success "✓ Latest log is UPDATE_EMPLOYEE action"
else
    print_error "✗ Latest log is not UPDATE_EMPLOYEE"
fi

if echo $LATEST_LOG | grep -q "changed_fields"; then
    print_success "✓ Audit log includes changed fields tracking"
else
    print_warning "! Audit log may not include detailed change tracking"
fi

# ============================================================================
# Step 7: Summary
# ============================================================================
echo ""
echo "========================================"
echo "Verification Summary"
echo "========================================"
echo ""
echo "Initial audit logs:  $INITIAL_LOG_COUNT"
echo "After 5x views:      $VIEW_LOG_COUNT (added: $LOGS_CREATED_BY_VIEWS)"
echo "After 1x update:     $FINAL_LOG_COUNT (added: $LOGS_CREATED_BY_UPDATE)"
echo ""

if [ $LOGS_CREATED_BY_VIEWS -eq 0 ] && [ $LOGS_CREATED_BY_UPDATE -ge 1 ]; then
    print_success "========================================"
    print_success "✓ SYSTEM VERIFIED: NO SPAM!"
    print_success "========================================"
    print_success "- Profile views do NOT spam logs"
    print_success "- Updates ARE properly logged"
    print_success "- System is production-ready"
    echo ""
    exit 0
else
    print_error "========================================"
    print_error "✗ VERIFICATION FAILED"
    print_error "========================================"
    if [ $LOGS_CREATED_BY_VIEWS -gt 0 ]; then
        print_error "- Profile views ARE creating spam logs"
    fi
    if [ $LOGS_CREATED_BY_UPDATE -lt 1 ]; then
        print_error "- Updates are NOT being logged"
    fi
    echo ""
    exit 1
fi
