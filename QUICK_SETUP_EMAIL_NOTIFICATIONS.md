# 📋 Quick Setup Checklist for Email Notifications

## ✅ Step-by-Step Setup

### 1. Create Gmail App Password (5 minutes)

- [ ] Go to https://myaccount.google.com/
- [ ] Click **Security** → **2-Step Verification** (enable if not already)
- [ ] Scroll down → **App passwords**
- [ ] Select **Mail** and **Other (Custom name)**
- [ ] Name it: `FYP System`
- [ ] Click **Generate**
- [ ] Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### 2. Configure Environment Variables

Edit `backend/.env` and add/update:

```env
# Required
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=abcdefghijklmnop

# Optional (defaults shown)
OFFICE_HOURS_START=8
OFFICE_HOURS_END=18
TIMEZONE_OFFSET=+8
```

**Important:** 
- Remove spaces from app password
- Use your actual timezone offset (Singapore/Malaysia = +8)

### 3. Verify Super Admin Exists

Run this SQL query in your database:

```sql
SELECT email, role, is_active FROM users WHERE role = 'super_admin';
```

✅ At least ONE super admin must have `is_active = true`

If no super admin exists, create one or update existing user:

```sql
UPDATE users SET role = 'super_admin', is_active = true WHERE email = 'admin@example.com';
```

### 4. Restart Backend

**Development:**
```bash
cd backend
npm run start:dev
```

**Production (EC2 with PM2):**
```bash
pm2 restart fyp-backend
pm2 logs fyp-backend  # Check for errors
```

### 5. Test the Notification

**Option A: Test Outside Office Hours**
- [ ] Login after 6 PM or before 8 AM
- [ ] Check super admin email for alert

**Option B: Temporarily Change Office Hours**
- [ ] Set `OFFICE_HOURS_START=10` and `OFFICE_HOURS_END=11`
- [ ] Restart backend
- [ ] Login outside 10-11 AM
- [ ] Check super admin email
- [ ] Change back to normal hours

### 6. Verify in Logs

Check backend logs for:

```
✅ [Auth] Non-office hours notification sent to 1/1 super admins
```

Or errors like:

```
⚠️ [Auth] No active super admins found to notify for non-office hours login
❌ [Auth] EMAIL_USER or EMAIL_PASS not configured. Cannot send notifications.
```

---

## 🎯 Expected Email

**Subject:** 🚨 Alert: User Login Outside Office Hours

**Contains:**
- User email
- User role
- Login timestamp
- Office hours range
- Warning message

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| No email received | Check spam folder, verify EMAIL_USER/EMAIL_PASS in .env |
| "Authentication failed" | Use App Password, not regular Gmail password |
| "No super admins found" | Create/activate super admin in database |
| Wrong timezone | Set TIMEZONE_OFFSET in .env (e.g., +8) |
| Email during office hours | Check OFFICE_HOURS_START/END and TIMEZONE_OFFSET |

---

## 📝 Configuration Examples

### Singapore/Malaysia (UTC+8)
```env
OFFICE_HOURS_START=8
OFFICE_HOURS_END=18
TIMEZONE_OFFSET=+8
```

### United States Eastern (UTC-5)
```env
OFFICE_HOURS_START=9
OFFICE_HOURS_END=17
TIMEZONE_OFFSET=-5
```

### United Kingdom (UTC+0)
```env
OFFICE_HOURS_START=9
OFFICE_HOURS_END=17
TIMEZONE_OFFSET=0
```

---

## ✨ Done!

Once setup is complete, the system will automatically send email alerts to all active super admins when any user logs in:
- Before office start time
- After office end time
- On weekends (Saturday/Sunday)

No code changes needed - just configuration! 🚀
