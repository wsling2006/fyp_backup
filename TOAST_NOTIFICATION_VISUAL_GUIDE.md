# Toast Notification Visual Guide 🎨

## What You'll See

### When Creating an Announcement Successfully ✅
```
┌─────────────────────────────────────────┐
│  ✅ Announcement created successfully!  │
│                                      X  │
└─────────────────────────────────────────┘
```
**Color**: Green background  
**Duration**: Auto-dismiss after 5 seconds  
**Position**: Top-right corner of screen  

---

### When a Virus is Detected 🦠
```
┌───────────────────────────────────────────────────────────┐
│  🦠 Virus detected in document.pdf. File blocked for      │
│     security.                                          X  │
└───────────────────────────────────────────────────────────┘
```
**Color**: Red background  
**Duration**: Auto-dismiss after 5 seconds  
**Position**: Top-right corner of screen  

---

### When Deleting an Announcement ✅
```
┌─────────────────────────────────────────┐
│  🗑️ Announcement deleted successfully   │
│                                      X  │
└─────────────────────────────────────────┘
```
**Color**: Green background  
**Duration**: Auto-dismiss after 5 seconds  
**Position**: Top-right corner of screen  

---

### When Downloading a File ✅
```
┌─────────────────────────────────────────┐
│  📥 Downloaded policy-update.pdf        │
│                                      X  │
└─────────────────────────────────────────┘
```
**Color**: Green background  
**Duration**: Auto-dismiss after 5 seconds  
**Position**: Top-right corner of screen  

---

### When an Upload Fails ❌
```
┌─────────────────────────────────────────────────────────┐
│  Failed to upload report.xlsx. Please try again.    X  │
└─────────────────────────────────────────────────────────┘
```
**Color**: Red background  
**Duration**: Auto-dismiss after 5 seconds  
**Position**: Top-right corner of screen  

---

### When Multiple Actions Occur 📚
```
Top-right corner:

┌─────────────────────────────────────────┐
│  ✅ Announcement created successfully!  │  ← First toast
│                                      X  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📥 Downloaded attachment1.pdf          │  ← Second toast
│                                      X  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📥 Downloaded attachment2.pdf          │  ← Third toast
│                                      X  │
└─────────────────────────────────────────┘
```
**Behavior**: Stack vertically with smooth animations  
**Animation**: Each toast slides in with 100ms stagger  

---

## Toast Types

### 1. Success (Green) ✅
- Announcement created
- Announcement deleted
- File downloaded
- Operation completed

### 2. Error (Red) ❌
- Virus detected
- Upload failed
- Delete failed
- Network error
- Load failed

### 3. Warning (Yellow) ⚠️
- File size warning
- Permission warning
- Future use

### 4. Info (Blue) ℹ️
- Processing status
- Tips and hints
- Future use

---

## User Experience Flow

### Creating an Announcement with Files

1. **User fills form** → No toast
2. **User clicks "Create Announcement"** → Button shows spinner
3. **Announcement created** → Green success toast appears
4. **Files uploading** → No toast (happens in background)
5. **File 1 clean** → No toast (silent success)
6. **File 2 has virus** → Red error toast with virus emoji 🦠
7. **File 3 clean** → No toast (silent success)
8. **Redirect to list page** → User sees all toasts before redirect

Result: User knows announcement was created successfully, but one file was blocked due to virus detection.

---

### Deleting an Announcement

1. **User clicks delete button** → Confirmation dialog appears
2. **User confirms** → Button shows spinner
3. **Delete succeeds** → Green success toast with trash emoji 🗑️
4. **List refreshes** → Shows updated list without deleted item

Result: Clear feedback that delete was successful.

---

### Downloading Files

1. **User clicks download button** → Button state changes
2. **Download starts** → Browser download begins
3. **Download succeeds** → Green success toast with download emoji 📥
4. **File saves** → User can open file

Result: Confirmation that file was successfully downloaded.

---

## Toast Behavior

### Auto-Dismiss
- All toasts automatically disappear after **5 seconds**
- Timer resets if user hovers over toast (optional feature)

