#!/bin/bash
# Test accountant file download directly
# Run this on EC2

echo "=========================================="
echo "Test Accountant File Download"
echo "=========================================="
echo ""

echo "1. Get latest accountant file ID and details:"
FILE_INFO=$(PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -t -c "
SELECT id, filename, size, length(data) as actual_size 
FROM accountant_files 
ORDER BY created_at DESC 
LIMIT 1;
")

echo "$FILE_INFO"

FILE_ID=$(echo "$FILE_INFO" | awk '{print $1}' | tr -d ' ')
FILENAME=$(echo "$FILE_INFO" | awk '{print $3}')
SIZE=$(echo "$FILE_INFO" | awk '{print $5}')

echo ""
echo "File ID: $FILE_ID"
echo "Filename: $FILENAME"
echo "Size in DB: $SIZE bytes"

echo ""
echo "2. Getting authentication token..."
# Login as accountant
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lolzlolz706@gmail.com","password":"1234"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Failed to get token. Response:"
    echo "$TOKEN_RESPONSE"
    exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

echo ""
echo "3. Downloading file from backend..."
HTTP_CODE=$(curl -s -o test-download.pdf -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/accountant-files/$FILE_ID)

echo "HTTP Status: $HTTP_CODE"

echo ""
echo "4. Checking downloaded file..."
if [ -f "test-download.pdf" ]; then
    DOWNLOAD_SIZE=$(ls -l test-download.pdf | awk '{print $5}')
    echo "Downloaded file size: $DOWNLOAD_SIZE bytes"
    echo "Database file size: $SIZE bytes"
    
    if [ "$DOWNLOAD_SIZE" -eq "0" ]; then
        echo "❌ File is EMPTY (0 bytes)!"
    elif [ "$DOWNLOAD_SIZE" -eq "$SIZE" ]; then
        echo "✅ File size matches! Download is working!"
    else
        echo "⚠️  Size mismatch!"
    fi
    
    echo ""
    echo "File type check:"
    file test-download.pdf
    
    echo ""
    echo "First 100 bytes (hex):"
    xxd -l 100 test-download.pdf
else
    echo "❌ File was not downloaded!"
fi

echo ""
echo "5. Checking backend logs for download..."
pm2 logs backend --lines 50 --nostream | grep -i "download\|accountant" | tail -10

echo ""
echo "=========================================="
echo "If downloaded file is 0 bytes, the issue is in backend."
echo "If downloaded file has correct size, the issue is in frontend."
echo "=========================================="
