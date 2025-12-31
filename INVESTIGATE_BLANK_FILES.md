# Investigation: Blank File Downloads

## Problem
Downloaded claim receipts are blank/empty, even though files appear to be uploaded successfully.

## Possible Causes

### 1. **File Buffer Corruption During Upload**
- File buffer might be getting corrupted between ClamAV scan and disk write
- Buffer might be consumed/modified during scan
- Solution: Added logging to track buffer integrity through the process

### 2. **File Write Issues**
- File might not be written correctly to disk
- Permission issues
- Disk space issues
- Solution: Added verification after write to confirm file integrity

### 3. **File Read Issues During Download**
- File might exist but be empty
- File might be in wrong location
- Solution: Added logging to check file existence and size before read

### 4. **ClamAV Scan Side Effects**
- ClamAV might be modifying or replacing files
- Old EICAR test files suggest ClamAV might be quarantining files
- Solution: Check ClamAV configuration and quarantine settings

### 5. **Async/Timing Issues**
- File might not be fully written before being read
- Race condition between write and database commit
- Solution: Use synchronous operations or proper awaits

## Investigation Steps

### Step 1: Deploy Enhanced Logging
```bash
# On EC2
cd ~/fyp_system
git pull origin main
cd backend
npm run build
pm2 restart fyp-backend
```

### Step 2: Upload a New File
1. Login as Sales/Marketing user
2. Create/approve a purchase request
3. Upload a receipt (preferably a small PDF or image you can verify)
4. Watch the backend logs: `pm2 logs fyp-backend`

Look for:
- `[UPLOAD] File received:` - Shows file details when received
- `[UPLOAD] File after ClamAV scan:` - Shows buffer integrity after scan
- `[UPLOAD] Writing to disk:` - Shows write attempt
- `[UPLOAD] File written verification:` - Shows if write was successful

### Step 3: Try to Download
1. Login as Accountant
2. Find the claim in the purchase requests list
3. Click the download button
4. Watch the backend logs

Look for:
- `[DOWNLOAD] Claim details:` - Shows claim info
- `[DOWNLOAD] File exists:` - Shows file size on disk
- `[DOWNLOAD] File buffer read:` - Shows buffer after reading
- `[DOWNLOAD] Sending response:` - Shows response details

### Step 4: Manual File Check
Run the diagnostic script on EC2:
```bash
ssh fyp
cd ~/fyp_system/backend
ls -lh uploads/receipts/ | tail -10

# Check a specific file
FILE=$(ls -t uploads/receipts/ | head -1)
echo "File: $FILE"
stat uploads/receipts/$FILE
file uploads/receipts/$FILE
xxd uploads/receipts/$FILE | head -20
```

### Step 5: Check ClamAV Configuration
```bash
ssh fyp
# Check ClamAV logs
sudo tail -50 /var/log/clamav/clamd.log

# Check if ClamAV is quarantining files
sudo find /var/lib/clamav -name "*.tmp" -o -name "*quarantine*" 2>/dev/null

# Check ClamAV config
cat /etc/clamav/clamd.conf | grep -i quarantine
```

## Expected Findings

### If File is Blank on Upload:
- Buffer will show all zeros in hex dump
- Written size will match original but content will be empty
- Issue is in upload/scan process

### If File is Correct on Upload but Blank on Download:
- Upload logs will show valid hex bytes
- Download logs will show zeros or empty buffer
- Issue is in file storage or read process

### If File Disappears:
- File won't exist when download attempts to read
- ClamAV might be quarantining it
- Check ClamAV logs and quarantine directory

## Quick Fixes to Try

### Fix 1: Disable ClamAV Temporarily (TESTING ONLY)
```typescript
// In purchase-request.service.ts, comment out:
// await this.clamavService.scanFile(file.buffer, file.originalname);
```

If this fixes it, ClamAV is the issue.

### Fix 2: Use Different Buffer
```typescript
// In purchase-request.controller.ts, try:
const bufferCopy = Buffer.from(file.buffer);
await fs.writeFile(filePath, bufferCopy);
```

### Fix 3: Check File Permissions
```bash
ssh fyp
cd ~/fyp_system/backend
chmod 644 uploads/receipts/*
chown ubuntu:ubuntu uploads/receipts/*
```

### Fix 4: Add Content-Length Header
```typescript
// In downloadClaimReceipt:
res.setHeader('Content-Length', fileBuffer.length.toString());
```

## Next Steps
1. Deploy the enhanced logging version
2. Upload a new test file (preferably a simple PDF or small image)
3. Review the logs from both upload and download
4. Check the actual file on disk
5. Report findings to determine the root cause