### Manual Close
- User can click the **X** button anytime
- Toast immediately disappears with smooth fade-out

### Stacking
- Multiple toasts stack vertically
- Newest toast appears at the bottom of stack
- Each toast animates in with slight delay

### Animations
- **Slide-in**: Smooth slide from right
- **Fade-out**: Smooth fade when closing
- **Stagger**: 100ms delay between multiple toasts

---

## Comparison: Before vs After

### Before (alert/confirm)
```
┌──────────────────────────────────────────┐
│  JavaScript Alert                         │
│                                           │
│  Announcement created successfully!       │
│                                           │
│              [    OK    ]                 │
└──────────────────────────────────────────┘
```
❌ Blocks entire page  
❌ Ugly default styling  
❌ Must click OK to continue  
❌ One at a time only  

### After (Toast)
```
Top-right corner (non-blocking):

┌─────────────────────────────────────────┐
│  ✅ Announcement created successfully!  │
│                                      X  │
└─────────────────────────────────────────┘
```
✅ Non-blocking  
✅ Modern, beautiful design  
✅ Auto-dismisses  
✅ Can show multiple  
✅ User can continue working  

---

## Technical Animation Details

### Slide-In Animation
```css
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```
**Duration**: 300ms  
**Easing**: ease-out  

### Fade-Out Animation
```css
opacity: 1 → 0
```
**Duration**: 200ms  
**Easing**: ease-in  

---

## Color Palette

### Success (Green)
- Background: `#DEF7EC` (light green)
- Border: `#84E1BC` (medium green)
- Text: `#03543F` (dark green)
- Icon: ✅

### Error (Red)
- Background: `#FDE8E8` (light red)
- Border: `#F98080` (medium red)
- Text: `#9B1C1C` (dark red)
- Icon: ❌

### Warning (Yellow)
- Background: `#FDF6B2` (light yellow)
- Border: `#FAC96B` (medium yellow)
- Text: `#723B13` (dark yellow)
- Icon: ⚠️

### Info (Blue)
- Background: `#E1EFFE` (light blue)
- Border: `#84C5F4` (medium blue)
- Text: `#1E429F` (dark blue)
- Icon: ℹ️

---

## Accessibility

### Screen Readers
- Toast has `role="alert"` attribute
- Announces message to screen reader users
- Dismissible with keyboard (Escape key)

### Keyboard Navigation
- Press **Escape** to close all toasts
- Press **Tab** to focus close button
- Press **Enter** or **Space** to close focused toast

### High Contrast Mode
- Borders remain visible in high contrast
- Text has sufficient contrast ratio (WCAG AA compliant)

---

## Mobile Responsive

### Desktop (> 768px)
- Position: Fixed top-right
- Width: Auto (max 400px)
- Padding: 16px

### Mobile (< 768px)
- Position: Fixed top-center
- Width: 90% of screen
- Padding: 12px
- Smaller font size

---

## Testing Scenarios

### Test 1: Create Announcement
1. Fill form
2. Click "Create Announcement"
3. **Expected**: Green success toast appears

### Test 2: Upload Virus File
1. Fill form
2. Attach virus test file (EICAR)
3. Click "Create Announcement"
4. **Expected**: Red virus detection toast appears

### Test 3: Delete Announcement
1. Click delete button
2. Confirm deletion
3. **Expected**: Green success toast appears

### Test 4: Multiple Files
1. Upload 3 files (1 clean, 1 virus, 1 clean)
2. **Expected**: 1 error toast for virus file only

### Test 5: Network Error
1. Disconnect internet
2. Try to create announcement
3. **Expected**: Red error toast with network error message

---

## Summary

The toast notification system provides:
✅ **Clear visual feedback** for all user actions  
✅ **Non-blocking UI** - users can continue working  
✅ **Beautiful design** - modern and professional  
✅ **Accessibility** - screen reader and keyboard support  
✅ **Mobile responsive** - works on all devices  
✅ **Security focused** - clear virus detection warnings  

Users will always know the status of their actions! 🎉
