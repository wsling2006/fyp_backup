# 🔧 Build Output Path Fix

## Issue

The deployment script was checking for `backend/dist/main.js` but NestJS builds to `backend/dist/src/main.js`.

## Root Cause

Different NestJS project configurations can output to different paths:
- **Some projects**: Build to `dist/main.js`
- **Your project**: Builds to `dist/src/main.js`

This is determined by your `tsconfig.json` and NestJS build configuration.

## Solution

Updated the deployment script to check both possible locations:
1. First checks: `backend/dist/src/main.js` (your actual structure)
2. Falls back to: `backend/dist/main.js` (alternative structure)
3. Shows helpful error message if neither exists

## Verification

Your build output structure:
```
backend/
  dist/
    src/
      main.js           ← Correct location
      app.module.js
      app.controller.js
      purchase-requests/
      auth/
      ...
    tsconfig.build.tsbuildinfo
```

## PM2 Configuration

Your `ecosystem.config.js` already has the correct path:
```javascript
{
  name: 'backend',
  script: './dist/src/main.js',  // ✅ Correct
  cwd: './backend',
  // ...
}
```

## Files Updated

1. ✅ `deploy-claim-fix.sh` - Fixed build verification step
2. ✅ `DEPLOY_EC2_LATEST_CLAIM_FIX.md` - Updated manual PM2 start commands
3. ✅ `EC2_DEPLOY_QUICKSTART.md` - Updated troubleshooting section

## How to Deploy Now

The automated script now works correctly:

```bash
# On EC2:
cd ~/fyp_system
git pull origin main
./deploy-claim-fix.sh
```

The script will now correctly detect your build output at `dist/src/main.js`.

## Manual Verification (If Needed)

To check your build output location:
```bash
cd backend
npm run build
find dist -name "main.js" -type f
```

Expected output:
```
dist/src/main.js
```

## PM2 Commands

When starting backend manually, use the correct path:
```bash
# Correct ✅
pm2 start dist/src/main.js --name backend

# Wrong ❌
pm2 start dist/main.js --name backend
```

Or use the ecosystem config (recommended):
```bash
pm2 start ecosystem.config.js
```

---

**Status**: ✅ Fixed  
**Date**: January 1, 2026
