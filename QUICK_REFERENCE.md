# ⚡ QUICK REFERENCE - IP-Agnostic Architecture

## 🔍 Verify Refactoring Success

```bash
# Check no hardcoded IPs exist (should return 0)
grep -r "13\.251\." --include="*.{ts,tsx,js,sh,env*}" --exclude-dir={node_modules,.next} . | wc -l
grep -r "47\.128\." --include="*.{ts,tsx,js,sh,env*}" --exclude-dir={node_modules,.next} . | wc -l

# Check git status
git status

# View recent commits
git log --oneline -3
```

## 📤 Deploy Commands (Copy-Paste Ready)

### On Local Machine:
```bash
cd /Users/jw/fyp_system
git push origin main
```

### On EC2 Instance:
```bash
# Pull and rebuild
cd ~/fyp_system
git pull origin main
cd frontend && npm install && rm -rf .next && npm run build && cd ..
cd backend && npm install && npm run build && cd ..
pm2 restart all && pm2 logs --lines 50
```

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         Browser (Any Device)                    │
│                                                 │
│    User accesses: http://<EC2-IP>:3001         │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      Next.js Frontend (Port 3001)               │
│      Listens on: 0.0.0.0:3001                   │
│                                                 │
│  • Serves static pages                          │
│  • API Proxy: /app/api/[...path]/route.ts      │
│    Forwards /api/* → localhost:3000/*           │
└────────────────┬────────────────────────────────┘
                 │
                 │ Same server, localhost only
                 ▼
┌─────────────────────────────────────────────────┐
│      NestJS Backend (Port 3000)                 │
│      Listens on: localhost:3000                 │
│                                                 │
│  • CORS allows: http://localhost:3001           │
│  • NOT exposed to internet directly             │
│  • Receives proxied requests from Next.js       │
└─────────────────────────────────────────────────┘
```

## 🔑 Key Environment Variables

### Frontend (`frontend/.env.local` or `.env.production`)
```bash
NEXT_PUBLIC_API_BASE=/api
BACKEND_URL=http://localhost:3000
```

### Backend (`backend/.env`)
```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://localhost:3001
# ... database, JWT, email config
```

## 🧪 Test Checklist

After deployment, verify:

```bash
# On EC2 - Check services are running
pm2 status
sudo lsof -i :3000  # Backend should be here
sudo lsof -i :3001  # Frontend should be here

# On EC2 - Check logs
pm2 logs backend --lines 50
pm2 logs frontend --lines 50

# In Browser - Open DevTools (F12)
# 1. Navigate to http://<EC2-IP>:3001/login
# 2. Console tab: No CORS errors
# 3. Network tab: API calls go to /api/*, not :3000
# 4. Try login: Should work
# 5. Navigate pages: All should load
```

## ⚠️ Common Issues & Fixes

### Issue: CORS Error
```bash
# Fix: Check backend .env
cat ~/fyp_system/backend/.env | grep FRONTEND_URL
# Should be: FRONTEND_URL=http://localhost:3001

# If wrong, edit and restart:
nano ~/fyp_system/backend/.env
pm2 restart backend
```

### Issue: 502 Bad Gateway
```bash
# Fix: Backend not running
pm2 restart backend
pm2 logs backend --lines 100
```

### Issue: Frontend doesn't proxy to backend
```bash
# Fix: Check frontend .env.production exists
cat ~/fyp_system/frontend/.env.production

# If missing, create it:
cd ~/fyp_system/frontend
cat > .env.production << EOF
NEXT_PUBLIC_API_BASE=/api
BACKEND_URL=http://localhost:3000
EOF

# Rebuild and restart:
npm run build
pm2 restart frontend
```

### Issue: Can't login after EC2 restart with new IP
```bash
# This should NOT happen with new architecture!
# If it does, check:
pm2 resurrect  # or pm2 start ecosystem.config.js
pm2 logs --lines 50

# The beauty of IP-agnostic: No config changes needed!
```

## 📊 Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Frontend calls | `http://47.128.68.111:3000/auth/login` | `/api/auth/login` |
| Backend exposed | Yes (0.0.0.0:3000) | No (localhost:3000) |
| CORS config | Multiple origins + ports | Single: localhost:3001 |
| After EC2 restart | ❌ Manual update + rebuild | ✅ Works immediately |
| Git workflow | ⚠️ Conflicts on IP changes | ✅ Clean pulls |
| Production ready | ⚠️ IPs in code | ✅ Fully production-ready |

## 🎯 Files Changed Summary

**New Files:**
- `frontend/app/api/[...path]/route.ts` ⭐ API proxy

**Modified Files:**
- `frontend/lib/api.ts` - Relative paths
- `frontend/.env.local` - No IPs
- `frontend/.env.example` - Updated
- `backend/src/main.ts` - Localhost CORS
- `backend/.env.example` - Localhost URL
- `backend/setup-ec2-database.sh` - No IPs
- `complete-ec2-setup.sh` - No IPs
- `.gitignore` - Exclude .next, logs

## 💡 Pro Tips

1. **Always rebuild frontend after pull:**
   ```bash
   cd frontend && rm -rf .next && npm run build
   ```

2. **Check logs if issues:**
   ```bash
   pm2 logs --lines 100
   ```

3. **Environment files matter:**
   - Frontend: `.env.local` (dev) or `.env.production` (prod)
   - Backend: `.env` (both dev and prod)

4. **After EC2 restart:**
   ```bash
   pm2 resurrect  # Restores previous PM2 state
   # OR
   pm2 start ecosystem.config.js  # Fresh start
   ```

5. **For FYP Demo:**
   - Show it works with any IP
   - Explain same-origin security
   - Highlight cost savings (no Elastic IP)
   - Demonstrate clean git workflow

---

**Quick Deploy:** Push → Pull → Build → Restart PM2 → Test ✅

**Help:** Check `NEXT_STEPS.md` for detailed instructions!
