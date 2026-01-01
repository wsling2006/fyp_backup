#!/bin/bash
# Test file download from EC2 to verify backend is sending correct data
# Run this ON EC2 to test the backend directly

echo "🧪 Testing file download from backend..."
echo ""

# Get the newest file ID from database
cd /home/ubuntu/fyp_system/backend || cd ~/fyp_system/backend
export $(cat .env | grep -v '^#' | xargs)

FILE_INFO=$(node -e "
const { Client } = require('pg');
(async () => {
  const c = new Client({host:process.env.DB_HOST,port:process.env.DB_PORT,database:process.env.DB_NAME,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD});
  await c.connect();
  const r = await c.query('SELECT id, filename, size FROM accountant_files ORDER BY created_at DESC LIMIT 1');
  if (r.rows[0]) {
    console.log(r.rows[0].id + '|' + r.rows[0].filename + '|' + r.rows[0].size);
  }
  await c.end();
})();
")

if [ -z "$FILE_INFO" ]; then
  echo "❌ No files found in database"
  exit 1
fi

FILE_ID=$(echo $FILE_INFO | cut -d'|' -f1)
FILE_NAME=$(echo $FILE_INFO | cut -d'|' -f2)
DB_SIZE=$(echo $FILE_INFO | cut -d'|' -f3)

echo "📄 Testing download of: $FILE_NAME"
echo "   Database ID: $FILE_ID"
echo "   Expected size: $DB_SIZE bytes"
echo ""

# Get a valid JWT token (you'll need to provide accountant credentials)
echo "🔐 Login to get token..."
read -p "Enter accountant email: " EMAIL
read -s -p "Enter password: " PASSWORD
echo ""

TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (data.access_token) console.log(data.access_token);
")

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Got token"
echo ""

# Download the file directly from backend
echo "⬇️  Downloading from backend..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/accountant-files/$FILE_ID" \
  -o "/tmp/test-download-$FILE_NAME"

DOWNLOADED_SIZE=$(wc -c < "/tmp/test-download-$FILE_NAME")

echo "📊 Results:"
echo "   Database size: $DB_SIZE bytes"
echo "   Downloaded size: $DOWNLOADED_SIZE bytes"

if [ "$DB_SIZE" -eq "$DOWNLOADED_SIZE" ]; then
  echo "   ✅ Size matches!"
else
  echo "   ❌ SIZE MISMATCH!"
fi

# Check file type
echo ""
echo "🔍 File type:"
file "/tmp/test-download-$FILE_NAME"

echo ""
echo "📁 Downloaded file saved to: /tmp/test-download-$FILE_NAME"
echo ""
echo "🌐 Now test through FRONTEND proxy..."
echo "   URL: http://localhost:3000/api/accountant-files/$FILE_ID"
echo "   (Open in browser or use curl with token)"
