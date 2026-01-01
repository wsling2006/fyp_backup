#!/bin/bash

# HR Upload Diagnostics Script
# Checks if HR employee upload is working correctly

echo "========================================"
echo "HR Employee Upload Diagnostic"
echo "========================================"
echo ""

echo "1. Checking frontend upload modal code..."
echo "---"
if grep -q "timeout: 120000" frontend/app/hr/employees/\[id\]/page.tsx; then
    echo "✅ Upload modal has timeout configured (120s)"
else
    echo "❌ Upload modal missing timeout configuration"
fi

if grep -q "/documents/upload" frontend/app/hr/employees/\[id\]/page.tsx; then
    echo "✅ Upload modal uses correct endpoint (/documents/upload)"
else
    echo "❌ Upload modal using wrong endpoint"
fi
echo ""

echo "2. Checking frontend create employee code..."
echo "---"
if grep -q "timeout: 120000" frontend/app/hr/employees/add/page.tsx; then
    echo "✅ Create employee has timeout configured (120s)"
else
    echo "❌ Create employee missing timeout configuration"
fi

if grep -q "/documents/upload" frontend/app/hr/employees/add/page.tsx; then
    echo "✅ Create employee uses correct endpoint (/documents/upload)"
else
    echo "❌ Create employee using wrong endpoint"
fi
echo ""

echo "3. Checking backend HR controller..."
echo "---"
if grep -q "@Post('employees/:id/documents/upload')" backend/src/employees/hr.controller.ts; then
    echo "✅ Backend has correct upload route"
else
    echo "❌ Backend missing upload route"
fi

if grep -q "clamavService.scanFile" backend/src/employees/hr.controller.ts; then
    echo "✅ Backend has ClamAV scanning"
else
    echo "❌ Backend missing ClamAV scanning"
fi
echo ""

echo "4. Comparing with working accountant upload..."
echo "---"
if grep -q "timeout: 120000" frontend/app/dashboard/accountant/page.tsx; then
    echo "✅ Accountant upload has timeout (reference implementation)"
else
    echo "⚠️  Accountant upload also missing timeout"
fi
echo ""

echo "5. Checking API proxy configuration..."
echo "---"
if grep -q "duplex: 'half'" frontend/app/api/\[...path\]/route.ts; then
    echo "✅ API proxy supports streaming (file uploads)"
else
    echo "❌ API proxy missing streaming support"
fi
echo ""

echo "========================================"
echo "Summary"
echo "========================================"
echo ""
echo "Expected flow for HR upload:"
echo "1. User selects PDF file (max 10MB)"
echo "2. Frontend POSTs to: /api/hr/employees/:id/documents/upload"
echo "3. API proxy forwards to: http://localhost:3000/hr/employees/:id/documents/upload"
echo "4. Backend validates file and runs ClamAV scan (30-60 seconds)"
echo "5. Backend stores in database and returns success"
echo "6. Frontend shows success and refreshes document list"
echo ""
echo "Common issues:"
echo "- Missing timeout → Upload appears stuck forever"
echo "- Wrong endpoint → 404 Not Found error"
echo "- Backend not running → 502 Bad Gateway"
echo "- ClamAV not running → Backend error"
echo ""

echo "To test on EC2:"
echo "1. Check backend is running: pm2 status"
echo "2. Check ClamAV is running: sudo systemctl status clamav-daemon"
echo "3. Check backend logs: pm2 logs backend --lines 50"
echo "4. Try upload and watch logs in real-time: pm2 logs backend"
echo ""
