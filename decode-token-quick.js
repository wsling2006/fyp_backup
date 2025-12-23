// Quick JWT Token Decoder
// Paste this in browser console, then run: decodeToken('YOUR_FULL_TOKEN_HERE')

function decodeToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('❌ Invalid JWT format. Token should have 3 parts separated by dots.');
            console.log('Token parts found:', parts.length);
            return;
        }

        // Decode header
        const header = JSON.parse(atob(parts[0]));
        console.log('📋 JWT Header:', header);

        // Decode payload
        const payload = JSON.parse(atob(parts[1]));
        console.log('📦 JWT Payload:', payload);

        // Check expiration
        if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            const now = new Date();
            const isExpired = now > expDate;
            console.log('⏰ Issued at:', payload.iat ? new Date(payload.iat * 1000).toLocaleString() : 'N/A');
            console.log('⏰ Expires at:', expDate.toLocaleString());
            console.log(isExpired ? '❌ TOKEN IS EXPIRED!' : '✅ Token is still valid');
            console.log('Time remaining:', Math.floor((expDate - now) / 1000 / 60), 'minutes');
        }

        // Check critical fields
        console.log('\n🔍 Critical Fields Check:');
        console.log('User ID (sub):', payload.sub || '❌ MISSING');
        console.log('Email:', payload.email || '❌ MISSING');
        console.log('Role:', payload.role || '❌ MISSING');
        
        if (payload.role !== 'sales_department') {
            console.error('⚠️ WARNING: Role is NOT sales_department!');
            console.error('Expected: sales_department');
            console.error('Got:', payload.role);
        } else {
            console.log('✅ Role is correct: sales_department');
        }

        return payload;
    } catch (error) {
        console.error('❌ Error decoding token:', error.message);
        console.log('Make sure you copied the COMPLETE token (all 3 parts)');
    }
}

console.log('✅ Decoder loaded! Usage:');
console.log('decodeToken("YOUR_FULL_JWT_TOKEN_HERE")');
console.log('\nOr to decode current token from localStorage:');
console.log('decodeToken(localStorage.getItem("token"))');
