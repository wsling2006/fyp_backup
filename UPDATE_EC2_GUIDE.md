# EC2 Update Guide - Deploy Latest Changes

## Quick Update Steps

### 1. SSH into EC2
```bash
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip
```

### 2. Navigate to Project Directory
```bash
cd /home/ubuntu/fyp_system
```

### 3. Pull Latest Changes from GitHub
```bash
git pull origin main
```

### 4. Update Backend (if backend changes exist)
```bash
cd backend

# Install any new dependencies
npm install

# Run migrations if needed
npm run migration:run

# Restart backend service
pm2 restart backend

# Check status
pm2 logs backend --lines 50
```

### 5. Update Frontend
```bash
cd /home/ubuntu/fyp_system/frontend

# Install any new dependencies (if any)
npm install

# Rebuild the frontend
npm run build

# Restart frontend service
pm2 restart frontend

# Check status
pm2 logs frontend --lines 50
```

### 6. Verify Services
```bash
# Check all PM2 services
pm2 status

# View logs
pm2 logs --lines 100
```

---

## For This Specific Update (Optional Document Upload)

Since this update only modified the frontend add employee page, you only need to update the **frontend**:

```bash
# SSH into EC2
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd /home/ubuntu/fyp_system

# Pull latest changes
git pull origin main

# Update frontend
cd frontend
npm run build
pm2 restart frontend

# Verify
pm2 logs frontend --lines 50
```

---

## Troubleshooting

### If `git pull` shows conflicts:
```bash
# Stash local changes
git stash

# Pull again
git pull origin main

# Reapply stashed changes if needed
git stash pop
```

### If services won't restart:
```bash
# Stop all services
pm2 stop all

# Start them again
cd /home/ubuntu/fyp_system/backend
pm2 start npm --name "backend" -- start

cd /home/ubuntu/fyp_system/frontend
pm2 start npm --name "frontend" -- start

# Save PM2 configuration
pm2 save
```

### If port is in use:
```bash
# Find process using port
sudo lsof -i :3000  # Frontend
sudo lsof -i :5000  # Backend

# Kill process
sudo kill -9 <PID>

# Restart service
pm2 restart frontend
```

### Check Nginx (if using reverse proxy):
```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

---

## One-Line Update Command (Frontend Only)

For quick frontend updates, you can run this single command:

```bash
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip "cd /home/ubuntu/fyp_system && git pull origin main && cd frontend && npm run build && pm2 restart frontend"
```

---

## Verify Update Success

1. **Check PM2 Status**:
   ```bash
   pm2 status
   ```
   All services should show "online"

2. **Check Logs**:
   ```bash
   pm2 logs --lines 50
   ```
   No errors should appear

3. **Test in Browser**:
   - Navigate to `http://your-ec2-ip:3000/hr/employees/add`
   - Verify the "Documents (Optional)" section appears at the bottom
   - Try selecting a PDF file to ensure upload works

---

## Best Practices

1. **Always backup before updates**:
   ```bash
   # Backup database
   pg_dump -U your_user your_database > backup_$(date +%Y%m%d).sql
   ```

2. **Test in development first** (if possible)

3. **Update during low-traffic periods**

4. **Monitor logs after deployment**:
   ```bash
   pm2 logs --lines 100 --timestamp
   ```

5. **Keep PM2 configuration saved**:
   ```bash
   pm2 save
   ```

---

## Need Help?

- Check PM2 logs: `pm2 logs`
- Check system logs: `sudo journalctl -xe`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Restart all services: `pm2 restart all`
