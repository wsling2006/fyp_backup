# Backend Connection Test

## Test if backend is responding

Run this on EC2 to verify backend is working:

```bash
# Test 1: Check if backend is running
curl http://localhost:3000

# Test 2: Check health endpoint
curl http://localhost:3000/api/health || curl http://localhost:3000/health

# Test 3: Check revenue endpoint (requires auth)
# First, get a token by logging in
TOKEN="your_jwt_token_here"
curl -X GET http://localhost:3000/revenue \
  -H "Authorization: Bearer $TOKEN"

# Test 4: Check if DELETE works directly
curl -X DELETE http://localhost:3000/revenue/2ccbdd77-b35b-443a-a4b2-6e89d3a8d02f \
  -H "Authorization: Bearer $TOKEN"
```

## Check backend logs

```bash
pm2 logs backend --lines 100
```

Look for:
- `[CONTROLLER] DELETE request received`
- `[DELETE] Looking for revenue record`
- Any error messages

## Most Likely Issue

The 404 is probably because:
1. ❌ The record doesn't exist in the database
2. ❌ The backend can't connect to the database
3. ❌ CORS is blocking the request
4. ❌ The route isn't registered properly

## Quick Fix to Try

On EC2:

```bash
# Check if the record exists
psql -U postgres -d fyp_db -c "SELECT id, client FROM revenue_record WHERE id = '2ccbdd77-b35b-443a-a4b2-6e89d3a8d02f';"

# If it doesn't exist, that's your issue
# The frontend is trying to delete a record that's already been deleted or never existed
```
