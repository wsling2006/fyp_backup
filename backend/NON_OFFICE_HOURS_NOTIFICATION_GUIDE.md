# Non-Office Hours Notification Troubleshooting Guide

## Overview
The system automatically sends email notifications to all active super admins when any user logs in outside office hours (before 8:00 AM or after 6:00 PM server time).

## How It Works

### 1. Office Hours Definition
- **Office Hours:** 8:00 AM - 6:00 PM (08:00 - 18:00)
- **Non-Office Hours:** Before 8:00 AM or at/after 6:00 PM

### 2. When Notifications Are Sent
- User logs in successfully (with or without MFA)
- Login time is outside office hours
- At least one active super admin exists
- Email configuration is valid

### 3. Notification Recipients
- All users with role = `super_admin`
- Must have `is_active = true`

## Troubleshooting on AWS EC2

### Step 1: Check Super Admin Exists

**Connect to your EC2 instance and check the database:**

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Connect to PostgreSQL
sudo -u postgres psql -d your_database_name

# Check for super admins
SELECT id, email, role, is_active FROM users WHERE role = 'super_admin';
```

**Expected result:**
- At least one user with `role = 'super_admin'` and `is_active = true`

**If no super admin exists, create one:**
```sql
UPDATE users SET role = 'super_admin', is_active = true WHERE email = 'your-admin@email.com';
```

### Step 2: Verify Environment Variables on EC2

**Check if EMAIL_USER and EMAIL_PASS are set:**

```bash
# Check your .env file on EC2
cat /path/to/your/backend/.env | grep EMAIL

# Or if using PM2/ecosystem.config.js
cat /path/to/your/ecosystem.config.js | grep EMAIL
```

**Required variables:**
```bash
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password-here
```

**If missing, add them:**
```bash
# Edit your .env file
nano /path/to/your/backend/.env

# Add these lines:
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
```

**Then restart your backend:**
```bash
# If using PM2
pm2 restart backend

# Or restart manually
npm run start:prod
```

### Step 3: Configure Gmail App Password

**IMPORTANT:** Gmail requires an "App Password" for security.

1. **Enable 2-Factor Authentication on your Gmail:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "FYP System" or similar
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Use App Password in .env:**
   ```bash
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=abcdefghijklmnop  # No spaces
   ```

### Step 4: Check Server Timezone

The system uses **server time** to determine office hours. EC2 instances usually run in UTC.

**Check current server time:**
```bash
date
timedatectl  # Shows timezone and current time
```

**If timezone is wrong (e.g., UTC instead of your local time):**

**Option A: Set timezone environment variable (Recommended)**
```bash
# In your .env file, add:
TZ=Asia/Kuala_Lumpur  # Or your timezone

# Then restart backend
pm2 restart backend
```

**Option B: Change system timezone (requires sudo)**
```bash
sudo timedatectl set-timezone Asia/Kuala_Lumpur
```

**Common timezones:**
- Malaysia: `Asia/Kuala_Lumpur`
- Singapore: `Asia/Singapore`
- UTC: `UTC`
- New York: `America/New_York`

### Step 5: Test the Notification System

**Test by logging in outside office hours:**

1. Check current server time:
   ```bash
   date
   ```

2. If current time is between 8:00-18:00, wait until after 18:00 (6 PM) or before 8:00 AM

3. Log in to the system through the frontend

4. **Check backend logs for notification messages:**
   ```bash
   # If using PM2
   pm2 logs backend

   # Or check application logs
   tail -f /path/to/your/backend/logs/*.log
   ```

**What to look for in logs:**

✅ **Success messages:**
```
[Auth] Login time check for user@email.com: 12/19/2025, 7:30:00 PM, Non-office hours: true
[Auth] Found 2 active super admins for notification
[Auth] Sending non-office hours alert to 2 super admin(s)
[Auth] Successfully sent non-office hours alert to admin1@email.com
[Auth] Successfully sent non-office hours alert to admin2@email.com
[Auth] Non-office hours notification process completed
```

❌ **Error messages and fixes:**

```
[Auth] Login during office hours (8:00-18:00), no notification needed
→ Login was during office hours, no issue

[Auth] No active super admins found to send non-office hours notification
→ Create a super admin (see Step 1)

[Auth] EMAIL_USER or EMAIL_PASS not configured. Cannot send notification.
→ Set environment variables (see Step 2)

[Auth] Failed to send alert to admin@email.com: Invalid login: 535-5.7.8 Username and Password not accepted
→ Use Gmail App Password (see Step 3)
```

### Step 6: Verify Email Delivery

**Check super admin's email inbox:**
- Look for email with subject: "Alert: User login outside office hours"
- Check spam/junk folder if not in inbox

**Email content example:**
```
User accountant@email.com logged in at 12/19/2025, 7:30:00 PM (outside office hours 08:00–18:00).

If this was not expected, please review and take action.
```

## Quick Checklist

- [ ] At least one super admin exists with `is_active = true`
- [ ] `EMAIL_USER` is set to your Gmail address
- [ ] `EMAIL_PASS` is set to your Gmail App Password (16 characters)
- [ ] Gmail has 2-Factor Authentication enabled
- [ ] App Password was generated and copied correctly
- [ ] Server timezone matches your business timezone
- [ ] Backend service was restarted after changing .env
- [ ] Test login was outside office hours (before 8 AM or after 6 PM)
- [ ] Backend logs show notification messages

## Common Issues

### Issue: "No active super admins found"
**Solution:** Create or activate a super admin user in the database.

### Issue: "EMAIL_USER or EMAIL_PASS not configured"
**Solution:** Add to .env file and restart backend.

### Issue: "Username and Password not accepted"
**Solution:** Use Gmail App Password, not your regular Gmail password.

### Issue: Email goes to spam
**Solution:** 
- Ask super admin to mark as "Not Spam"
- Add sender email to contacts
- Consider using AWS SES in production

### Issue: Wrong timezone (emails sent at wrong times)
**Solution:** Set TZ environment variable to your timezone.

## Production Recommendations for AWS EC2

1. **Use AWS SES instead of Gmail** (more reliable for production)
2. **Set up CloudWatch logs** for better monitoring
3. **Store sensitive env vars in AWS Secrets Manager**
4. **Set correct timezone** in EC2 instance or app
5. **Monitor email delivery** through AWS SES dashboard

## Need Help?

If notifications still don't work after following this guide:
1. Share the backend logs (remove sensitive info)
2. Confirm super admin count: `SELECT COUNT(*) FROM users WHERE role = 'super_admin' AND is_active = true;`
3. Confirm EMAIL_USER is set: `echo $EMAIL_USER` (in EC2)
4. Test server time: `date` and `timedatectl`

---

**Note:** This system is production-ready for AWS EC2. All changes made are backward-compatible and won't affect deployment.
