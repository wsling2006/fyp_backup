#!/bin/bash
# Quick test to verify the upload fix works after deployment

echo "🧪 Testing File Upload Fix"
echo "=========================="
echo ""

# Check if we're on EC2
if [ ! -d "/home/ubuntu/fyp_system" ]; then
  echo "⚠️  This script should be run on EC2"
  echo "Current path: $(pwd)"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Test 1: Check if frontend is running
echo "1️⃣  Checking frontend status..."
if curl -s http://localhost:3001 > /dev/null; then
  echo "   ✅ Frontend is running on port 3001"
else
  echo "   ❌ Frontend is not responding!"
  echo "   Run: pm2 logs frontend"
  exit 1
fi

# Test 2: Check backend
echo ""
echo "2️⃣  Checking backend status..."
if curl -s http://localhost:3000/health > /dev/null 2>&1 || curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "   ✅ Backend is running on port 3000"
else
  echo "   ❌ Backend is not responding!"
  echo "   Run: pm2 logs backend"
  exit 1
fi

# Test 3: Check recent files in database
echo ""
echo "3️⃣  Checking recent uploads in database..."
cd /home/ubuntu/fyp_system/backend || cd ~/fyp_system/backend || exit 1
export $(cat .env | grep -v '^#' | xargs)

RECENT_FILES=$(node -e "
const { Client } = require('pg');
(async () => {
  const c = new Client({host:process.env.DB_HOST,port:process.env.DB_PORT,database:process.env.DB_NAME,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD});
  await c.connect();
  const r = await c.query('SELECT COUNT(*) as cnt FROM accountant_files WHERE created_at > NOW() - INTERVAL \\'5 minutes\\'');
  console.log(r.rows[0].cnt);
  await c.end();
})();
" 2>/dev/null)

if [ ! -z "$RECENT_FILES" ]; then
  echo "   📊 Files uploaded in last 5 minutes: $RECENT_FILES"
  if [ "$RECENT_FILES" -gt "0" ]; then
    echo "   🆕 New files detected!"
  fi
else
  echo "   ℹ️  No new files in last 5 minutes"
fi

echo ""
echo "✅ All systems operational!"
echo ""
echo "📝 Next steps:"
echo "1. Go to: http://<your-ec2-ip>:3001/dashboard/accountant"
echo "2. Login as accountant"
echo "3. Upload a PDF file"
echo "4. Download it immediately"
echo "5. Open the file - it should have content!"
echo ""
echo "🔍 To monitor uploads:"
echo "   pm2 logs frontend --lines 20"
echo "   ~/diagnose-files.sh"
echo ""
