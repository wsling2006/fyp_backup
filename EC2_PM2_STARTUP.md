# 🚨 EC2 STARTUP GUIDE - No PM2 Processes Running

## Current Situation

Your PM2 daemon restarted but no processes are running. This is normal after:
- EC2 restart
- Manual PM2 stop/kill
- System reboot

## ✅ Solution: Start the Applications

### On your EC2 instance, run these commands:

```bash
# 1. Navigate to project directory
cd ~/fyp_system

# 2. Verify ecosystem config exists
ls -la ecosystem.config.js

# 3. Start both applications with PM2
pm2 start ecosystem.config.js

# 4. Check status (should show backend and frontend running)
pm2 status

# 5. View logs to ensure everything started correctly
pm2 logs --lines 50

# 6. Save PM2 configuration (survives reboots)
pm2 save

# 7. Setup PM2 to start on system boot
pm2 startup
# Follow the command it gives you (usually sudo-based)
```

## 🔍 Expected Output

After `pm2 start ecosystem.config.js`, you should see:

```
[PM2] Starting /home/ubuntu/fyp_system/backend/dist/main.js in fork_mode (1 instance)
[PM2] Done.
[PM2] Starting /home/ubuntu/fyp_system/frontend/node_modules/next/dist/bin/next in fork_mode (1 instance)
[PM2] Done.
```

After `pm2 status`:

```
┌─────┬──────────┬─────────┬─────────┬───────────┬──────────┐
│ id  │ name     │ mode    │ ↺       │ status    │ cpu      │
├─────┼──────────┼─────────┼─────────┼───────────┼──────────┤
│ 0   │ backend  │ fork    │ 0       │ online    │ 0%       │
│ 1   │ frontend │ fork    │ 0       │ online    │ 0%       │
└─────┴──────────┴─────────┴─────────┴───────────┴──────────┘
```

## 🧪 Test the Application

Open browser:
```
http://<YOUR-EC2-PUBLIC-IP>:3001/login
```

Should see the login page and be able to login.

## ⚠️ If ecosystem.config.js is Missing

If you get "ecosystem.config.js not found", check if it exists in the repo:

```bash
cd ~/fyp_system
git pull origin main
ls -la ecosystem.config.js
```

If still missing, create it:

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/ubuntu/.pm2/logs/backend-error.log',
      out_file: '/home/ubuntu/.pm2/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/home/ubuntu/.pm2/logs/frontend-error.log',
      out_file: '/home/ubuntu/.pm2/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF
```

Then start it:
```bash
pm2 start ecosystem.config.js
pm2 save
```

## 🔧 Troubleshooting

### If backend fails to start:

```bash
# Check if backend is built
ls -la backend/dist/main.js

# If not, build it:
cd backend
npm install
npm run build
cd ..

# Try starting again
pm2 start ecosystem.config.js
```

### If frontend fails to start:

```bash
# Check if frontend is built
ls -la frontend/.next

# If not, build it:
cd frontend
npm install
rm -rf .next
npm run build
cd ..

# Try starting again
pm2 start ecosystem.config.js
```

### If you see "Error: Cannot find module":

```bash
# Reinstall dependencies
cd ~/fyp_system
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
pm2 restart all
```

## 📊 Useful PM2 Commands

```bash
# View status
pm2 status

# View logs (all processes)
pm2 logs

# View specific process logs
pm2 logs backend
pm2 logs frontend

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Delete all (removes from PM2 list)
pm2 delete all

# Monitor in real-time
pm2 monit
```

## 🎯 Quick Start (TL;DR)

```bash
cd ~/fyp_system
pm2 start ecosystem.config.js
pm2 status
pm2 logs --lines 50
```

Then test: `http://<YOUR-EC2-PUBLIC-IP>:3001/login`

---

**Note:** This is a normal situation. PM2 daemon restarted but didn't restore the processes. Just start them again with the commands above! 🚀
