# 🔬 Definitive Test - Find the 404 Source

The record EXISTS in the database, but DELETE returns 404. Let's find out why.

## Test 1: Direct Backend Test (Most Important!)

```bash
# Get your JWT token:
# 1. Open browser → F12 → Application → Local Storage
# 2. Copy the 'token' value

TOKEN="paste_your_actual_token_here"

# Test DELETE directly on backend
curl -X DELETE "http://localhost:3000/revenue/2438af8d-e2b6-4f13-9561-11692d17397d" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -v 2>&1 | tee delete_test.log

# Check the response
cat delete_test.log
```

**What to look for:**
- Status code (200, 401, 403, or 404?)
- Response body
- Any error message

## Test 2: Check GET Works

```bash
# Same token
TOKEN="paste_your_actual_token_here"

# Test GET on the same record
curl -X GET "http://localhost:3000/revenue/2438af8d-e2b6-4f13-9561-11692d17397d" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected:** Should return the revenue record (status 200)  
**If 404:** The GET route also doesn't work - backend issue  
**If 200:** GET works but DELETE doesn't - route registration issue

## Test 3: Check Backend Logs During DELETE

```bash
# Terminal 1: Watch logs
pm2 logs backend --lines 0

# Terminal 2 (or browser): Try to delete the record
# Watch Terminal 1 for ANY output
```

**What to look for:**
- `[CONTROLLER] DELETE request received` - means it reached the controller
- `[DELETE] Looking for revenue record` - means service method was called
- Any error messages
- If NO logs appear: Request didn't reach the controller

## Test 4: Check Who Created the Record

```bash
# Check ownership
sudo -u postgres psql -d fyp_db -c "SELECT id, client, created_by_user_id FROM revenue WHERE id = '2438af8d-e2b6-4f13-9561-11692d17397d';"

# Get your user ID from token
# Decode the JWT token to see your userId
TOKEN="your_token"
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .

# Or check in database
sudo -u postgres psql -d fyp_db -c "SELECT id, email, role FROM users;"
```

**Check if `created_by_user_id` matches your user ID**

## Test 5: Try with a Fresh Record

```bash
TOKEN="your_token"

# Create a new record
RESPONSE=$(curl -X POST "http://localhost:3000/revenue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client": "DELETE TEST",
    "source": "TEST",
    "amount": 1000,
    "date": "2024-12-21",
    "status": "PAID"
  }')

echo "$RESPONSE"

# Extract the ID (you'll need to copy it manually)
# NEW_ID="copy_the_id_from_above"

# Immediately try to delete it
curl -X DELETE "http://localhost:3000/revenue/$NEW_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -v
```

**If this works:** The issue is ownership (you're not the creator of the old record)  
**If this fails:** The DELETE route itself is broken

## Possible Issues

### Issue A: Route Not Registered
**Symptom:** GET works, DELETE returns 404  
**Cause:** Backend didn't compile/start properly  
**Fix:**
```bash
cd /home/ubuntu/fyp_system/backend
npm run build
pm2 restart backend
pm2 logs backend --lines 20
```

### Issue B: Ownership Problem
**Symptom:** You get 403 or specific error, not 404  
**Cause:** You're not the creator of the record  
**Fix:** Delete a record you created yourself

### Issue C: CORS/Proxy Issue
**Symptom:** Direct curl works, browser doesn't  
**Cause:** Proxy or CORS blocking  
**Fix:** Check proxy logs, rebuild frontend

### Issue D: TypeORM Can't Find Record
**Symptom:** Backend logs show "not found"  
**Cause:** Database query issue  
**Check:** Backend logs for [DELETE] messages

## What to Report Back

Run Test 1 (direct curl DELETE) and tell me:

1. **Status code:** ???
2. **Response body:** ???
3. **Backend logs:** (copy from `pm2 logs backend`)
4. **Does GET work?:** YES/NO
5. **Your user ID:** ???
6. **Record creator ID:** ???

This will tell us exactly where the 404 is coming from!
