#!/bin/bash

# Verify Audit Log Anti-Bloat Implementation
# Tests that individual deletions don't create new log entries

echo "================================================"
echo "🔍 Audit Log Anti-Bloat Verification"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
TOKEN=""

# Login function
login() {
    echo -e "${BLUE}Step 1: Logging in as superadmin...${NC}"
    
    response=$(curl -s -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "superadmin",
            "password": "Admin123!@#"
        }')
    
    TOKEN=$(echo $response | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"//' | sed 's/"//')
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ Login failed${NC}"
        echo "Response: $response"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Login successful${NC}"
    echo ""
}

# Get initial log count
get_log_count() {
    local action=$1
    response=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "${API_URL}/audit?action=${action}")
    
    count=$(echo $response | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
    echo $count
}

# Test 1: Verify individual deletion doesn't create new log
test_individual_deletion() {
    echo -e "${BLUE}Test 1: Individual Deletion (Should NOT create new log)${NC}"
    echo "---------------------------------------------------"
    
    # Get initial DELETE_AUDIT_LOG count
    echo "1. Getting initial DELETE_AUDIT_LOG count..."
    initial_delete_count=$(get_log_count "DELETE_AUDIT_LOG")
    echo "   Initial count: ${initial_delete_count:-0}"
    
    # Get all logs to find one to delete
    echo "2. Finding a log to delete..."
    response=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "${API_URL}/audit?limit=1")
    
    log_id=$(echo $response | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"//')
    
    if [ -z "$log_id" ]; then
        echo -e "${YELLOW}⚠️  No logs found to delete. Creating a test log...${NC}"
        
        # Create a test log by viewing revenue
        curl -s -H "Authorization: Bearer $TOKEN" \
            "${API_URL}/revenue" > /dev/null
        
        sleep 1
        
        # Try again
        response=$(curl -s -H "Authorization: Bearer $TOKEN" \
            "${API_URL}/audit?limit=1")
        log_id=$(echo $response | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"//')
    fi
    
    if [ -z "$log_id" ]; then
        echo -e "${RED}❌ Could not find or create a log to delete${NC}"
        return 1
    fi
    
    echo "   Found log: $log_id"
    
    # Delete the log
    echo "3. Deleting the log..."
    delete_response=$(curl -s -X DELETE \
        -H "Authorization: Bearer $TOKEN" \
        "${API_URL}/audit/$log_id")
    
    echo "   Response: $delete_response"
    
    # Wait a moment for any potential logging to occur
    sleep 2
    
    # Get final DELETE_AUDIT_LOG count
    echo "4. Getting final DELETE_AUDIT_LOG count..."
    final_delete_count=$(get_log_count "DELETE_AUDIT_LOG")
    echo "   Final count: ${final_delete_count:-0}"
    
    # Compare counts
    echo ""
    echo "📊 Results:"
    echo "   Initial DELETE_AUDIT_LOG entries: ${initial_delete_count:-0}"
    echo "   Final DELETE_AUDIT_LOG entries: ${final_delete_count:-0}"
    
    if [ "${initial_delete_count:-0}" -eq "${final_delete_count:-0}" ]; then
        echo -e "${GREEN}✅ PASS: No new DELETE_AUDIT_LOG entry created${NC}"
        echo -e "${GREEN}   Individual deletion did NOT cause database bloat!${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL: New DELETE_AUDIT_LOG entry was created${NC}"
        echo -e "${RED}   Individual deletion IS causing database bloat!${NC}"
        return 1
    fi
}

# Test 2: Verify clear all DOES create a log
test_clear_all_logging() {
    echo ""
    echo ""
    echo -e "${BLUE}Test 2: Clear All Operation (SHOULD create log)${NC}"
    echo "---------------------------------------------------"
    echo -e "${YELLOW}⚠️  This test requires manual OTP verification${NC}"
    echo -e "${YELLOW}⚠️  Skipping automated test for clear all${NC}"
    echo ""
    echo "Manual test steps:"
    echo "1. Login to superadmin dashboard"
    echo "2. Navigate to Audit Logs page"
    echo "3. Click 'Clear All Logs' button"
    echo "4. Enter password and OTP"
    echo "5. Verify ONE new 'CLEAR_ALL_AUDIT_LOGS' entry appears"
    echo ""
}

# Test 3: Verify silent parameter works
test_silent_parameter() {
    echo ""
    echo ""
    echo -e "${BLUE}Test 3: Silent Parameter (Should NOT create VIEW log)${NC}"
    echo "---------------------------------------------------"
    
    # Get initial VIEW_REVENUE count
    echo "1. Getting initial VIEW_REVENUE count..."
    initial_view_count=$(get_log_count "VIEW_REVENUE")
    echo "   Initial count: ${initial_view_count:-0}"
    
    # Call revenue endpoint with silent=true
    echo "2. Calling /revenue?silent=true..."
    curl -s -H "Authorization: Bearer $TOKEN" \
        "${API_URL}/revenue?silent=true" > /dev/null
    
    sleep 1
    
    # Get final VIEW_REVENUE count
    echo "3. Getting final VIEW_REVENUE count..."
    final_view_count=$(get_log_count "VIEW_REVENUE")
    echo "   Final count: ${final_view_count:-0}"
    
    # Compare counts
    echo ""
    echo "📊 Results:"
    echo "   Initial VIEW_REVENUE entries: ${initial_view_count:-0}"
    echo "   Final VIEW_REVENUE entries: ${final_view_count:-0}"
    
    if [ "${initial_view_count:-0}" -eq "${final_view_count:-0}" ]; then
        echo -e "${GREEN}✅ PASS: No new VIEW_REVENUE entry created with silent=true${NC}"
        echo -e "${GREEN}   Silent parameter is working correctly!${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL: New VIEW_REVENUE entry was created despite silent=true${NC}"
        echo -e "${RED}   Silent parameter is NOT working!${NC}"
        return 1
    fi
}

# Test 4: Verify normal view DOES create a log
test_normal_view_logging() {
    echo ""
    echo ""
    echo -e "${BLUE}Test 4: Normal View (SHOULD create VIEW log)${NC}"
    echo "---------------------------------------------------"
    
    # Get initial VIEW_REVENUE count
    echo "1. Getting initial VIEW_REVENUE count..."
    initial_view_count=$(get_log_count "VIEW_REVENUE")
    echo "   Initial count: ${initial_view_count:-0}"
    
    # Call revenue endpoint WITHOUT silent parameter
    echo "2. Calling /revenue (no silent parameter)..."
    curl -s -H "Authorization: Bearer $TOKEN" \
        "${API_URL}/revenue" > /dev/null
    
    sleep 1
    
    # Get final VIEW_REVENUE count
    echo "3. Getting final VIEW_REVENUE count..."
    final_view_count=$(get_log_count "VIEW_REVENUE")
    echo "   Final count: ${final_view_count:-0}"
    
    # Compare counts
    echo ""
    echo "📊 Results:"
    echo "   Initial VIEW_REVENUE entries: ${initial_view_count:-0}"
    echo "   Final VIEW_REVENUE entries: ${final_view_count:-0}"
    
    if [ "${final_view_count:-0}" -gt "${initial_view_count:-0}" ]; then
        echo -e "${GREEN}✅ PASS: New VIEW_REVENUE entry was created${NC}"
        echo -e "${GREEN}   Normal view logging is working correctly!${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL: No new VIEW_REVENUE entry was created${NC}"
        echo -e "${RED}   Normal view logging is NOT working!${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo "This script verifies the audit log anti-bloat implementation."
    echo ""
    
    # Check if API is running
    if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
        echo -e "${RED}❌ Backend API is not running at ${API_URL}${NC}"
        echo "Please start the backend first: cd backend && npm run start:dev"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Backend API is running${NC}"
    echo ""
    
    # Login
    login
    
    # Run tests
    test1_result=0
    test3_result=0
    test4_result=0
    
    test_individual_deletion
    test1_result=$?
    
    test_clear_all_logging
    
    test_silent_parameter
    test3_result=$?
    
    test_normal_view_logging
    test4_result=$?
    
    # Summary
    echo ""
    echo ""
    echo "================================================"
    echo "📋 Test Summary"
    echo "================================================"
    
    if [ $test1_result -eq 0 ]; then
        echo -e "${GREEN}✅ Test 1: Individual deletion anti-bloat${NC}"
    else
        echo -e "${RED}❌ Test 1: Individual deletion anti-bloat${NC}"
    fi
    
    echo -e "${YELLOW}⚠️  Test 2: Clear all logging (manual)${NC}"
    
    if [ $test3_result -eq 0 ]; then
        echo -e "${GREEN}✅ Test 3: Silent parameter${NC}"
    else
        echo -e "${RED}❌ Test 3: Silent parameter${NC}"
    fi
    
    if [ $test4_result -eq 0 ]; then
        echo -e "${GREEN}✅ Test 4: Normal view logging${NC}"
    else
        echo -e "${RED}❌ Test 4: Normal view logging${NC}"
    fi
    
    echo ""
    
    if [ $test1_result -eq 0 ] && [ $test3_result -eq 0 ] && [ $test4_result -eq 0 ]; then
        echo -e "${GREEN}🎉 All automated tests passed!${NC}"
        echo -e "${GREEN}   Audit log system is working correctly without bloat.${NC}"
        exit 0
    else
        echo -e "${RED}⚠️  Some tests failed. Please review the implementation.${NC}"
        exit 1
    fi
}

# Run main function
main
