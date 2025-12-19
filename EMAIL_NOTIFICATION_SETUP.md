# Email Notification Setup Guide

## 📧 Gmail Configuration for Non-Office Hours Alerts

This system sends email notifications to super admins when users log in outside office hours.

---

## 🔧 Required Environment Variables

Add these to your `.env` file in the `backend` folder:

```env
# Gmail Configuration (REQUIRED)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password

# Office Hours Configuration (OPTIONAL - defaults shown)
OFFICE_HOURS_START=8          # Start of office hours (24-hour format, default: 8 AM)
OFFICE_HOURS_END=18           # End of office hours (24-hour format, default: 6 PM)

# Timezone Configuration (OPTIONAL - uses server timezone if not set)
TIMEZONE_OFFSET=+8            # Your business timezone offset from UTC
                              # Examples: +8 for Asia/Singapore, -5 for US Eastern, 0 for UTC
```

---

## 📝 Step-by-Step Setup

### 1. Create Gmail App Password

Since Gmail has 2-Factor Authentication, you need an **App Password**:

1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security** from the left menu
3. Under "Signing in to Google", select **2-Step Verification**
   - If not enabled, enable it first
4. Scroll to bottom and select **App passwords**
5. Select app: **Mail**
6. Select device: **Other (Custom name)**
7. Enter name: `FYP System`
8. Click **Generate**
9. Copy the 16-character password (example: `abcd efgh ijkl mnop`)

### 2. Update Environment Variables

Edit `backend/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcdefghijklmnop    # 16-character app password (no spaces)
OFFICE_HOURS_START=8
OFFICE_HOURS_END=18
TIMEZONE_OFFSET=+8              # Adjust based on your location
```

### 3. Restart Backend Server

```bash
cd backend
npm run start:dev
# OR on EC2:
pm2 restart fyp-backend
```

---

## 🌍 Timezone Examples

Choose your timezone offset:

| Location | Offset | Example |
|----------|--------|---------|
| Singapore, Malaysia, China | `+8` | `TIMEZONE_OFFSET=+8` |
| Japan, Korea | `+9` | `TIMEZONE_OFFSET=+9` |
| India | `+5.5` | `TIMEZONE_OFFSET=+5.5` |
| UK (GMT) | `0` | `TIMEZONE_OFFSET=0` |
| US Eastern | `-5` | `TIMEZONE_OFFSET=-5` |
| US Pacific | `-8` | `TIMEZONE_OFFSET=-8` |

---

## ✅ How It Works

1. **Login Detection**
   - When any user logs in (including via MFA)
   - System checks current time against office hours

2. **Non-Office Hours Criteria**
   - Login time is before `OFFICE_HOURS_START` (default: 8 AM)
   - OR login time is after `OFFICE_HOURS_END` (default: 6 PM)
   - OR login occurs on **weekend** (Saturday/Sunday)

3. **Notification Sent**
   - Email sent to ALL active super admins
   - Includes: user email, role, login time, office hours
   - Beautiful HTML formatting with alert icon

---

## 🔍 Verification & Troubleshooting

### Check If Super Admin Exists

Connect to your database and run:

```sql
SELECT id, email, role, is_active FROM users WHERE role = 'super_admin';
```

Make sure at least one super admin has `is_active = true`.

### Test the Notification

1. Set office hours to a narrow window (e.g., 10-11):
   ```env
   OFFICE_HOURS_START=10
   OFFICE_HOURS_END=11
   ```

2. Restart backend

3. Try logging in outside 10-11 AM

4. Check super admin email for notification

### Check Backend Logs

Look for these messages:

```
✅ Success:
[Auth] Non-office hours notification sent to 2/2 super admins

⚠️ No Super Admins:
[Auth] No active super admins found to notify for non-office hours login

❌ Email Not Configured:
[Auth] EMAIL_USER or EMAIL_PASS not configured. Cannot send notifications.

❌ Send Failed:
[Auth] Failed to send non-office hours alert: [error details]
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Invalid credentials" or "Authentication failed"

**Solution:**
- Make sure you're using an **App Password**, not your regular Gmail password
- Remove any spaces from the app password
- Make sure 2-Step Verification is enabled on your Google account

### Issue 2: No emails received

**Possible causes:**
1. No active super admins in database
   - Check: `SELECT * FROM users WHERE role = 'super_admin' AND is_active = true;`
   - Fix: Create or activate a super admin account

2. Login is during office hours
   - Check your `OFFICE_HOURS_START` and `OFFICE_HOURS_END`
   - Check your `TIMEZONE_OFFSET`

3. Email credentials not set
   - Check your `.env` file has `EMAIL_USER` and `EMAIL_PASS`
   - Restart backend after adding them

4. Gmail blocked the email
   - Check spam folder
   - Check Gmail "Less secure apps" isn't blocking

### Issue 3: Wrong timezone

**Example:** You're in Singapore (UTC+8), but server thinks it's 2 AM when it's actually 10 AM.

**Solution:**
```env
TIMEZONE_OFFSET=+8
```

Then restart backend.

---

## 📊 Email Example

**Subject:** 🚨 Alert: User Login Outside Office Hours

**Body:**
```
⚠️ NON-OFFICE HOURS LOGIN ALERT

User: accountant@example.com
Role: accountant
Login Time: 12/19/2025, 10:30:00 PM
Office Hours: 8:00 - 18:00

This login occurred outside of normal office hours. If this activity 
was not expected, please review the user account and take appropriate action.
```

---

## 🔐 Security Notes

1. **Never commit `.env` to Git** - Keep credentials secret
2. **Use Gmail App Passwords** - More secure than regular password
3. **Rotate passwords regularly** - Update app password every 6 months
4. **Monitor notification emails** - Review suspicious login patterns

---

## 🚀 AWS EC2 Deployment

When deploying to EC2:

1. Create `.env` file on EC2:
   ```bash
   cd /home/ubuntu/fyp_system/backend
   nano .env
   ```

2. Add all environment variables (including EMAIL_USER and EMAIL_PASS)

3. Make sure PM2 loads the `.env`:
   ```bash
   pm2 restart ecosystem.config.js --update-env
   ```

4. Check logs:
   ```bash
   pm2 logs fyp-backend
   ```

---

## ✨ Summary

- ✅ Automatic email alerts for non-office hours logins
- ✅ Configurable office hours and timezone
- ✅ Weekend detection
- ✅ Beautiful HTML emails
- ✅ Multiple super admin support
- ✅ Error logging for troubleshooting

For issues, check backend logs and verify environment variables are set correctly!
