# 🔧 EC2 Environment Configuration Fix

## Issue Discovered

Your delete functionality was failing with a 404 error because the frontend was making requests directly to the public IP instead of going through the Next.js proxy.

**Error seen:**
```
DELETE http://13.212.227.22:3001/api/revenue/<id> 404 (Not Found)
```

**Root cause:** The frontend `.env.local` file on EC2 had a hardcoded public IP, causing requests to bypass the proxy layer.

---

## ✅ The Fix (Applied)

### 1. Frontend API Client (`frontend/lib/api.ts`)
Changed to **always** use the proxy (no environment variable override):

```typescript
const baseURL = '/api'; // Always use relative path through proxy
```

This ensures all API requests go through `/api/*` and hit the Next.js proxy, which then forwards to `localhost:3000` (backend).

### 2. API Proxy (`frontend/app/api/[...path]/route.ts`)
Added logging to help debug proxy issues:

```typescript
console.log('[API Proxy] Using backend URL:', BACKEND_URL);
console.log(`[API Proxy] ${request.method} ${apiPath} → ${url.toString()}`);
```

---

## 🚀 How to Apply the Fix on EC2

### Step 1: Pull the Latest Code

```bash
cd /home/ubuntu/fyp_system
git pull origin main
```

### Step 2: **IMPORTANT** - Update Frontend Environment File

**Edit `frontend/.env.local` on EC2:**

```bash
nano frontend/.env.local
```

**REMOVE or comment out** any lines with hardcoded IPs. The file should be **empty** or just have:

```env
# No environment variables needed!
# The frontend uses /api/* which goes through the Next.js proxy
# The proxy forwards to localhost:3000 (backend)
```

You can also delete the file entirely:
```bash
rm frontend/.env.local
```

### Step 3: Verify Backend Port Configuration

Check your `backend/.env` file:

```bash
cat backend/.env
```

Make sure it has:
```env
PORT=3000
```

**NOT** 3001! The backend should run on port 3000, and the frontend on port 3001.

### Step 4: Rebuild Frontend

```bash
cd frontend
npm run build
cd ..
```

### Step 5: Restart Services

```bash
pm2 restart all
pm2 list
```

You should see:
- `backend` running (on port 3000 internally)
- `frontend` running (on port 3001 for public access)

### Step 6: Verify the Fix

**Check the logs:**
```bash
pm2 logs frontend --lines 20
```

You should see:
```
[API Proxy] Using backend URL: http://localhost:3000
```

**Test the delete functionality:**
1. Open your browser: `http://YOUR_EC2_IP:3001`
2. Login as an accountant
3. Go to Revenue section
4. Try to delete one of your own records
5. It should work!

**Check backend logs** if it still doesn't work:
```bash
pm2 logs backend --lines 50
```

You should see the DELETE request being received:
```
[CONTROLLER] DELETE request received: { id: '...', userId: '...' }
```

---

## 🏗️ Architecture Explanation

### How It Works (Correct Setup)

```
Browser
   ↓
   DELETE /api/revenue/123  (relative path)
   ↓
Next.js Frontend (port 3001)
   ↓
API Proxy (/app/api/[...path]/route.ts)
   ↓
   DELETE http://localhost:3000/revenue/123
   ↓
NestJS Backend (port 3000)
   ↓
PostgreSQL Database
```

### Why This Works After IP Changes

1. **Browser uses relative paths** (`/api/...`) - no hardcoded IP
2. **Proxy uses localhost** - always works on the same machine
3. **Backend binds to localhost:3000** - accessible only from the same machine
4. **Frontend exposed on public IP:3001** - users connect here

When the EC2 public IP changes:
- ✅ Browser connects to new IP automatically (users type new IP)
- ✅ Proxy still forwards to localhost:3000 (unchanged)
- ✅ Backend still listens on localhost:3000 (unchanged)
- ✅ Everything works without code changes!

---

## 🔍 Troubleshooting

### Problem: Still getting 404 on delete

**Check 1: Is the proxy being used?**
```bash
# Look at the browser Network tab
# The request URL should be: /api/revenue/123
# NOT: http://13.212.227.22:3001/api/revenue/123
```

If it shows the full URL with IP, your frontend is not rebuilt. Rebuild:
```bash
cd frontend && npm run build && cd ..
pm2 restart frontend
```

**Check 2: Is backend running on port 3000?**
```bash
pm2 list
# Look for "backend" process
# Check logs:
pm2 logs backend --lines 10
# Should see: "🚀 Backend running on http://localhost:3000"
```

If it's on a different port, check `backend/.env`:
```bash
cat backend/.env | grep PORT
# Should be: PORT=3000 or no PORT line (defaults to 3000)
```

**Check 3: Is the proxy forwarding correctly?**
```bash
pm2 logs frontend --lines 50 | grep "API Proxy"
# Should see: [API Proxy] DELETE revenue/123 → http://localhost:3000/revenue/123
```

If you don't see proxy logs, the requests are bypassing the proxy.

**Check 4: Clear browser cache**
```bash
# In browser:
# 1. Open DevTools (F12)
# 2. Right-click the reload button
# 3. Select "Empty Cache and Hard Reload"
```

Old cached JavaScript may still have the hardcoded IP.

### Problem: Backend not receiving requests

**Check backend is running:**
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok"} or similar
```

If it fails:
```bash
pm2 logs backend --lines 50
# Check for errors
```

**Check database connection:**
```bash
pm2 logs backend | grep -i "database\|postgres"
# Should see successful connection messages
```

### Problem: Frontend not building

**Check Node.js version:**
```bash
node --version
# Should be v18 or higher
```

**Check disk space:**
```bash
df -h
# Make sure you have at least 1GB free
```

**Clean and rebuild:**
```bash
cd frontend
rm -rf .next
npm run build
cd ..
```

---

## 📋 Quick Reference

### Correct Port Configuration

| Service | Internal Port | Public Access | Used By |
|---------|--------------|---------------|---------|
| Backend (NestJS) | 3000 | Not exposed | Proxy only |
| Frontend (Next.js) | 3001 | Yes (public IP) | Users |
| PostgreSQL | 5432 | Not exposed | Backend only |

### Correct Environment Files

**`backend/.env` (on EC2):**
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=fyp_db
JWT_SECRET=your_secret_here
NODE_ENV=production
```

**`frontend/.env.local` (on EC2):**
```env
# This file should be empty or deleted!
# No environment variables needed for production
```

### Correct PM2 Configuration

**`ecosystem.config.js`:**
```javascript
// Backend
PORT: 3000

// Frontend
PORT: 3001
```

---

## ✅ Verification Checklist

After applying the fix:

- [ ] Code pulled from GitHub
- [ ] `frontend/.env.local` is empty or deleted
- [ ] `backend/.env` has `PORT=3000` (or no PORT line)
- [ ] Frontend rebuilt: `npm run build`
- [ ] Services restarted: `pm2 restart all`
- [ ] Backend logs show: "running on http://localhost:3000"
- [ ] Frontend logs show: "Using backend URL: http://localhost:3000"
- [ ] Browser Network tab shows relative URLs: `/api/revenue/123`
- [ ] Delete functionality works!
- [ ] No errors in `pm2 logs`

---

## 🎉 Summary

The fix ensures:
1. ✅ Frontend always uses `/api/*` (never hardcoded IPs)
2. ✅ Proxy forwards to `localhost:3000` (works after IP changes)
3. ✅ Backend runs on port 3000, frontend on port 3001
4. ✅ System works after every EC2 restart with new public IP

**No more 404 errors on delete!** 🚀
