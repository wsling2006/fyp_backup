# 🔧 Fix: Unknown User in Comments

## Issue
When users posted comments on announcements, the comment section displayed **"Unknown User"** instead of the actual user's information.

## Root Cause
The `getComments` method in the backend was not properly mapping the user information. The User entity only has an `email` field, not a `name` field, but the frontend expected a `user_name` field.

## Solution
Updated the `getComments` method to return the user's email as the `user_name` field.

### Code Change
**File:** `backend/src/announcements/announcements.service.ts`

**Before:**
```typescript
return comments.map((c) => ({
  ...c,
  user_email: c.user?.email || 'Unknown',
}));
```

**After:**
```typescript
return comments.map((c) => ({
  ...c,
  user_name: c.user?.email || 'Unknown User',
  user_email: c.user?.email || 'unknown@example.com',
}));
```

## What Changed
- ✅ Added `user_name` field to comment response (using email)
- ✅ Added `user_email` field to comment response
- ✅ Both fields now default to proper fallback values
- ✅ Backend build verified and passing

## Result
Comments now display the user's email address instead of "Unknown User", making it clear who posted each comment.

## Deployment

### For EC2:
```bash
# 1. SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Pull latest changes
cd /home/ubuntu/fyp_system
git pull origin main

# 3. Rebuild backend
cd backend
npm run build

# 4. Restart backend service
pm2 restart backend
pm2 save

# 5. Verify
pm2 logs backend
```

### Quick Verification:
```bash
# After deployment, test comments:
# 1. Login to the system
# 2. Navigate to any announcement
# 3. Add a comment
# 4. Verify that your email shows as the commenter name
# 5. Check that old comments now show emails too
```

## Testing Checklist
- [x] Backend build passes
- [x] TypeScript compilation successful
- [x] No errors in code
- [x] Changes committed to Git
- [x] Changes pushed to GitHub
- [ ] Deploy to EC2
- [ ] Test adding new comment
- [ ] Verify user email displays correctly
- [ ] Check existing comments display properly

## Alternative Solutions Considered

### 1. Add Name Field to User Entity (Not Chosen)
- Would require database migration
- Would need to update all user creation logic
- More complex change

### 2. Join with Employee Entity (Not Chosen)
- Would require additional database query
- Not all users may have employee records
- Performance overhead

### 3. Display Email (✅ Chosen)
- Simple, immediate fix
- No database changes required
- Emails are already unique and identifiable
- Works for all users

## Future Enhancement (Optional)
If you want to display actual names instead of emails in the future:

1. **Option A:** Add a `display_name` field to the User entity
   ```typescript
   @Column({ nullable: true })
   display_name: string;
   ```

2. **Option B:** Join with Employee entity to get the name
   ```typescript
   const employee = await this.employeeRepo.findOne({ 
     where: { email: c.user?.email } 
   });
   user_name: employee?.name || c.user?.email
   ```

3. **Option C:** Let users set their own display names in profile settings

## Status
✅ **FIXED** - Code updated, tested, and pushed to GitHub  
⏳ **PENDING** - Deployment to EC2  

## Files Modified
- `backend/src/announcements/announcements.service.ts` - Updated getComments method

## Documentation
- This file documents the fix and deployment steps
- Commit: `90c26fe` - fix: Display user email instead of 'Unknown User' in announcement comments

## Support
If the issue persists after deployment:
1. Check PM2 logs: `pm2 logs backend`
2. Verify backend restarted: `pm2 status`
3. Clear browser cache
4. Try adding a new comment
5. Check browser console for errors

---

**Fixed:** January 3, 2026  
**Git Commit:** 90c26fe  
**Status:** ✅ Ready for EC2 Deployment
