# 🔧 Comment Edit/Delete 404 Fix - Deployment Guide

**Issue:** Getting 404 errors when trying to edit or delete comments  
**Root Cause:** Backend routes were not properly nested with announcementId  
**Status:** ✅ FIXED

---

## 🐛 **Problem**

When users tried to edit or delete their comments, they received 404 errors:

```
DELETE http://13.251.103.187:3001/api/announcements/comments/201a4e9c-... 404 (Not Found)
PUT http://13.251.103.187:3001/api/announcements/comments/201a4e9c-... 404 (Not Found)
```

The frontend was making requests to:
- `PUT /api/announcements/comments/:commentId`
- `DELETE /api/announcements/comments/:commentId`

But the backend routes had a conflict with other announcement routes like:
- `GET /announcements/:id/comments`

NestJS was interpreting `comments` as the `:id` parameter instead of a literal path segment.

---

## ✅ **Solution**

Changed the routes to follow proper REST nesting:

### **Backend Changes**

**Before:**
```typescript
@Put('comments/:commentId')
async updateComment(@Param('commentId') commentId: string, ...)

@Delete('comments/:commentId')
async deleteComment(@Param('commentId') commentId: string, ...)
```

**After:**
```typescript
@Put(':announcementId/comments/:commentId')
async updateComment(
  @Param('announcementId') announcementId: string,
  @Param('commentId') commentId: string, 
  ...
)

@Delete(':announcementId/comments/:commentId')
async deleteComment(
  @Param('announcementId') announcementId: string,
  @Param('commentId') commentId: string,
  ...
)
```

### **Frontend Changes**

**Before:**
```typescript
export const updateComment = async (commentId: string, content: string) => {
  const { data } = await api.put(`/announcements/comments/${commentId}`, { content });
  return data;
};

export const deleteComment = async (commentId: string) => {
  const { data } = await api.delete(`/announcements/comments/${commentId}`);
  return data;
};
```

**After:**
```typescript
export const updateComment = async (announcementId: string, commentId: string, content: string) => {
  const { data } = await api.put(`/announcements/${announcementId}/comments/${commentId}`, { content });
  return data;
};

export const deleteComment = async (announcementId: string, commentId: string) => {
  const { data } = await api.delete(`/announcements/${announcementId}/comments/${commentId}`);
  return data;
};
```

### **Page Component Changes**

**Before:**
```typescript
await updateComment(commentId, editingContent);
await deleteComment(commentId);
```

**After:**
```typescript
await updateComment(announcementId, commentId, editingContent);
await deleteComment(announcementId, commentId);
```

---

## 🚀 **Deployment Steps for EC2**

### **Option 1: Automated (Recommended)**

Run the provided script on EC2:

```bash
# SSH into EC2
ssh ubuntu@your-ec2-instance

# Navigate to project directory
cd ~/fyp_system

# Run the fix script
./fix-comment-edit-delete-404.sh
```

The script will:
1. Pull latest code from GitHub
2. Rebuild backend
3. Restart backend service
4. Test the endpoints
5. Confirm the fix is applied

### **Option 2: Manual**

If you prefer manual deployment:

```bash
# SSH into EC2
ssh ubuntu@your-ec2-instance

# Navigate to project directory
cd ~/fyp_system

# Pull latest code
git pull origin main

# Rebuild backend
cd backend
npm run build

# Restart backend
pm2 restart backend

# Wait for service to start
sleep 5

# Rebuild frontend
cd ../frontend
npm run build

# Restart frontend
pm2 restart frontend

# Verify services are running
pm2 status
```

---

## 🧪 **Testing the Fix**

### **1. Test via Browser**

1. Navigate to any announcement detail page
2. Add a comment
3. Click **"Edit"** on your comment
4. Modify the text
5. Click **"Save"**
   - ✅ Should see "Comment updated successfully!" toast
   - ✅ Comment should update without 404 error
6. Click **"Delete"** on your comment
7. Confirm deletion
   - ✅ Should see "Comment deleted successfully!" toast
   - ✅ Comment should disappear without 404 error

### **2. Test via API (Optional)**

