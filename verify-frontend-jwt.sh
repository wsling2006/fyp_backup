#!/bin/bash

# JWT Token Verification Script
# Run this in browser console after logging in

echo "==================================="
echo "JWT TOKEN VERIFICATION SCRIPT"
echo "==================================="
echo ""

echo "STEP 1: Check localStorage"
echo "Run this in browser console (F12):"
echo ""
echo "const token = localStorage.getItem('token');"
echo "const user = JSON.parse(localStorage.getItem('user'));"
echo "console.log('Token exists:', !!token);"
echo "console.log('User:', user);"
echo ""

echo "STEP 2: Decode JWT Token"
echo "Run this in browser console:"
echo ""
cat << 'EOF'
const token = localStorage.getItem('token');
if (token) {
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1]));
      console.log('=== JWT PAYLOAD ===');
      console.log('User ID (sub):', payload.sub);
      console.log('Role:', payload.role);
      console.log('Issued At:', new Date(payload.iat * 1000));
      console.log('Expires At:', new Date(payload.exp * 1000));
      console.log('Token is expired:', new Date() > new Date(payload.exp * 1000));
      console.log('Full payload:', payload);
      
      // Verify role matches expected values
      const validRoles = ['sales_department', 'marketing', 'accountant', 'human_resources', 'super_admin'];
      if (validRoles.includes(payload.role)) {
        console.log('✅ Role is VALID:', payload.role);
      } else {
        console.log('❌ Role is INVALID:', payload.role);
        console.log('Expected one of:', validRoles);
      }
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
  } else {
    console.error('Invalid token format');
  }
} else {
  console.error('No token found in localStorage');
}
EOF

echo ""
echo "STEP 3: Check API Request Headers"
echo "1. Open Network tab (F12)"
echo "2. Navigate to /purchase-requests"
echo "3. Find 'purchase-requests' request"
echo "4. Click on it → Headers tab"
echo "5. Verify 'Authorization: Bearer <token>' exists in Request Headers"
echo ""

echo "STEP 4: Test API Call"
echo "Run this in browser console:"
echo ""
cat << 'EOF'
fetch('/api/purchase-requests', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(res => {
  console.log('Status:', res.status);
  return res.json();
})
.then(data => {
  console.log('Response:', data);
})
.catch(err => {
  console.error('Error:', err);
});
EOF

echo ""
echo "==================================="
echo "EXPECTED RESULTS"
echo "==================================="
echo "✅ Token exists: true"
echo "✅ User.role: 'sales_department' (or 'marketing', 'accountant', etc.)"
echo "✅ JWT Payload.role: 'sales_department'"
echo "✅ Token is expired: false"
echo "✅ Authorization header is present in Network tab"
echo "✅ API call returns 200 OK"
echo ""

echo "==================================="
echo "IF YOU SEE ISSUES"
echo "==================================="
echo "1. Token is expired → Logout and re-login"
echo "2. Role is invalid → Check database user role"
echo "3. No Authorization header → Clear cache and re-login"
echo "4. 403 error → Run backend debugging script"
echo ""

echo "Run backend verification:"
echo "  cd /Users/jw/fyp_system"
echo "  ./verify-backend-jwt.sh"
