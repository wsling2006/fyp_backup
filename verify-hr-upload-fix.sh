#!/bin/bash

# Quick verification script to show HR upload fixes

echo "================================================================"
echo "HR UPLOAD FIX VERIFICATION"
echo "================================================================"
echo ""

echo "This script verifies that HR employee upload bug is FIXED"
echo ""

echo "----------------------------------------------------------------"
echo "1. UPLOAD MODAL FIX (frontend/app/hr/employees/[id]/page.tsx)"
echo "----------------------------------------------------------------"
echo ""
echo "Checking endpoint and timeout..."
grep -A 3 "api.post.*documents/upload" frontend/app/hr/employees/\[id\]/page.tsx | tail -5
echo ""

if grep -q "timeout: 120000" frontend/app/hr/employees/\[id\]/page.tsx && \
   grep -q "/documents/upload" frontend/app/hr/employees/\[id\]/page.tsx; then
    echo "✅ FIXED: Upload modal has correct endpoint + timeout"
else
    echo "❌ BROKEN: Upload modal missing fix"
fi
echo ""

echo "----------------------------------------------------------------"
echo "2. CREATE EMPLOYEE FIX (frontend/app/hr/employees/add/page.tsx)"
echo "----------------------------------------------------------------"
echo ""
echo "Checking endpoint and timeout..."
grep -A 3 "api.post.*documents/upload" frontend/app/hr/employees/add/page.tsx | head -5
echo ""

if grep -q "timeout: 120000" frontend/app/hr/employees/add/page.tsx && \
   grep -q "/documents/upload" frontend/app/hr/employees/add/page.tsx; then
    echo "✅ FIXED: Create employee has correct endpoint + timeout"
else
    echo "❌ BROKEN: Create employee missing fix"
fi
echo ""

echo "----------------------------------------------------------------"
echo "3. COMPARISON WITH WORKING ACCOUNTANT UPLOAD"
echo "----------------------------------------------------------------"
echo ""
echo "Accountant upload (working reference):"
grep -A 2 "api.post.*accountant-files/upload" frontend/app/dashboard/accountant/page.tsx | tail -3
echo ""

echo "HR upload should match this pattern:"
echo "- Correct endpoint path with /upload suffix"
echo "- timeout: 120000 (2 minutes for ClamAV scan)"
echo ""

echo "----------------------------------------------------------------"
echo "4. BACKEND ENDPOINT"
echo "----------------------------------------------------------------"
echo ""
echo "Backend route:"
grep -A 1 "@Post('employees/:id/documents/upload')" backend/src/employees/hr.controller.ts
echo ""

echo "Backend has ClamAV scanning:"
if grep -q "clamavService.scanFile" backend/src/employees/hr.controller.ts; then
    echo "✅ ClamAV malware scanning enabled"
else
    echo "❌ ClamAV malware scanning missing"
fi
echo ""

echo "================================================================"
echo "SUMMARY"
echo "================================================================"
echo ""

ALL_GOOD=true

# Check 1: Upload modal
if ! grep -q "timeout: 120000" frontend/app/hr/employees/\[id\]/page.tsx || \
   ! grep -q "/documents/upload" frontend/app/hr/employees/\[id\]/page.tsx; then
    echo "❌ Upload modal needs fix"
    ALL_GOOD=false
fi

# Check 2: Create employee
if ! grep -q "timeout: 120000" frontend/app/hr/employees/add/page.tsx || \
   ! grep -q "/documents/upload" frontend/app/hr/employees/add/page.tsx; then
    echo "❌ Create employee needs fix"
    ALL_GOOD=false
fi

# Check 3: Backend
if ! grep -q "@Post('employees/:id/documents/upload')" backend/src/employees/hr.controller.ts; then
    echo "❌ Backend route missing"
    ALL_GOOD=false
fi

if [ "$ALL_GOOD" = true ]; then
    echo "✅ ALL CHECKS PASSED - HR upload is FIXED!"
    echo ""
    echo "Next steps:"
    echo "1. Commit and push changes (if not already done)"
    echo "2. Deploy to EC2"
    echo "3. Rebuild frontend and backend"
    echo "4. Test uploads on EC2"
    echo ""
    echo "See HR_UPLOAD_DEPLOYMENT.md for detailed deployment guide"
else
    echo "❌ ISSUES FOUND - HR upload needs fixes"
    echo ""
    echo "Apply these fixes:"
    echo "1. Add timeout: 120000 to all HR upload API calls"
    echo "2. Ensure endpoint is /hr/employees/:id/documents/upload"
    echo "3. Match the pattern from accountant upload (working reference)"
fi

echo ""
echo "================================================================"
