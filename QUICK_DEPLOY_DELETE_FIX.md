# 🚀 Quick Deploy to EC2 - Delete Fix

## The Problem
Your EC2 backend is running the OLD code. The fix I made is only on GitHub, not deployed yet.

## Quick Deploy Steps

### Option 1: Automated Script (Easiest)

SSH to your EC2 and run:

```bash
cd ~/fyp_system
git pull
bash deploy-delete-fix-to-ec2.sh
```

### Option 2: Manual Steps

SSH to your EC2 and run:

```bash
# Step 1: Pull latest code
cd ~/fyp_system
git pull

# Step 2: Rebuild backend
cd backend
npm run build

# Step 3: Restart backend
pm2 restart backend

# Step 4: Check status
pm2 status
pm2 logs backend --lines 20
```

## What Was Fixed

The backend was using **cached data** when checking if a purchase request has claims. Even after you deleted all claims, the cache still showed claims existed.

**The fix:** Added `cache: false` to force fresh data from database:

```typescript
const pr = await this.purchaseRequestRepo.findOne({
  where: { id: prId },
  relations: ['createdBy', 'claims'],
  cache: false, // ← This forces fresh data
});
```

## Testing After Deploy

1. **Monitor backend logs** (in EC2 terminal):
   ```bash
   pm2 logs backend --lines 50
   ```

2. **Try to delete** an APPROVED request with no claims

3. **Check logs** - you should see:
   ```
   [deletePurchaseRequest] PR ID: xxxxxxxx
   [deletePurchaseRequest] PR Status: APPROVED
   [deletePurchaseRequest] Claims count: 0       ← Should be 0!
   [deletePurchaseRequest] canDeleteApproved: true
   [deletePurchaseRequest] ✅ Deletion allowed, proceeding...
   ```

4. **If successful**: Purchase request will be deleted! ✅

5. **If still failing**: 
   - Check if `Claims count:` is still > 0
   - Try restarting PostgreSQL: `sudo systemctl restart postgresql`
   - Share the full backend logs with me

## What to Look For

### ✅ Success Indicators:
- Logs show `Claims count: 0`
- Logs show `canDeleteApproved: true`
- Logs show `✅ Deletion allowed, proceeding...`
- No error message in browser
- Purchase request is removed from list

### ❌ Failure Indicators:
- Logs show `Claims count: 1` or higher
- Error message about "Cannot delete purchase request with status APPROVED"
- No debug logs appearing at all (means code not deployed)

## SSH Command Reminder

From your local machine:
```bash
ssh ubuntu@your-ec2-ip-address
```

Or if you have a key:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip-address
```

---

**Status:** Ready to deploy  
**Date:** January 1, 2026  
**Changes:** Cache fix + debug logging
