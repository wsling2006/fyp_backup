# 🚀 Deploy Incremental File Selection to EC2

## ✅ Feature Status: Already Implemented and Pushed to GitHub!

The incremental file selection feature is **already in your code** and has been committed to GitHub.

---

## 📦 What's Already Done

### **Code Changes (Already Pushed):**
1. ✅ File input accumulates files instead of replacing
2. ✅ Individual X button for each file
3. ✅ Clear All button
4. ✅ File counter showing total files
5. ✅ Visual hints and tooltip
6. ✅ Documentation created (ADD_FILES_ONE_BY_ONE_FIXED.md)

### **File Modified:**
- `frontend/app/announcements/create/page.tsx`

---

## 🚀 Deploy to EC2 (Run These Commands)

### **Step 1: SSH to EC2**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### **Step 2: Pull Latest Code**
```bash
cd /home/ubuntu/fyp_system
git pull origin main
```

### **Step 3: Rebuild Frontend**
```bash
cd frontend
npm run build
pm2 restart frontend
```

### **Step 4: Verify**
```bash
pm2 logs frontend --lines 50
```

---

## 🧪 Test the Feature on EC2

### **Test 1: Add Files One by One**
```
1. Go to: http://your-ec2-ip:3000/announcements/create
2. Click "Choose Files" → Select file1.pdf → Open
   ✅ Should show: "Selected Files (1)"
   
3. Click "Choose Files" AGAIN → Select file2.xlsx → Open
   ✅ Should show: "Selected Files (2)"
   ✅ Both files should be visible
   
4. Click "Choose Files" AGAIN → Select file3.png → Open
   ✅ Should show: "Selected Files (3)"
   ✅ All 3 files should be visible
```

### **Test 2: Remove Individual File**
```
1. From Test 1, you should have 3 files selected
2. Click the X button next to file2.xlsx
   ✅ Should show: "Selected Files (2)"
   ✅ Only file1.pdf and file3.png remain
   ✅ file2.xlsx is removed
```

### **Test 3: Clear All Files**
```
1. From Test 1, you should have 3 files selected
2. Click "Clear All" button
   ✅ Should show: No files selected
   ✅ File list disappears
   ✅ Counter disappears
```

### **Test 4: Mix Methods**
```
1. Click "Choose Files" → Hold Ctrl/Cmd → Select file1 + file2 → Open
   ✅ Should show: "Selected Files (2)"
   
2. Click "Choose Files" AGAIN → Select file3 → Open
   ✅ Should show: "Selected Files (3)"
   ✅ All 3 files visible
```

---

## 🎯 Expected Behavior

### **Before (Old Behavior - FIXED):**
```
Click 1: Select file1.pdf → Shows file1 ✅
Click 2: Select file2.xlsx → REPLACES file1, only shows file2 ❌
Click 3: Select file3.png → REPLACES file2, only shows file3 ❌
Result: Only 1 file uploaded 😡
```

### **After (New Behavior - CURRENT):**
```
Click 1: Select file1.pdf → Shows file1 ✅
Click 2: Select file2.xlsx → ADDS file2, shows both ✅
Click 3: Select file3.png → ADDS file3, shows all 3 ✅
Result: All 3 files uploaded 🎉
```

---

## 🔍 Troubleshooting

### **If Files Still Replace Instead of Add:**

This means the browser is showing **cached old code**. Fix:

1. **Hard Refresh Browser:**
   - Chrome/Firefox: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Safari: `Cmd+Option+R`

2. **Clear Browser Cache:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content
   - Safari: Develop → Empty Caches

3. **Force Frontend Rebuild on EC2:**
   ```bash
   cd /home/ubuntu/fyp_system/frontend
   rm -rf .next
   npm run build
   pm2 restart frontend
   ```

4. **Check Frontend Build Time:**
   ```bash
   pm2 logs frontend --lines 50
   # Look for: "Compiled successfully" with recent timestamp
   ```

---

## 🎓 User Guide

### **How to Add Multiple Files:**

#### **Method 1: Add Files One by One** (NEW!)
```
1. Click "Choose Files" → Select 1 file → Open
2. Click "Choose Files" AGAIN → Select another file → Open
3. Repeat as needed
```

#### **Method 2: Bulk Selection** (Original)
```
1. Click "Choose Files"
2. Hold Ctrl (Windows) or Cmd (Mac)
3. Click multiple files while holding the key
4. Click Open
```

#### **Method 3: Drag and Drop**
```
1. Select multiple files in File Explorer
2. Drag them all into the file input area
```

### **How to Remove Files:**

#### **Remove One File:**
```
Click the X button next to the file you want to remove
```

#### **Remove All Files:**
```
Click the "Clear All" button at top-right of file list
```

---

## 🎨 Visual Design

### **File List Appearance:**
```
Selected Files (3):                    Clear All
┌────────────────────────────────────────────┐
│ 📄 report.pdf (245 KB)                  X │
├────────────────────────────────────────────┤
│ 📊 budget.xlsx (89 KB)                  X │
├────────────────────────────────────────────┤
│ 📈 chart.png (123 KB)                   X │
└────────────────────────────────────────────┘
```

### **Instructions/Tooltip:**
```
💡 Tip: Click "Choose Files" multiple times to add files 
   one by one, or hold Ctrl/Cmd for bulk selection
```

---

## 📝 Code Reference

### **Key Implementation:**
```tsx
// File input with incremental addition
<input
  type="file"
  multiple
  onChange={(e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]); // ← ADDS!
      e.target.value = ''; // Reset for re-selection
    }
  }}
/>

// Individual file removal
<button
  onClick={() => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== idx));
  }}
>
  X
</button>

// Clear all files
<button onClick={() => setFiles([])}>
  Clear All
</button>
```

---

## ✅ Success Criteria

After deploying to EC2, verify:

1. ✅ Can click "Choose Files" multiple times
2. ✅ Each click ADDS files (doesn't replace)
3. ✅ File counter updates correctly
4. ✅ Each file has X button
5. ✅ Clicking X removes only that file
6. ✅ "Clear All" removes all files
7. ✅ All files upload successfully when form submitted
8. ✅ Toast shows correct count of uploaded files

---

## 🎉 Congratulations!

Your announcement system now has a **production-grade file upload UX**:
- ✅ Flexible file selection (incremental OR bulk)
- ✅ Easy file management (individual remove OR clear all)
- ✅ Clear visual feedback (file list with counter)
- ✅ Helpful instructions (tooltip with both methods)
- ✅ No breaking changes (bulk selection still works)

Perfect for real-world employee usage! 🚀
