# Deploy Claims Fix to EC2

## What Was Fixed:
- ✅ Replaced non-clickable "X Claim(s)" span with clickable RED BUTTON
- ✅ Button now says "DOWNLOAD X CLAIM(S)"
- ✅ Fixed authentication issue (401 error)
- ✅ Now uses authenticated API call with proper tokens
- ✅ Downloads receipt file as blob with correct filename

## To Deploy on EC2:

```bash
# SSH to your EC2 instance
ssh -i ~/Desktop/fyp-key.pem ubuntu@13.214.167.194

# Navigate to project directory
cd /home/ubuntu/fyp_system

# Pull latest changes from GitHub
git pull origin main

# Navigate to frontend
cd frontend

# Stop the frontend service
pm2 stop frontend

# Clean build cache
rm -rf .next node_modules/.cache

# Build the frontend
NODE_ENV=production npm run build

# Start the frontend
pm2 start frontend

# Check status
pm2 status

# View logs (optional)
pm2 logs frontend --lines 20
```

## Expected Changes:
- Button text changed from span to button
- Color changed from blue to RED
- Now clickable and downloads with authentication
- File downloaded with correct filename

## Testing:
1. Go to http://13.214.167.194:3000
2. Clear browser cache (Cmd+Shift+R)
3. Login as accountant
4. Go to Purchase Requests
5. Click the RED "DOWNLOAD X CLAIM(S)" button
6. Receipt should download successfully

## Debug:
If issues occur, check:
```bash
# On EC2
pm2 logs frontend
pm2 logs backend

# In browser
# Open console (F12) and look for:
# [CLAIMS BUTTON CLICKED]
# [DOWNLOADING CLAIM]
# [DOWNLOAD SUCCESS]
```
