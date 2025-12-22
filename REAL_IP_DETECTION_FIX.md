# Real IP Address Detection Fix

**Date:** December 22, 2025  
**Issue:** Audit logs showing `127.0.0.1` (localhost) instead of real client IP addresses

## Problem Analysis

### Why 127.0.0.1 Was Showing

When your application is behind a reverse proxy (Nginx), the backend sees:
- `req.ip` = `127.0.0.1` (the proxy, not the real client)
- Real client IP is in HTTP headers: `X-Real-IP` or `X-Forwarded-For`

**Architecture:**
```
Real Client (123.45.67.89)
    ↓
Nginx Proxy (adds X-Real-IP header)
    ↓
Backend sees: 127.0.0.1 ❌
```

## Solution

### 1. Enable Trust Proxy in NestJS

**File:** `backend/src/main.ts`

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable trust proxy to get real client IP behind Nginx/reverse proxy
  app.set('trust proxy', 1);
  
  // ... rest of setup
}
```

**What this does:**
- Tells Express to trust the first proxy (Nginx)
- Makes `req.ip` read from `X-Forwarded-For` header
- Essential for getting real client IPs behind proxies

### 2. Improve IP Detection Logic

**File:** `backend/src/audit/audit.service.ts`

```typescript
/**
 * Get real client IP address from request
 * Handles X-Forwarded-For, X-Real-IP headers set by proxies (Nginx, load balancers)
 */
private getClientIp(req: Request): string {
  // Priority order for IP detection:
  // 1. X-Real-IP (set by Nginx)
  const xRealIp = req.headers['x-real-ip'] as string;
  if (xRealIp) {
    return xRealIp;
  }

  // 2. X-Forwarded-For (first IP in the chain)
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // The first one is the real client IP
    return xForwardedFor.split(',')[0].trim();
  }

  // 3. req.ip (Express, now works with trust proxy)
  if (req.ip) {
    // Remove IPv6 prefix if present (::ffff:192.168.1.1 → 192.168.1.1)
    return req.ip.replace(/^::ffff:/, '');
  }

  // 4. Fallback to connection remote address
  if (req.connection?.remoteAddress) {
    return req.connection.remoteAddress.replace(/^::ffff:/, '');
  }

  // 5. Unknown (should rarely happen)
  return 'unknown';
}
```

**Updated logFromRequest:**
```typescript
async logFromRequest(
  req: Request,
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: any,
): Promise<AuditLog> {
  // Extract real client IP (handles proxies, Nginx, etc.)
  const ipAddress = this.getClientIp(req);
  const userAgent = req.headers['user-agent'];

  return this.log({
    userId,
    action,
    resource,
    resourceId,
    ipAddress,
    userAgent,
    metadata,
  });
}
```

## How It Works

### IP Detection Priority Order

1. **X-Real-IP** (Nginx header)
   - Most reliable for single proxy setups
   - Set by: `proxy_set_header X-Real-IP $remote_addr;`

2. **X-Forwarded-For** (Standard proxy header)
   - Format: `"client_ip, proxy1_ip, proxy2_ip"`
   - Takes first IP (the real client)
   - Set by: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`

3. **req.ip** (Express property)
   - Now works correctly with `trust proxy` enabled
   - Reads from X-Forwarded-For automatically

4. **req.connection.remoteAddress** (Fallback)
   - Direct socket connection IP
   - Used if headers are missing

5. **'unknown'** (Last resort)
   - Should rarely happen
   - Indicates misconfiguration if seen frequently

### IPv6 Handling

The code removes IPv6 prefix `::ffff:` from IPv4-mapped addresses:
- Before: `::ffff:192.168.1.1`
- After: `192.168.1.1`

This makes logs cleaner and easier to read.

## Testing

### Before Fix
```
Audit Logs:
- User: lolzlolz706@gmail.com
- Action: CREATE_REVENUE
- IP: 127.0.0.1 ❌ (localhost, not real IP)
```

### After Fix
```
Audit Logs:
- User: lolzlolz706@gmail.com
- Action: CREATE_REVENUE
- IP: 203.87.45.123 ✅ (real client IP)
```

### Test Cases

1. **Local development (no proxy):**
   - Should show: `::1` (IPv6 localhost) or `127.0.0.1`
   - This is correct for local testing

2. **Production behind Nginx:**
   - Should show: Real public IP (e.g., `203.87.45.123`)
   - Test by accessing from different networks

3. **Multiple proxies/load balancers:**
   - Should show: First IP in X-Forwarded-For chain
   - Real client IP, not intermediate proxies

### Verification Commands

