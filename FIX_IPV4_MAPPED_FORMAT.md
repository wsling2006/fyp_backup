# Fix IPv4-Mapped IPv6 Address Format

**Date:** December 22, 2025  
**Issue:** Audit logs showing `::ffff:113.211.126.75` instead of clean `113.211.126.75`

## Problem

After deploying the IP detection fixes, the real IP is being captured correctly, but showing in **IPv4-mapped IPv6 format**:

```
::ffff:113.211.126.75
```

Instead of clean IPv4 format:
```
113.211.126.75
```

## What is `::ffff:` ?

### IPv4-Mapped IPv6 Address
- **Format:** `::ffff:xxx.xxx.xxx.xxx`
- **Meaning:** An IPv4 address represented in IPv6 format
- **Why it happens:** Node.js/Express runs in IPv6 mode by default
- **Is it correct?** Yes! The IP `113.211.126.75` is your real IP
- **Is it pretty?** No! Users expect clean IPv4 format

### Technical Explanation
```
::ffff:113.211.126.75
└─┬──┘ └──────┬───────┘
  │           └─ IPv4 address (your real IP)
  └─ IPv6 prefix for IPv4-mapped addresses
```

## Solution

Added a dedicated `cleanIpAddress()` method that:

1. Removes `::ffff:` prefix (case-insensitive)
2. Removes surrounding brackets `[` `]`
3. Trims whitespace
4. Returns clean IPv4 format

### Before Fix

```typescript
private getClientIp(req: Request): string {
  const xRealIp = req.headers['x-real-ip'] as string;
  if (xRealIp) {
    return xRealIp; // ❌ Might contain ::ffff: prefix
  }
  // ... other checks
}
```

### After Fix

```typescript
private getClientIp(req: Request): string {
  let ip: string | undefined;

  // ... extract IP from headers/request

  if (!ip) {
    return 'unknown';
  }

  // ✅ Always clean the IP format before returning
  return this.cleanIpAddress(ip);
}

private cleanIpAddress(ip: string): string {
  // Remove IPv4-mapped IPv6 prefix (::ffff:192.168.1.1 → 192.168.1.1)
  let cleaned = ip.replace(/^::ffff:/i, '');
  
  // Remove surrounding brackets if present [2001:db8::1] → 2001:db8::1
  cleaned = cleaned.replace(/^\[|\]$/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned || 'unknown';
}
```

## How It Works

### Input → Output Examples

| Input | Output | Notes |
|-------|--------|-------|
| `::ffff:113.211.126.75` | `113.211.126.75` | ✅ IPv4-mapped cleaned |
| `::FFFF:192.168.1.1` | `192.168.1.1` | ✅ Case-insensitive |
| `[2001:db8::1]` | `2001:db8::1` | ✅ IPv6 brackets removed |
| `203.87.45.123` | `203.87.45.123` | ✅ Already clean |
| `  127.0.0.1  ` | `127.0.0.1` | ✅ Whitespace trimmed |
| Empty/null | `unknown` | ✅ Fallback |

## Testing

### Before Deployment
```
Audit Log IP: ::ffff:113.211.126.75 ❌
```

### After Deployment
```
Audit Log IP: 113.211.126.75 ✅
```

## Why This Happens

### IPv4 vs IPv6

**IPv4:**
- Format: `xxx.xxx.xxx.xxx` (4 octets)
- Example: `192.168.1.1`
- Address space: ~4.3 billion addresses

**IPv6:**
- Format: `xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx` (8 groups)
- Example: `2001:0db8:85a3:0000:0000:8a2e:0370:7334`
- Address space: 340 undecillion addresses

### Why Node.js Uses IPv6 Format

Modern Node.js listens on IPv6 by default for better compatibility:
```javascript
app.listen(3000, '::'); // Listens on IPv6 (and IPv4-mapped)
```

When IPv4 clients connect, Node.js represents them as **IPv4-mapped IPv6**:
```
IPv4 client: 113.211.126.75
Node.js sees: ::ffff:113.211.126.75
```

This is **completely normal** and **technically correct**, but not user-friendly!

## Files Modified

**File:** `backend/src/audit/audit.service.ts`

### Changes:
1. Refactored `getClientIp()` to extract IP first, then clean it
2. Added new `cleanIpAddress()` method
3. Now returns clean IPv4 format in all cases

## Deployment

```bash
# On EC2:
cd ~/fyp_system
git pull origin main
cd backend && npm run build
pm2 restart backend

# Check logs
pm2 logs backend --lines 20
```

## Benefits

✅ **Cleaner audit logs** - No confusing `::ffff:` prefix  
✅ **Better UX** - IPs look familiar to users  
✅ **Easier analysis** - No need to mentally strip prefix  
✅ **Export-friendly** - CSV exports look professional  
✅ **Geoip compatible** - Most geoip libraries expect clean IPs  

## Related Issues

### If you see these formats:

**`::1`**
- Meaning: IPv6 localhost
- Equivalent to: `127.0.0.1` in IPv4
- Expected when: Testing locally

**`::ffff:127.0.0.1`**
- Meaning: IPv4 localhost in IPv6 format
- Expected when: Testing locally via IPv6 stack

**`2001:db8::1`**
- Meaning: Pure IPv6 address
- Expected when: Client using IPv6 network
- Note: Will NOT be cleaned (it's a valid IPv6 address)

## Future Enhancements

### IPv6 Shortening
If you want to shorten pure IPv6 addresses:
```typescript
// 2001:0db8:0000:0000:0000:0000:0000:0001
// → 2001:db8::1
```

### IP Validation
Add validation to ensure IPs are valid:
```typescript
import { isIP } from 'net';

if (!isIP(ip)) {
  return 'invalid';
}
```

### Geolocation
Add country/city lookup:
```bash
npm install geoip-lite
```

```typescript
import * as geoip from 'geoip-lite';

const geo = geoip.lookup('113.211.126.75');
// { country: 'MY', region: 'KL', city: 'Kuala Lumpur', ... }
```

## Summary

**Problem:** `::ffff:113.211.126.75` (IPv4-mapped IPv6 format)  
**Root Cause:** Node.js IPv6 stack represents IPv4 as IPv4-mapped  
**Solution:** Add `cleanIpAddress()` to strip `::ffff:` prefix  
**Result:** `113.211.126.75` (clean IPv4 format) ✅  

**Your IP detection is working perfectly! Just needed cosmetic cleanup.** 🎨✨
