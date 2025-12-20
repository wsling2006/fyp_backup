# ⚡ QUICK FIX - Delete 404 Error

## 🎯 The Problem

Your delete is failing with:
```
DELETE http://13.212.227.22:3001/api/revenue/<id> 404 (Not Found)
```

## 🔧 The Solution (2 Minutes)

### On EC2, run these commands:

```bash
# 1. Pull the fix
cd /home/ubuntu/fyp_system
git pull origin main

# 2. Remove the problematic env file
rm frontend/.env.local

# 3. Rebuild frontend
cd frontend
npm run build
cd ..

# 4. Restart services
pm2 restart all

# 5. Verify
pm2 logs frontend --lines 10
```

Look for: `[API Proxy] Using backend URL: http://localhost:3000`

## ✅ Test It

1. Open browser: `http://YOUR_EC2_IP:3001`
2. Login
3. Go to Revenue
4. Delete a record you created
5. It should work now!

## 🔍 If Still Not Working

### Check browser is not caching old code:
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Check the URL in Network tab:
- ✅ Should be: `/api/revenue/123` (relative)
- ❌ Should NOT be: `http://13.212.227.22:3001/api/revenue/123` (absolute)

If it's still showing the full URL, clear browser cache completely and hard reload.

## 📖 Full Details

See `EC2_ENV_CONFIG_FIX.md` for complete explanation.

---

**That's it! The fix is now in GitHub. Pull and apply it on EC2.** 🚀
