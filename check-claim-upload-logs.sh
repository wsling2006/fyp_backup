#!/bin/bash
# Test upload a claim to see detailed logs
# Run this on EC2 after uploading a claim

echo "=========================================="
echo "Check Latest Claim Upload Logs"
echo "=========================================="
echo ""

echo "Recent backend logs (last 100 lines, filtered for upload/claim/service):"
pm2 logs backend --lines 100 --nostream | grep -i "\[upload\]\|\[service\]\|claim\|receipt_file" | tail -40

echo ""
echo "=========================================="
echo "Now upload a NEW claim receipt and watch for these logs:"
echo "  - [UPLOAD] Data being sent to service:"
echo "  - [SERVICE] createClaim received data:"
echo "  - [SERVICE] Created claim object:"
echo "  - [SERVICE] Saved claim to database:"
echo ""
echo "Look for 'hasFileData: true' and 'fileDataLength: > 0'"
echo "=========================================="
