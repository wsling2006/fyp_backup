#!/bin/bash

# Test script to verify claim receipt download
# Run this on EC2 to test if files can be downloaded

echo "=== Testing Claim Receipt Download ==="
echo ""

# Find a recent receipt file
RECENT_FILE=$(ls -t /home/ubuntu/fyp_system/backend/uploads/receipts/*.pdf | head -1)

if [ -z "$RECENT_FILE" ]; then
    echo "No PDF files found!"
    exit 1
fi

echo "Testing file: $RECENT_FILE"
echo "File size: $(ls -lh "$RECENT_FILE" | awk '{print $5}')"
echo ""

# Check if it's a valid PDF
echo "Checking PDF validity..."
file "$RECENT_FILE"
echo ""

# Check first few bytes (should be %PDF)
echo "First 10 bytes:"
head -c 10 "$RECENT_FILE"
echo ""
echo ""

# Check if it's the EICAR test file
if grep -q "EICAR-STANDARD-ANTIVIRUS-TEST-FILE" "$RECENT_FILE" 2>/dev/null; then
    echo "❌ This is an EICAR test file (antivirus placeholder)"
else
    echo "✓ Not an EICAR file"
fi

echo ""
echo "=== Test download via curl ==="
echo "You can test download by:"
echo "1. Get a claim ID from database"
echo "2. Get JWT token from login"
echo "3. Run: curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3000/purchase-requests/claims/CLAIM_ID/download -o test.pdf"
