# 🔍 Complete System Diagnostic

Run these commands on EC2 to find the root cause of the 404 error.

## Step 1: Check Backend is Running and Routes are Registered

```bash
# Check PM2 status
pm2 list

# Check backend logs for startup messages
pm2 logs backend --lines 50 | grep -E "running|Controller|Module"

# Check if backend is responding
curl http://localhost:3000

# Check if revenue route exists (should return 401/403, not 404)
curl http://localhost:3000/revenue

# Check with a token (get token from browser localStorage)
TOKEN="your_jwt_token_here"
curl -X GET "http://localhost:3000/revenue" -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- Backend should respond (not connection refused)
- `/revenue` should return 401 (Unauthorized), NOT 404
- With token, should return revenue list

**If you get 404 for `/revenue`:** The route isn't registered!

## Step 2: Check Database Connection and Data

```bash
# Connect to database
psql -U postgres -d fyp_db

# Inside psql, check if table exists
\dt

# Check if revenue records exist
SELECT id, client, created_by_user_id, created_at FROM revenue_record ORDER BY created_at DESC LIMIT 10;

# Check if the specific record exists
SELECT * FROM revenue_record WHERE id = '2438af8d-e2b6-4f13-9561-11692d17397d';

# Exit psql
\q
```

**Expected:**
- `revenue_record` table exists
- Some records exist
- The specific ID exists

**If the specific record doesn't exist:** That's your problem - frontend is showing stale data!

## Step 3: Check Frontend Build

```bash
# Check when frontend was last built
ls -lah frontend/.next/

# Check if .env.local exists and what it contains
cat frontend/.env.local 2>/dev/null || echo "File doesn't exist (good!)"

# Check proxy route exists
ls -lah frontend/app/api/\[...path\]/route.ts
```

**Expected:**
- `.next` directory exists and is recent
- `.env.local` doesn't exist or is empty
- Proxy route file exists

## Step 4: Test Direct Backend API Call

```bash
# Get a JWT token from your browser:
# 1. Open browser DevTools (F12)
# 2. Go to Application tab → Local Storage
# 3. Copy the value of 'token'

# Then test with curl:
TOKEN="paste_your_token_here"

# Test GET (should work)
curl -X GET "http://localhost:3000/revenue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Test DELETE on the specific record
curl -X DELETE "http://localhost:3000/revenue/2438af8d-e2b6-4f13-9561-11692d17397d" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -v
```

**Look for:**
- Status code (200 = success, 404 = not found, 403 = forbidden)
- Response body
- Any CORS or connection errors

## Step 5: Check Backend .env Configuration

```bash
# Check backend environment
cat backend/.env | grep -E "PORT|DB_"

# Verify backend is listening on correct port
lsof -i :3000

# Check if it's accessible
curl http://localhost:3000 -v
```

**Expected:**
- `PORT=3000` or no PORT (defaults to 3000)
- Backend process listening on port 3000
- curl should connect successfully

## Step 6: Restart Everything Cleanly

```bash
# Stop all services
pm2 stop all

# Check nothing is using the ports
lsof -i :3000
lsof -i :3001

# If something is using the ports, kill it:
# kill -9 <PID>

# Start backend first
cd backend
PORT=3000 npm run start:prod &
sleep 5

# Check it started
curl http://localhost:3000

# If it's working, stop it and use PM2:
pkill -f "node.*main.js"

# Start with PM2
cd /home/ubuntu/fyp_system
pm2 start ecosystem.config.js
pm2 logs
```

## Step 7: Test the Full Flow

```bash
# Watch logs in real-time
pm2 logs --lines 0

# In another terminal or browser:
# 1. Open http://YOUR_EC2_IP:3001
# 2. Login
# 3. Go to Revenue
# 4. Try to delete a record
# 5. Watch the logs for errors
```

## Common Issues and Solutions

### Issue 1: Backend returns 404 for /revenue

**Diagnosis:**
```bash
curl http://localhost:3000/revenue
# If 404: Routes not registered
# If 401/403: Routes are registered (correct!)
```

**Solution:**
```bash
cd backend
npm run build
pm2 restart backend
```

### Issue 2: Record doesn't exist in database

**Diagnosis:**
```bash
psql -U postgres -d fyp_db -c "SELECT COUNT(*) FROM revenue_record;"
```

**Solution:**  
The frontend is showing stale data. Refresh the page to reload the list.

### Issue 3: Backend not receiving requests

**Diagnosis:**
```bash
pm2 logs backend --lines 0
# Try to delete, watch for [CONTROLLER] log
# If no log appears: Request not reaching backend
```

**Solution:**
```bash
# Check backend is running
pm2 list
pm2 restart backend

# Check port is correct
cat backend/.env | grep PORT
```

### Issue 4: CORS error

**Diagnosis:**
```bash
pm2 logs backend | grep CORS
# Should see: "CORS enabled for origin: http://localhost:3001"
```

**Solution:**
```bash
# Make sure backend .env has:
echo "FRONTEND_URL=http://localhost:3001" >> backend/.env
pm2 restart backend
```

### Issue 5: Database connection error

**Diagnosis:**
```bash
pm2 logs backend | grep -i "database\|postgres"
# Look for connection errors
```

**Solution:**
```bash
# Check database is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d fyp_db -c "SELECT 1;"

# Check backend .env database settings
cat backend/.env | grep DB_
```

## Quick Fix Commands

If you find the issue, here are quick fixes:

### Fix 1: Rebuild Backend
```bash
cd backend && npm run build && cd .. && pm2 restart backend
```

### Fix 2: Rebuild Frontend
```bash
cd frontend && rm -rf .next && npm run build && cd .. && pm2 restart frontend
```

### Fix 3: Restart Database
```bash
sudo systemctl restart postgresql
pm2 restart backend
```

### Fix 4: Clean Restart Everything
```bash
pm2 stop all
pm2 delete all
cd /home/ubuntu/fyp_system
pm2 start ecosystem.config.js
pm2 save
```

## What to Report Back

After running the diagnostics, report:

1. **Backend route test result:**
   ```
   curl http://localhost:3000/revenue
   # Status code: ???
   ```

2. **Database check result:**
   ```
   SELECT id FROM revenue_record WHERE id = '2438af8d-e2b6-4f13-9561-11692d17397d';
   # Found: YES/NO
   ```

3. **Backend logs when attempting delete:**
   ```
   pm2 logs backend --lines 20
   # Copy the output here
   ```

4. **Direct DELETE test result:**
   ```
   curl -X DELETE "http://localhost:3000/revenue/2438af8d-e2b6-4f13-9561-11692d17397d" \
     -H "Authorization: Bearer YOUR_TOKEN"
   # Status code: ???
   # Response: ???
   ```

This will tell us exactly where the problem is!
