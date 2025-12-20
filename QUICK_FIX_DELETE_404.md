# ⚡ QUICK FIX - Delete 404 Error

## 🎯 The Problem

Your delete is failing with:
```
DELETE http://13.212.227.22:3001/api/revenue/<id> 404 (Not Found)
```

Even though the proxy logs show it's working, the browser is still using the old hardcoded IP from cached JavaScript.

## 🔧 The Solution (3 Minutes)

### On EC2, run these commands:

```bash
# 1. Pull the fix
cd /home/ubuntu/fyp_system
git pull origin main

# 2. Remove the problematic env file
rm -f frontend/.env.local

# 3. IMPORTANT: Clean old build cache
cd frontend
rm -rf .next
npm run build
cd ..

# 4. Restart services
pm2 restart all
pm2 logs frontend --lines 10

# 5. CRITICAL: Clear browser cache completely
# See instructions below
```

Look for: `[API Proxy] Using backend URL: http://localhost:3000`

## ✅ Clear Browser Cache (CRITICAL STEP)

The old JavaScript is cached in your browser. You MUST clear it:

### Option 1: Hard Refresh (Try this first)
1. Open your site
2. Open DevTools (F12)
3. Right-click the reload button
4. Select "Empty Cache and Hard Reload"

### Option 2: Clear All Cache (if Option 1 doesn't work)
1. Open Chrome Settings
2. Privacy and Security → Clear browsing data
3. Select "Cached images and files"
4. Click "Clear data"
5. Close and reopen browser
6. Visit site again

### Option 3: Incognito/Private Window
1. Open new Incognito window (Ctrl+Shift+N / Cmd+Shift+N)
2. Visit `http://YOUR_EC2_IP:3001`
3. Login and test delete

## ✅ Verify the Fix

### Check Browser Network Tab:
1. Open DevTools (F12)
2. Go to Network tab
3. Try to delete a record
4. Look at the DELETE request

**Should see:**
- ✅ URL: `/api/revenue/123` (relative path, starts with /)
- ✅ Status: 200 OK

**Should NOT see:**
- ❌ URL: `http://13.212.227.22:3001/api/revenue/123` (full URL with IP)
- ❌ Status: 404

### Check Backend Logs:
```bash
pm2 logs backend --lines 20
```

**Should see:**
```
[CONTROLLER] DELETE request received: { id: '...', userId: '...' }
[DELETE] Looking for revenue record
[AUDIT] DELETE_REVENUE
```

## 🔍 Still Not Working?

### Problem: Browser still shows full URL with IP

**Solution:** The old JavaScript is still cached. Try:

```bash
# On EC2 - Force rebuild with new timestamp
cd frontend
rm -rf .next node_modules/.cache
npm run build
cd ..
pm2 restart frontend

# On Browser - Force cache clear
# 1. Close ALL browser tabs
# 2. Clear cache (Ctrl+Shift+Delete)
# 3. Close browser completely
# 4. Reopen and try again
```

### Problem: Backend logs show no DELETE request

**Solution:** The proxy isn't forwarding. Check:

```bash
pm2 logs frontend | grep "API Proxy"
# Should see DELETE requests being proxied
```

If no logs:
```bash
# Rebuild frontend
cd frontend && rm -rf .next && npm run build && cd ..
pm2 restart frontend
```

### Problem: Backend logs show DELETE but returns 404

**Solution:** The record might not exist. Check:

```bash
# Connect to database
psql -U postgres -d fyp_db

# Check if record exists
SELECT id, client, created_by_user_id FROM revenue_record LIMIT 10;

# Try to find the specific record
SELECT * FROM revenue_record WHERE id = 'YOUR_RECORD_ID';
```

If record doesn't exist, the frontend is showing stale data. Refresh the page to reload the list.

## 📖 Full Details

See `EC2_ENV_CONFIG_FIX.md` for complete explanation.

---

**Key Point:** The JavaScript needs to be rebuilt AND the browser cache needs to be cleared. Both are required! 🚀