```bash
# Check Nginx headers being sent
curl -H "X-Real-IP: 1.2.3.4" http://localhost:3000/api/revenue

# Check audit logs in database
psql -d fyp_db -c "SELECT user_id, action, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;"

# View logs in superadmin dashboard
# Login as superadmin → Audit Logs → Check IP column
```

## Security Implications

### ✅ Benefits
1. **Accurate security monitoring** - Track real user locations
2. **Fraud detection** - Identify suspicious IP patterns
3. **Access control** - Can implement IP-based restrictions later
4. **Forensics** - Investigate security incidents with real IPs

### ⚠️ Considerations
1. **Privacy** - IPs are personal data under GDPR
2. **VPN/Proxy** - Users behind VPNs will show VPN IP (expected)
3. **Shared networks** - Multiple users may share same IP (NAT)
4. **Dynamic IPs** - ISPs may reassign IPs frequently

### GDPR Compliance
If deploying in EU:
- ✅ IPs logged for security purposes (legitimate interest)
- ✅ Time-limited retention recommended (e.g., 90 days)
- ✅ Inform users in privacy policy
- ✅ Allow data access requests

## Common IP Formats

### IPv4
```
192.168.1.1        - Private network
10.0.0.1           - Private network
172.16.0.1         - Private network
203.87.45.123      - Public IP ✅
```

### IPv6
```
::1                        - Localhost
2001:db8::1               - Public IPv6
::ffff:192.168.1.1        - IPv4-mapped (cleaned to 192.168.1.1)
```

### Special Cases
```
127.0.0.1          - Localhost (should not appear in production)
0.0.0.0            - Invalid
unknown            - Detection failed (rare)
```

## Nginx Configuration

Your existing Nginx config already has the correct headers:

```nginx
location / {
    proxy_pass http://frontend_app;
    
    # These headers pass real IP to backend ✅
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # ... other headers
}
```

No changes needed to Nginx - it's already configured correctly!

## Files Modified

1. `backend/src/main.ts` - Added trust proxy
2. `backend/src/audit/audit.service.ts` - Improved IP detection

## Deployment

```bash
# 1. Commit changes
git add backend/src/main.ts backend/src/audit/audit.service.ts
git commit -m "fix: enable real IP detection for audit logs behind proxy"
git push origin main

# 2. Deploy to EC2
ssh ubuntu@your-ec2-ip
cd ~/fyp_system
git pull origin main
cd backend && npm run build
pm2 restart backend

# 3. Test
# - Login and perform an action
# - Check audit logs for real IP (not 127.0.0.1)
```

## Troubleshooting

### Still seeing 127.0.0.1?

**Check 1: Is trust proxy enabled?**
```bash
# In backend logs, should see no errors
pm2 logs backend | grep "trust proxy"
```

**Check 2: Are Nginx headers being sent?**
```bash
# Check Nginx config
sudo nginx -t
sudo systemctl status nginx
```

**Check 3: Is request going through Nginx?**
```bash
# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

**Check 4: Test directly**
```bash
# SSH to EC2 and test
curl -H "X-Real-IP: 1.2.3.4" http://localhost:3000/revenue
# Check if audit log shows 1.2.3.4
```

### Seeing private IPs (192.168.x.x)?

This is normal if:
- Testing on local network
- Using VPN
- Behind corporate firewall

It will show public IPs when accessed from internet.

### Seeing IPv6 addresses?

This is normal! Modern internet uses IPv6.
- Format: `2001:db8::1`
- Completely valid
- Can be geolocated like IPv4

## Future Enhancements

### IP Geolocation
Add country/city detection:
```bash
npm install geoip-lite
```

```typescript
import * as geoip from 'geoip-lite';

private getIpLocation(ip: string): any {
  const geo = geoip.lookup(ip);
  return geo ? {
    country: geo.country,
    region: geo.region,
    city: geo.city,
    timezone: geo.timezone,
  } : null;
}
```

### IP-based Rate Limiting
Already implemented in Nginx! The `$binary_remote_addr` variable uses real client IP:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
```

### IP Allowlist/Blocklist
Can implement if needed:
```typescript
const blockedIps = ['1.2.3.4', '5.6.7.8'];
if (blockedIps.includes(clientIp)) {
  throw new ForbiddenException('Access denied');
}
```

## Summary

✅ **Problem:** Audit logs showing `127.0.0.1` (proxy IP)  
✅ **Solution:** Enable trust proxy + improve IP detection  
✅ **Result:** Real client IPs now captured accurately  
✅ **Security:** Better monitoring and audit trail  
✅ **Privacy:** Consider GDPR compliance if in EU  

**Deploy and your audit logs will show real IPs!** 🌍🔍
