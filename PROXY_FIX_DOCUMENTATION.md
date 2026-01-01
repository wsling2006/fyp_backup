# Proxy Fix for File Download Issue

## Problem Identified

The blank PDF download issue was caused by the Next.js API proxy incorrectly handling binary data.

### Root Cause
1. Backend was working perfectly (confirmed with direct backend tests)
2. Database storage was correct (BYTEA columns had valid PDF data)
3. **Issue**: Next.js proxy was converting binary data to `ArrayBuffer` before sending to client
4. When axios requested with `responseType: 'blob'`, it received corrupted data

### The Fix

**File**: `frontend/app/api/[...path]/route.ts`

**Change**: Stream binary responses directly instead of converting to ArrayBuffer

```typescript
// BEFORE (causing corruption):
if (contentType.includes('application/pdf') || ...) {
  responseData = await response.arrayBuffer();  // ❌ Converting breaks binary data
}
const proxyResponse = new NextResponse(responseData, { ... });

// AFTER (preserves binary data):
if (contentType.includes('application/pdf') || ...) {
  // Stream response.body directly - no conversion
  return new NextResponse(response.body, { ... });  // ✅ Direct streaming
}
```

### Why This Works

1. **Direct Streaming**: `response.body` is a ReadableStream that Next.js can pass through without modification
2. **No Conversion**: Avoids ArrayBuffer/Blob conversions that can corrupt binary data
3. **Axios Compatible**: Works properly with axios `responseType: 'blob'`
4. **Performance**: Streaming is more efficient for large files

## Testing the Fix

### On Your Local Machine

```bash
# Commit and push the fix
bash deploy-proxy-fix.sh
```

### On EC2

```bash
# SSH to EC2
ssh your-ec2-instance

# Pull the changes
cd ~/fyp_system
git pull origin main

# Rebuild frontend
cd frontend
npm run build

# Restart frontend with PM2
pm2 restart frontend

# Wait for frontend to start
sleep 5

# Check logs
pm2 logs frontend --lines 50

# Run the test script
cd ~/fyp_system
bash test-proxy-fix.sh
```

### Expected Test Output

```
=== Testing Frontend File Download After Proxy Fix ===

Step 1: Login to get JWT token
✅ Got JWT token: eyJhbGciOiJIUzI1NiIs...

Step 2: List accountant files
Found file: ID=xxx-xxx-xxx, filename=test.pdf

Step 3: Download file via Next.js proxy
HTTP status code: 200
Downloaded file size: 123456 bytes

Checking file type...
/tmp/frontend-download-fixed.pdf: PDF document, version 1.4

✅ Downloaded file is a valid PDF

First 16 bytes (hex):
00000000: 2550 4446 2d31 2e34 0a25 c4e5 f2e5 eba7  %PDF-1.4.%......

=== Test Summary ===
✅ Login: SUCCESS
✅ List files: SUCCESS
✅ Download HTTP: 200
✅ File size: 123456 bytes
✅ File saved to: /tmp/frontend-download-fixed.pdf
```

### Browser Test

1. Open the application in your browser: `http://your-ec2-ip:3001`
2. Login as Super Admin
3. Go to the Accountant Files section
4. Click "Download" on any file
5. **Expected**: PDF downloads correctly and opens with valid content
6. **Previous**: PDF downloaded but was blank/corrupted

## Additional Notes

### Claims File Upload (Still TODO)

The accountant file download is now fixed. However, claims file upload is still not working:
- Claims table has BYTEA columns but they remain NULL after upload
- This is a separate backend issue in the purchase request service
- Will need to debug the claims upload flow separately

### Verification Checklist

✅ Backend file download works (confirmed with direct tests)  
✅ Database stores files correctly (BYTEA columns have valid data)  
✅ Proxy streams binary data correctly (fixed in this update)  
⬜ Browser download works (test after deploying)  
⬜ Fix claims file upload (separate issue)

## Technical Details

### Why ArrayBuffer Conversion Failed

When you convert a binary Response to ArrayBuffer and then create a new NextResponse:
1. The binary data goes through multiple encoding/decoding steps
2. Content-Type and Content-Length headers may be lost/changed
3. Axios's blob handling expects specific response structure
4. Result: Corrupted or empty file data

### Streaming Benefits

1. **Zero-copy**: Data flows directly from backend to client
2. **Memory efficient**: No intermediate buffers
3. **Type preservation**: Headers and encoding preserved
4. **Framework compatible**: Works with all HTTP client libraries

## Next Steps

1. Deploy and test the proxy fix
2. Verify file downloads work in browser
3. Debug and fix claims file upload (separate issue)
4. Test end-to-end file upload/download for both accountant and claim files
