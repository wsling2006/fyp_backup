# 🚀 NEXT STEPS: Deploy to AWS EC2

## ✅ What's Done

All hardcoded IPs have been removed and the system is now **IP-agnostic**! 

**Commits made:**
1. `refactor: remove hardcoded IPs and add Next.js same-origin API proxy` (78698f3)
2. `docs: add comprehensive EC2 deployment guide for IP-agnostic architecture` (fda25f7)

## 📋 What You Need To Do Next

### Step 1: Push to GitHub (Local Machine)

```bash
cd /Users/jw/fyp_system

# Check current status
git status

# If there are any uncommitted files (like REFACTORING_COMPLETE.md), add them:
git add .
git commit -m "docs: add final refactoring summary"

# Push to GitHub
git push origin main
```

### Step 2: Deploy on EC2 Instance

SSH into your EC2 instance and run these commands:

```bash
# 1. Navigate to project directory
cd ~/fyp_system

# 2. Pull latest changes from GitHub
git pull origin main

# 3. Install frontend dependencies (in case package.json changed)
cd frontend
npm install

# 4. Rebuild frontend with new proxy architecture
rm -rf .next
npm run build

# 5. Go back to root
cd ..

# 6. Update backend dependencies if needed
cd backend
npm install

# 7. Rebuild backend
npm run build

# 8. Go back to root
cd ..

# 9. Restart PM2 processes
pm2 restart all

# 10. Check PM2 status
pm2 status

# 11. Check logs to ensure everything started correctly
pm2 logs --lines 50
```

### Step 3: Test the Application

Open your browser and navigate to:
```
http://<YOUR-EC2-PUBLIC-IP>:3001/login
```

**Login with:**
- Email: `admin@fyp.com`
- Password: (the one from your backend setup)

### Step 4: Verify Everything Works

✅ Check these:
- [ ] Login page loads correctly
- [ ] Can login successfully
- [ ] Dashboard appears after login
- [ ] No CORS errors in browser console (F12 → Console)
- [ ] API calls work (F12 → Network tab, check /api/* requests)
- [ ] Can navigate between pages
- [ ] Can logout and login again

### Step 5: Test After EC2 Restart (Optional but Important)

To verify the IP-agnostic architecture works:

1. **Stop EC2 instance** (from AWS Console)
2. **Start EC2 instance** (it will get a NEW public IP)
3. **SSH into the new IP**
4. **Start PM2:**
   ```bash
   cd ~/fyp_system
   pm2 resurrect
   # OR
   pm2 start ecosystem.config.js
   ```
5. **Access via new IP:**
   ```
   http://<NEW-EC2-PUBLIC-IP>:3001/login
   ```
6. **Everything should work without any code changes!** ✨

## 🔍 Troubleshooting

### If login fails:

```bash
# Check PM2 status
pm2 status

# Check backend logs
pm2 logs backend --lines 100

# Check frontend logs
pm2 logs frontend --lines 50

# Verify ports are listening
sudo lsof -i :3000  # Backend should be here
sudo lsof -i :3001  # Frontend should be here
```

### If you see CORS errors:

```bash
# Check backend .env file
cat ~/fyp_system/backend/.env | grep FRONTEND_URL
# Should show: FRONTEND_URL=http://localhost:3001

# If wrong, fix it:
cd ~/fyp_system/backend
nano .env
# Change FRONTEND_URL to: http://localhost:3001
# Save and restart PM2:
pm2 restart backend
```

### If frontend can't reach backend:

```bash
# Check frontend .env.production
cat ~/fyp_system/frontend/.env.production

# Should show:
# NEXT_PUBLIC_API_BASE=/api
# BACKEND_URL=http://localhost:3000

# If missing, create it:
cd ~/fyp_system/frontend
cat > .env.production << EOF
NEXT_PUBLIC_API_BASE=/api
BACKEND_URL=http://localhost:3000
EOF

# Rebuild and restart:
npm run build
cd ..
pm2 restart frontend
```

## 📊 Architecture Summary

**Old (with hardcoded IPs):**
```
Browser → http://13.251.X.X:3000 (Backend - hardcoded IP in frontend code)
         ❌ Breaks after EC2 restart
```

**New (IP-agnostic with proxy):**
```
Browser → http://<ANY-EC2-IP>:3001 (Frontend)
            ↓ same-origin /api proxy
          http://localhost:3000 (Backend)
         ✅ Works after EC2 restart, no changes needed!
```

## 🎓 For Your FYP Defense

**Key Points to Explain:**

1. **Why this architecture?**
   - Cost-effective (no Elastic IP needed)
   - Maintainable (survives EC2 restarts)
   - Secure (backend not directly exposed)
   - Standard industry practice

2. **How it works:**
   - Frontend uses relative paths (`/api/*`)
   - Next.js proxy forwards to localhost backend
   - Backend only allows requests from localhost:3001
   - Browser never sees backend port

3. **Benefits:**
   - Clean git workflow (no IP conflicts)
   - Production-ready
   - Easy to migrate to other hosting
   - Simplified CORS configuration

## 📁 Files Changed

- `frontend/app/api/[...path]/route.ts` ⭐ NEW - API proxy
- `frontend/lib/api.ts` - Uses relative paths
- `frontend/.env.local` - No IPs, uses `/api`
- `frontend/.env.example` - Updated documentation
- `backend/src/main.ts` - CORS allows localhost:3001 only
- `backend/.env.example` - Documents localhost:3001
- `backend/setup-ec2-database.sh` - No hardcoded IPs
- `complete-ec2-setup.sh` - No hardcoded IPs
- `.gitignore` - Excludes .next and build artifacts

## ✨ Summary

Your system is now **production-ready** and **IP-agnostic**! 

**Next action:** Push to GitHub, pull on EC2, rebuild, restart PM2, and test! 🚀

---

**Need help?** Check the logs with `pm2 logs` and verify the architecture in `ARCHITECTURE_REFACTOR.md`.
