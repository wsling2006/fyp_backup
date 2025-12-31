#!/bin/bash
# Manual download test - you provide the password
# Run this on EC2

echo "=========================================="
echo "Manual Accountant File Download Test"
echo "=========================================="
echo ""

# Get latest file info
echo "1. Latest accountant file in database:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -t -A -c "
SELECT id || '|' || filename || '|' || size || '|' || length(data)
FROM accountant_files 
ORDER BY created_at DESC 
LIMIT 1;
"

echo ""
echo "2. Now test download manually:"
echo ""
echo "   STEP 1: Login and get token"
echo "   -------------------------"
echo "   curl -X POST http://localhost:3000/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"lolzlolz706@gmail.com\",\"password\":\"YOUR_PASSWORD_HERE\"}'"
echo ""
echo "   Copy the 'accessToken' from the response"
echo ""
echo "   STEP 2: Download file"
echo "   -------------------------"
echo "   FILE_ID='<paste ID from above>'"
echo "   TOKEN='<paste token from step 1>'"
echo ""
echo "   curl -H \"Authorization: Bearer \$TOKEN\" \\"
echo "     http://localhost:3000/accountant-files/\$FILE_ID \\"
echo "     --output downloaded-file.pdf"
echo ""
echo "   STEP 3: Check downloaded file"
echo "   -------------------------"
echo "   ls -lh downloaded-file.pdf"
echo "   file downloaded-file.pdf"
echo ""
echo "=========================================="
echo ""
echo "OR just tell me the accountant password and I'll update the script!"
echo ""
