# 🚀 Quick Fix Deployment - Comment Edit/Delete 404

**Issue Fixed:** Comment edit/delete now works! Routes updated to proper REST structure.

---

## Deploy on EC2 (3 steps):

```bash
# 1. SSH into EC2
ssh ubuntu@your-ec2-instance

# 2. Navigate to project
cd ~/fyp_system

# 3. Run auto-fix script
git pull origin main
cd backend && npm run build && pm2 restart backend
cd ../frontend && npm run build && pm2 restart frontend
```

---

## What was fixed:

**Backend routes changed from:**
```
PUT    /announcements/comments/:id    ❌ (conflicting route)
DELETE /announcements/comments/:id    ❌ (conflicting route)
```

**To:**
```
PUT    /announcements/:announcementId/comments/:id    ✅ (proper nesting)
DELETE /announcements/:announcementId/comments/:id    ✅ (proper nesting)
```

**Frontend updated to match** - now passes `announcementId` parameter.

---

## Test after deployment:

1. Go to any announcement
2. Add a comment
3. Click "Edit" → modify → "Save"
   - ✅ Should work without 404 error
4. Click "Delete" → confirm
   - ✅ Should work without 404 error

---

## Files changed:

- `backend/src/announcements/announcements.controller.ts`
- `frontend/utils/announcementApi.ts`
- `frontend/app/announcements/[id]/page.tsx`

---

## Need help?

See detailed guide: `COMMENT_EDIT_DELETE_404_FIX.md`

---

**Commit:** b844440  
**Status:** ✅ Ready to deploy