```bash
# Get your JWT token from browser (Application > Local Storage > token)
TOKEN="your-jwt-token"

# Get announcement ID and comment ID from the browser

# Test UPDATE comment
curl -X PUT http://localhost:3000/announcements/YOUR_ANNOUNCEMENT_ID/comments/YOUR_COMMENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Updated comment text"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Test DELETE comment
curl -X DELETE http://localhost:3000/announcements/YOUR_ANNOUNCEMENT_ID/comments/YOUR_COMMENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected status codes:
- ✅ `200 OK` for successful update
- ✅ `200 OK` for successful delete
- ❌ `401 Unauthorized` if token is invalid
- ❌ `403 Forbidden` if you're not the comment owner

---

## 📊 **Verification Checklist**

After deployment, verify:

- [ ] Backend builds successfully (`npm run build`)
- [ ] Frontend builds successfully (`npm run build`)
- [ ] PM2 services are running (`pm2 status`)
- [ ] Backend logs show no errors (`pm2 logs backend --lines 20`)
- [ ] Frontend logs show no errors (`pm2 logs frontend --lines 20`)
- [ ] Can add comments (should already work)
- [ ] Can edit own comments (FIXED ✅)
- [ ] Can delete own comments (FIXED ✅)
- [ ] Cannot edit others' comments (ownership check)
- [ ] Cannot delete others' comments (ownership check)
- [ ] Toast notifications appear for success/error
- [ ] No 404 errors in browser console

---

## 🔍 **What Changed**

| File | Changes |
|------|---------|
| `backend/src/announcements/announcements.controller.ts` | Updated route decorators to include `:announcementId` parameter |
| `frontend/utils/announcementApi.ts` | Updated API functions to accept and pass `announcementId` |
| `frontend/app/announcements/[id]/page.tsx` | Updated component to pass `announcementId` to API calls |
| `fix-comment-edit-delete-404.sh` | Created automated deployment script |

---

## 🎯 **Why This Fix Works**

### **REST Best Practices**

The new route structure follows RESTful conventions:

```
GET    /announcements/:announcementId/comments          - List comments
POST   /announcements/:announcementId/comments          - Create comment
PUT    /announcements/:announcementId/comments/:id      - Update comment
DELETE /announcements/:announcementId/comments/:id      - Delete comment
```

This clearly shows that comments are a **nested resource** under announcements.

### **Route Resolution**

With the old routes:
```
/announcements/:id/comments       ← GET comments (OK)
/announcements/comments/:id       ← UPDATE/DELETE (CONFLICT!)
```

NestJS router couldn't distinguish between:
- `/announcements/comments/123` (intended: update comment 123)
- `/announcements/:id/comments` (matched: get comments for announcement "comments")

With the new routes:
```
/announcements/:announcementId/comments           ← GET, POST
/announcements/:announcementId/comments/:id       ← PUT, DELETE
```

All routes are now properly nested and there's no ambiguity.

---

## 🐛 **Rollback (if needed)**

If the fix causes issues (unlikely), rollback:

```bash
cd ~/fyp_system

# Revert to previous commit
git reset --hard HEAD~1

# Rebuild and restart
cd backend && npm run build && pm2 restart backend
cd ../frontend && npm run build && pm2 restart frontend
```

**Note:** You'll need to manually edit/delete comments via database if rollback is necessary.

---

## 📝 **Database Impact**

✅ **No database changes required**

This fix only changes:
- API route structure
- Function signatures
- Frontend API calls

The database schema remains unchanged.

---

## 🎓 **Lessons Learned**

1. **Always use proper REST nesting** for nested resources
2. **Test route resolution** - overlapping patterns can cause conflicts
3. **Include parent IDs in URLs** for nested resources
4. **Follow framework conventions** - NestJS expects specific route patterns

---

## 📞 **Support**

If you encounter issues after deployment:

### **Check Backend Logs**
```bash
pm2 logs backend --lines 50
```

Look for:
- Route registration messages
- 404 errors
- Authentication errors

### **Check Frontend Logs**
```bash
pm2 logs frontend --lines 50
```

Look for:
- API proxy messages
- Request/response logs
- Error messages

### **Test Endpoints Directly**
```bash
# Test backend directly (bypassing frontend)
curl -X GET http://localhost:3000/announcements -H "Authorization: Bearer YOUR_TOKEN"
```

### **Common Issues**

| Issue | Solution |
|-------|----------|
| Still getting 404 | Clear browser cache, hard refresh (Ctrl+Shift+R) |
| "Unauthorized" error | Check if you're logged in, token may have expired |
| "Cannot edit comment" | Verify you're the comment owner |
| Backend won't start | Check `pm2 logs backend` for build errors |
| Changes not applied | Verify latest code pulled (`git log -1`) |

---

## ✅ **Success Criteria**

After deployment, you should be able to:

1. ✅ Edit your own comments without 404 errors
2. ✅ Delete your own comments without 404 errors
3. ✅ See toast notifications for success/error
4. ✅ Comments update in real-time
5. ✅ Ownership checks still work (can't edit others' comments)

---

**Commit:** `d787379` - Update comment edit/delete routes  
**Date:** December 2024  
**Status:** ✅ Ready for production deployment

---

**END OF FIX GUIDE**
