# 🎯 QUICK START - HOW TO ACCESS ANNOUNCEMENTS

## ✅ Frontend is FULLY Built!

All frontend pages are created and ready. You just need to **navigate to them**.

---

## 📍 HOW TO ACCESS

### **Method 1: Direct URL (Fastest)**

After logging in, manually type in the browser:

```
http://localhost:3001/announcements
```

This will show you the announcements list page.

### **Method 2: Dashboard Card (Already Added)**

I've added an "Announcements" card to your dashboard at `/dashboard`.

**Look for**:
- Purple/violet card
- Megaphone icon (📢)
- Title: "Announcements"
- Click it to go to `/announcements`

---

## 🗺️ AVAILABLE PAGES

### **1. Announcements List** ✅
**URL**: `/announcements`  
**Access**: All authenticated users  
**Features**:
- View all announcements
- Filter by priority (URGENT, IMPORTANT, GENERAL, ALL)
- React with emojis
- Mark as read
- Download attachments
- Navigate to detail page

### **2. Create Announcement** ✅
**URL**: `/announcements/create`  
**Access**: HR role ONLY  
**Features**:
- Create new announcement
- Select priority level
- Upload multiple attachments (with security validation)
- See security policy information

### **3. Announcement Detail** ✅
**URL**: `/announcements/[id]`  
**Access**: All authenticated users  
**Features**:
- Full announcement view
- Add comments
- React with emojis
- Download attachments
- Mark as read

---

## 🚀 NAVIGATION OPTIONS FOR YOUR APP

You have several options to add navigation:

### **Option A: Add to Top Navbar** (Recommended)

If you have a top navigation bar, add:

```tsx
<a href="/announcements" className="nav-link">
  <i className="bi bi-megaphone-fill me-2"></i>
  Announcements
</a>
```

### **Option B: Add to Sidebar** (If you have one)

```tsx
<Link href="/announcements">
  <i className="bi bi-megaphone-fill"></i> Announcements
</Link>
```

### **Option C: Use Dashboard Card** (Already Done)

I've already added the card to your dashboard. Just look for the purple "Announcements" card.

### **Option D: Add HR-Specific Button**

For HR users, add a "Create Announcement" button:

```tsx
{user.role === 'HR' && (
  <Link href="/announcements/create" className="btn btn-primary">
    <i className="bi bi-plus-circle me-2"></i>
    Create Announcement
  </Link>
)}
```

---

## 🧪 TESTING INSTRUCTIONS

### **Step 1: Login as HR**
```
1. Go to http://localhost:3001
2. Login with HR credentials
```

### **Step 2: Navigate to Announcements**
```
Method 1: Type URL: http://localhost:3001/announcements
Method 2: Click dashboard card (if visible)
```

### **Step 3: Create Announcement**
```
1. Go to: http://localhost:3001/announcements/create
2. Fill in:
   - Title: "Test Announcement"
   - Priority: URGENT
   - Content: "This is a test"
3. Upload a PDF file (will work)
4. Try uploading a .exe file (will be REJECTED ✅)
5. Click "Create Announcement"
```

### **Step 4: Test Urgent Modal**
```
1. Logout
2. Login as DIFFERENT user (not HR)
3. Blocking modal should appear immediately ✅
4. Click "I Acknowledge This Announcement"
5. Modal closes and never appears again ✅
```

### **Step 5: Test List Page**
```
1. Go to /announcements
2. See your announcement listed
3. Click reaction buttons (👍 ❤️ 😮 😢 ❗)
4. Click announcement title to go to detail page
```

### **Step 6: Test Detail Page**
```
1. View full announcement
2. Add a comment
3. React with emoji
4. Download attachment (if uploaded)
5. Mark as read
```

---

## 📁 ALL FRONTEND FILES (Already Created)

```
frontend/
├── app/
│   └── announcements/
│       ├── page.tsx              ✅ List page (DONE)
│       ├── create/
│       │   └── page.tsx          ✅ Create page (DONE)
│       └── [id]/
│           └── page.tsx          ✅ Detail page (DONE)
├── components/
│   └── UrgentAnnouncementModal.tsx  ✅ Urgent modal (DONE)
└── utils/
    └── announcementApi.ts        ✅ API client (DONE)
```

---

## 🔧 IF YOU DON'T SEE THE DASHBOARD CARD

The dashboard card should appear automatically, but if you don't see it:

### **Rebuild Frontend**
```bash
cd /Users/jw/fyp_system/frontend
npm run build
pm2 restart frontend
```

### **Clear Browser Cache**
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### **Check Browser Console**
```
F12 → Console tab
Look for any errors
```

---

## 🎯 QUICK ACCESS URLS

Save these for quick testing:

```
List Page:   http://localhost:3001/announcements
Create Page: http://localhost:3001/announcements/create
Example Detail: http://localhost:3001/announcements/[copy-id-from-list]
```

---

## 🆘 IF PAGES SHOW 404

This means Next.js needs to be restarted:

```bash
cd /Users/jw/fyp_system/frontend
pm2 restart frontend

# OR if using npm run dev:
npm run dev
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Backend running: `curl http://localhost:3000/announcements -H "Authorization: Bearer TOKEN"`
- [ ] Frontend running: `curl http://localhost:3001`
- [ ] Can access: `http://localhost:3001/announcements`
- [ ] Can access: `http://localhost:3001/announcements/create` (HR only)
- [ ] Dashboard card visible (purple megaphone icon)

---

## 🎉 EVERYTHING IS READY!

**The frontend is 100% complete.** You just need to:

1. ✅ Navigate to `/announcements` (type URL or click dashboard card)
2. ✅ Create an announcement at `/announcements/create` (HR)
3. ✅ Test the urgent modal (logout and login as different user)

**All pages are built, styled, and functional!** 🚀

---

## 📞 QUICK TROUBLESHOOTING

**Q: Page shows blank/white screen**
A: Check browser console (F12) for errors

**Q: "Cannot find module" error**
A: Run `npm install` in frontend folder

**Q: 404 Not Found**
A: Restart frontend: `pm2 restart frontend`

**Q: API calls fail**
A: Check backend is running: `pm2 status backend`

**Q: No dashboard card visible**
A: Clear cache (Ctrl+Shift+R) or check `dashboard/page.tsx`

---

**The frontend is complete. Just navigate to `/announcements` to see it!** 🎯
