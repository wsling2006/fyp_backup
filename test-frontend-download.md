# Frontend Download Test Instructions

## Test Accountant File Download

1. **Login to the system:**
   - Open browser: http://localhost:3000/login
   - Use accountant credentials (check database for accountant user)

2. **Navigate to Accountant Dashboard:**
   - After login, go to: http://localhost:3000/dashboard/accountant
   - You should see the list of uploaded accountant files

3. **Download a file:**
   - Click the download icon (↓) on any file in the list
   - The file should download with the correct filename
   - Open the downloaded file and verify it's not blank/corrupted

4. **Verify download:**
   - Check the downloaded PDF file opens correctly
   - File size should match what's in the database
   - Content should be readable

## Expected Behavior

- **BEFORE FIX:** Files would download but be blank/empty (0 bytes or corrupted)
- **AFTER FIX:** Files should download with correct size and content

## Technical Details

The fix changed the download method from axios to fetch:
- **Old (broken):** `axios.get(..., { responseType: 'blob' })`
- **New (working):** `fetch(...).then(res => res.blob())`

The issue was that axios doesn't handle blob responses correctly through Next.js proxy/middleware.

## Alternative: Test via curl (Backend Direct)

If frontend still has issues, confirm backend is working:

```bash
cd /Users/jw/fyp_system/backend
./test-download-with-otp.sh
```

This will:
1. Login as accountant
2. Get OTP token
3. Download file directly from backend
4. Verify file size and type
