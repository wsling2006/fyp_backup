// PASTE THIS IN BROWSER CONSOLE (F12) - EXACT COPY

const token = localStorage.getItem('token');

if (!token) {
  console.error('❌ NO TOKEN FOUND');
} else {
  console.log('✅ Token exists');
  console.log('Token (first 100 chars):', token.substring(0, 100) + '...');
  console.log('');
  
  try {
    // Decode JWT
    const parts = token.split('.');
    console.log('Token parts:', parts.length, '(should be 3)');
    
    if (parts.length === 3) {
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      
      console.log('=== JWT HEADER ===');
      console.log(header);
      console.log('');
      
      console.log('=== JWT PAYLOAD ===');
      console.log(payload);
      console.log('');
      
      console.log('=== KEY INFORMATION ===');
      console.log('User ID (sub):', payload.sub);
      console.log('Role:', payload.role);
      console.log('Issued at:', new Date(payload.iat * 1000).toLocaleString());
      console.log('Expires at:', new Date(payload.exp * 1000).toLocaleString());
      console.log('');
      
      // Check if expired
      const now = new Date();
      const exp = new Date(payload.exp * 1000);
      const isExpired = now > exp;
      
      if (isExpired) {
        console.error('❌ TOKEN IS EXPIRED!');
        console.log('Expired:', exp.toLocaleString());
        console.log('Current:', now.toLocaleString());
        console.log('');
        console.log('FIX: Logout and login again');
      } else {
        console.log('✅ Token is valid until:', exp.toLocaleString());
        const hoursLeft = (exp - now) / (1000 * 60 * 60);
        console.log('   Time remaining:', hoursLeft.toFixed(2), 'hours');
      }
      console.log('');
      
      // Check role
      const validRoles = ['sales_department', 'marketing', 'accountant', 'human_resources', 'super_admin'];
      if (validRoles.includes(payload.role)) {
        console.log('✅ Role is VALID:', payload.role);
      } else {
        console.error('❌ Role is INVALID:', payload.role);
        console.log('Expected one of:', validRoles);
        console.log('');
        console.log('FIX: Update role in database then logout/login');
      }
      console.log('');
      
      // Check user object
      const user = JSON.parse(localStorage.getItem('user'));
      console.log('=== USER OBJECT IN LOCALSTORAGE ===');
      console.log(user);
      console.log('');
      
      console.log('=== COMPARISON ===');
      console.log('JWT role:', payload.role);
      console.log('User role:', user?.role);
      console.log('Roles match:', payload.role === user?.role);
      console.log('');
      console.log('User has id:', !!user?.id);
      console.log('User has userId:', !!user?.userId);
      
      if (!user?.userId && user?.id) {
        console.error('❌ USER MISSING userId FIELD!');
        console.log('This will cause ownership checks to fail');
        console.log('');
        console.log('FIX: Logout and login again (after frontend update)');
      } else if (user?.userId) {
        console.log('✅ User has both id and userId');
      }
      
    } else {
      console.error('❌ INVALID TOKEN FORMAT (not 3 parts)');
    }
  } catch (e) {
    console.error('❌ FAILED TO DECODE TOKEN:', e);
  }
}

console.log('');
console.log('=== NEXT: TEST API REQUEST ===');
console.log('Now testing if backend accepts this token...');
console.log('');

// Test API request
fetch('/api/purchase-requests', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('=== API RESPONSE ===');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  console.log('');
  
  if (response.status === 403) {
    console.error('❌ 403 FORBIDDEN - Backend REJECTED the token');
    console.log('');
    console.log('This means:');
    console.log('1. Token is being sent ✅');
    console.log('2. Backend received it ✅');
    console.log('3. Backend REJECTED it ❌');
    console.log('');
    console.log('Possible causes:');
    console.log('- Wrong JWT_SECRET on backend');
    console.log('- User role mismatch');
    console.log('- JwtAuthGuard or RolesGuard failing');
  } else if (response.status === 401) {
    console.error('❌ 401 UNAUTHORIZED - Token not valid');
  } else if (response.status === 200) {
    console.log('✅ 200 OK - Token accepted!');
  }
  
  return response.text();
})
.then(text => {
  console.log('');
  console.log('Response body (first 500 chars):');
  console.log(text.substring(0, 500));
  console.log('');
  
  try {
    const json = JSON.parse(text);
    console.log('Parsed JSON:');
    console.log(json);
  } catch (e) {
    console.log('(Not JSON or too long)');
  }
})
.catch(err => {
  console.error('❌ REQUEST FAILED:', err);
});

console.log('');
console.log('=== WAITING FOR API RESPONSE... ===');
