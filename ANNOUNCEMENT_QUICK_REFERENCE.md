# 🎯 Announcement System - Quick Reference Card

**Version:** 1.7 | **Status:** ✅ Production Ready | **Last Updated:** Dec 2024

---

## 🚀 **Quick Start**

### **For HR (Create Announcement)**
1. Login → Navigate to **Announcements** (sidebar)
2. Click **"Create Announcement"**
3. Fill in:
   - Title (required)
   - Content (required)
   - Priority: Normal or **Urgent** (shows modal popup)
   - Status: Draft or Published
4. Click **"Choose Files"** to attach files (up to 10)
   - Select multiple files at once (Ctrl/Cmd + Click)
   - Click "Choose Files" again to add more files
   - Click **X** to remove individual files
   - Click **"Clear All"** to remove all files
5. Click **"Submit"**
6. ✅ Toast notification confirms success

### **For HR (Edit Announcement)**
1. Go to Announcements list
2. Click **"Edit"** button (top right of announcement card)
3. Modify title, content, priority, or status
4. Submit changes
5. ✅ Changes logged in audit trail

### **For Employees (View & Comment)**
1. Login → Navigate to **Announcements**
2. Click on any announcement to view details
3. Add comment in text box → Click **"Submit"**
4. Click **❤️ Like** to react
5. Edit your own comments: Click **"Edit"** → Modify → **"Save"**
6. Delete your own comments: Click **"Delete"** → Confirm
7. Download files by clicking file names

---

## 📋 **Key Features**

| Feature | Description | Who Can Access |
|---------|-------------|----------------|
| **Create** | New announcements with files | HR only |
| **Edit** | Modify existing announcements | HR only |
| **Delete** | Soft delete (preserves data) | HR only |
| **View** | Read announcements | All employees |
| **Comment** | Add/edit/delete own comments | All employees |
| **React** | Like/unlike announcements | All employees |
| **Download** | Download attached files | All employees |
| **Urgent Modal** | Auto-popup for urgent notices | All employees |

---

## 🔐 **Security**

✅ **Authentication:** JWT required  
✅ **Authorization:** Role-based (HR vs Employee)  
✅ **Virus Scan:** ClamAV on all uploads  
✅ **File Validation:** Size and type checks  
✅ **Ownership:** Can only edit/delete own comments  
✅ **Audit Trail:** All important actions logged  

---

## 📁 **File Upload Guide**

### **Limits**
- Max files per announcement: **10**
- Max file size: **10 MB** per file
- Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG

