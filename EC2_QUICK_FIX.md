# 🚀 Quick EC2 Deployment Commands

## You're on Ubuntu EC2, not macOS!

Copy and paste these commands **on your EC2 server**:

```bash
# 1. Go to backend
cd /home/ubuntu/fyp_system/backend

# 2. Find your database name
sudo -u postgres psql -l

# 3. Add file_hash column (use your actual database name)
sudo -u postgres psql -d fyp_db -f add-file-hash-column.sql

# If database is fyp_system instead:
# sudo -u postgres psql -d fyp_system -f add-file-hash-column.sql

# 4. Build backend
npm run build

# 5. Build frontend
cd /home/ubuntu/fyp_system/frontend
npm run build

# 6. Restart PM2
cd /home/ubuntu/fyp_system
pm2 restart ecosystem.config.js

# 7. Check status
pm2 status
pm2 logs backend --lines 30
```

## Verify It Worked

```bash
# Check if column was added
sudo -u postgres psql -d fyp_db -c "\d claims" | grep file_hash

# Should show:
# file_hash | character varying(64) |
```

## Key Differences on EC2

- ❌ Don't use: `psql fyp_db`
- ✅ Use: `sudo -u postgres psql -d fyp_db`

- ❌ Don't run npm commands in /home/ubuntu/fyp_system
- ✅ Run them in /home/ubuntu/fyp_system/backend or /frontend

## Your EC2 Database Info

```
Host: localhost (same server)
Port: 5432 (default PostgreSQL)
User: postgres (not ubuntu)
Database: fyp_db or fyp_system (check with: sudo -u postgres psql -l)
Password: (ask postgres user via sudo)
```