### **How to Upload Multiple Files**
1. Click **"Choose Files"**
2. Select multiple files (Ctrl/Cmd + Click)
3. Click **"Choose Files"** again to add more
4. Files accumulate (don't replace)
5. Remove individual files with **X** button
6. Or click **"Clear All"** to start over

### **Virus Detection**
- ❌ Infected files are **blocked**
- ✅ Clean files are **uploaded**
- 📢 Toast shows which files were blocked
- ✅ Announcement still posts with clean files

---

## 🗨️ **Comment Features**

### **Add Comment**
1. Type in comment box
2. Click "Submit"
3. Appears immediately

### **Edit Your Comment**
1. Click **"Edit"** button
2. Modify text in inline editor
3. Click **"Save"** or **"Cancel"**
4. ✅ Updated comment appears

### **Delete Your Comment**
1. Click **"Delete"** button
2. Comment is soft-deleted (preserved in DB)
3. ✅ Removed from view

**Note:** You can only edit/delete your own comments, not others'.

---

## 📊 **Audit Logging**

### **Actions Logged:**
✅ Create announcement  
✅ Edit announcement (with changes tracked)  
✅ Delete announcement  
✅ View announcement (first time only)  
✅ Download file  

### **Actions NOT Logged (to prevent bloat):**
❌ Like/unlike reactions  
❌ Add/edit/delete comments  

---

## 🎨 **UI Elements**

### **Announcement List Page**
- **Search bar** (future feature)
- **Create button** (HR only)
- Announcement cards with:
  - Title, excerpt, date
  - Urgent badge (red)
  - Edit/Delete buttons (HR only, top right)

### **Announcement Detail Page**
- Full content
- File attachments (clickable downloads)
- Like button with count
- Comment section:
  - Add new comment
  - Edit/delete own comments (inline)
  - View all comments with timestamps

### **Toast Notifications**
- **Centered modal** (large, easy to read)
- **Multi-line support** (for long messages)
- **Auto-dismiss** after 5 seconds
- **Types:**
  - ✅ Success (green)
  - ❌ Error (red)

---

## 🐛 **Troubleshooting**

| Issue | Solution |
|-------|----------|
| **Files won't upload** | Check file size < 10MB, allowed type |
| **"Duplicate key" error** | Fixed in v1.4 - update to latest |
| **Can't edit announcement** | Must be HR role |
| **Can't edit comment** | Can only edit your own comments |
| **Urgent modal won't appear** | Clear browser cache, reload |
| **Toast doesn't show** | Check browser console for errors |

---

## 🔄 **Version History**

| Version | Date | Key Changes |
|---------|------|-------------|
| **v1.7** | Dec 2024 | Comment edit/delete |
| **v1.6** | Dec 2024 | Edit announcement |
| **v1.5** | Dec 2024 | UI redesign (Tailwind) |
| **v1.4** | Dec 2024 | File upload fix (duplicate key) |
| **v1.3** | Dec 2024 | Audit optimization |
| **v1.2** | Dec 2024 | UX improvements (incremental files) |
| **v1.1** | Dec 2024 | Delete feature |
| **v1.0** | Dec 2024 | Initial release |

---

## 📞 **Need Help?**

### **Check Documentation:**
- `ANNOUNCEMENT_SYSTEM_STATUS.md` - Full system overview
- `DEPLOY_TO_EC2_CHECKLIST.md` - Deployment guide
- `COMMENT_EDIT_DELETE_FEATURE.md` - Comment features

### **For Developers:**
```bash
# Backend
cd backend
npm run build        # Build
npm run start:dev    # Dev mode
npm run test         # Run tests

# Frontend
cd frontend
npm run build        # Build
npm run dev          # Dev mode
npm run lint         # Lint check
```

### **For System Admins:**
```bash
# Check logs
pm2 logs backend
pm2 logs frontend

# Restart services
pm2 restart backend
pm2 restart frontend

# Database status
psql -U postgres -d your_database
\dt  # List tables
```

---

## 🎯 **Quick Command Reference**

### **Create Announcement**
```
POST /api/announcements
Headers: Authorization: Bearer <token>
Body: multipart/form-data
  - title: string
  - content: string
  - priority: 'normal' | 'urgent'
  - status: 'draft' | 'published'
  - files: File[]
```

### **Edit Announcement**
```
PUT /api/announcements/:id
Headers: Authorization: Bearer <token>
Body: JSON
  - title?: string
  - content?: string
  - priority?: 'normal' | 'urgent'
  - status?: 'draft' | 'published'
```

### **Add Comment**
```
POST /api/announcements/:id/comments
Headers: Authorization: Bearer <token>
Body: JSON
  - content: string
```

### **Edit Comment**
```
PUT /api/announcements/:announcementId/comments/:id
Headers: Authorization: Bearer <token>
Body: JSON
  - content: string
```

### **Delete Comment**
```
DELETE /api/announcements/:announcementId/comments/:id
Headers: Authorization: Bearer <token>
```

---

## ⚡ **Performance Tips**

1. **File Uploads:** Keep files under 5MB for faster uploads
2. **Comments:** Edit inline instead of delete + re-add
3. **Caching:** Clear browser cache if UI looks outdated
4. **Audit Logs:** Use `?silent=true` for non-important actions

---

## 🎓 **Best Practices**

### **For HR:**
- ✅ Use "Urgent" priority sparingly
- ✅ Attach only necessary files
- ✅ Proofread before publishing
- ✅ Use "Draft" status for work-in-progress
- ✅ Delete outdated announcements

### **For Employees:**
- ✅ Read full announcement before commenting
- ✅ Edit typos instead of deleting/reposting
- ✅ Download files only when needed
- ✅ Use likes to acknowledge important notices

### **For Admins:**
- ✅ Monitor audit logs regularly
- ✅ Update virus definitions weekly
- ✅ Backup database before migrations
- ✅ Test on staging before production

---

**🎉 You're all set! Enjoy the Announcement System!**

---

**Quick Links:**
- [Full Documentation](./ANNOUNCEMENT_SYSTEM_STATUS.md)
- [Deployment Guide](./DEPLOY_TO_EC2_CHECKLIST.md)
- [Comment Features](./COMMENT_EDIT_DELETE_FEATURE.md)
- [GitHub Repository](https://github.com/jingwei3088/fyp_system)

**Support:** Check documentation or contact system admin.
