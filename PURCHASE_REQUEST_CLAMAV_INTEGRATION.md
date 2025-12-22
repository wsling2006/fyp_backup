# Purchase Request System - ClamAV Integration Complete ✅

## 🔒 Security Enhancement: Antivirus Scanning

### Overview
All file uploads in the Purchase Request & Claim System are now protected by **ClamAV antivirus scanning**. This is a critical production security feature that prevents malware distribution through user uploads.

---

## ✅ Backend Integration Complete

### 1. **ClamAV Module Integration**
- ✅ `ClamavModule` imported into `PurchaseRequestModule`
- ✅ `ClamavService` injected into `PurchaseRequestService`
- ✅ Existing ClamAV service (`backend/src/clamav/clamav.service.ts`) fully integrated

### 2. **File Upload Security Flow**
```
User uploads receipt
    ↓
Frontend validates file type/size
    ↓
POST /purchase-requests/claims/upload (with OTP)
    ↓
Backend: Multer memoryStorage (file in memory, not disk yet)
    ↓
Backend: validateAndScanFile() method:
    - Type validation (PDF, JPG, PNG only)
    - Size validation (max 10MB)
    - ClamAV scan (file.buffer scanned for malware)
    ↓
IF CLEAN: Save to disk with UUID filename
IF MALWARE: Reject with error, file never saved
    ↓
Create claim record in database
    ↓
Audit log created
```

### 3. **Key Security Features**

#### File Validation (`PurchaseRequestService.validateAndScanFile()`)
```typescript
// Type whitelist (secure approach)
const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

// Size limit (10MB)
const maxSize = 10 * 1024 * 1024;

// ClamAV scan
const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
if (!isClean) {
  throw new BadRequestException('File failed security scan. May contain malware.');
}
```

#### Controller Upload Endpoint
```typescript
@Post('claims/upload')
@UseInterceptors(
  FileInterceptor('receipt', {
    storage: memoryStorage(), // ← CRITICAL: Keep in memory for scanning
    limits: { fileSize: 10 * 1024 * 1024 },
  }),
)
async uploadReceipt(@UploadedFile() file, @Body() dto, @Req() req) {
  // Step 1: Validate & scan with ClamAV
  await this.purchaseRequestService.validateAndScanFile(file);

  // Step 2: Save to disk ONLY if clean
  const uniqueFilename = `${uuidv4()}.${fileExt}`;
  await fs.writeFile(filePath, file.buffer);

  // Step 3: Create claim in database
  return this.purchaseRequestService.createClaim(...);
}
```

---

## 🎯 Production Benefits

### 1. **Defense in Depth**
- ✅ Type validation (whitelisting approach)
- ✅ Size validation (prevent DoS attacks)
- ✅ Antivirus scanning (malware prevention)
- ✅ Secure storage (UUID filenames, non-public directory)
- ✅ RBAC + OTP for upload authorization

### 2. **Zero Trust for User Files**
- All uploads are treated as potentially malicious
- Files never reach disk until proven clean
- Temporary scan occurs in memory (no disk trace of infected files)

### 3. **Audit Trail**
- ClamAV service logs all scan attempts
- Audit service logs all upload attempts
- Failed scans are logged with user ID and IP

---

## 📋 Frontend Integration Checklist

### ✅ Already Using Proxy (Dynamic IP Safe)
Your existing frontend uses:
- ✅ Relative API paths (`/purchase-requests/...`)
- ✅ Next.js proxy at `/api/[...path]/route.ts`
- ✅ No hardcoded IPs anywhere
- ✅ Works after EC2 restart with new IP

### 🚀 Complete Frontend Features Needed

I will now create the complete frontend with:

1. **Purchase Request Page** (Enhanced version)
   - ✅ Complete modal components inline
   - ✅ Create request with OTP
   - ✅ Review/approve with OTP
   - ✅ Upload claim with file + OTP
   - ✅ File upload UI with drag-and-drop
   - ✅ ClamAV scanning notice for users
   - ✅ Dashboard metrics
   - ✅ Filters and search

2. **Claims Listing & Verification Page** (New)
   - View all claims (role-based)
   - Claim detail modal with receipt preview
   - Verify/process claim with OTP
   - Download receipt (secure, auth-required)

3. **Additional Features**
   - File download endpoint with authorization
   - Export claims to CSV
   - Real-time status updates
   - Pagination for large datasets

---

## 🔧 ClamAV Configuration (Production)

### Installation on EC2
```bash
# Install ClamAV
sudo apt update
sudo apt install -y clamav clamav-daemon

# Update virus definitions
sudo systemctl stop clamav-freshclam
sudo freshclam
sudo systemctl start clamav-freshclam

# Start daemon
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon

# Verify running
sudo systemctl status clamav-daemon
```

### Environment Variables
```bash
# backend/.env
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_ENABLED=true  # Set to false to disable scanning (dev only)
```

### Testing ClamAV
```bash
# Test file (EICAR test virus - safe test file)
curl https://secure.eicar.org/eicar.com.txt > /tmp/eicar.txt

# Backend should reject this file when uploaded
# Check logs: pm2 logs backend | grep -i clam
```

---

## 🚨 Important Production Notes

### 1. **ClamAV Must Be Running**
- Backend will throw errors if ClamAV daemon is not running
- File uploads will fail until ClamAV is available
- Monitor with: `sudo systemctl status clamav-daemon`

### 2. **Virus Definition Updates**
- `freshclam` updates virus definitions automatically
- Runs daily by default
- Check updates: `sudo tail -f /var/log/clamav/freshclam.log`

### 3. **Performance**
- ClamAV scanning adds 1-3 seconds per file
- Memory usage: ~500MB for ClamAV daemon
- Consider these in EC2 instance sizing

### 4. **Error Handling**
- Users see: "File failed security scan. May contain malware."
- Backend logs the threat name and file details
- Infected files are NEVER saved to disk

---

## 📊 Monitoring

### Check ClamAV is Working
```bash
# Check daemon status
sudo systemctl status clamav-daemon

# Check recent scans
sudo tail -f /var/log/clamav/clamav.log

# Check backend logs for ClamAV activity
pm2 logs backend | grep -i clam

# Test upload and watch for scan logs
```

### Health Check Endpoint (Optional Future Enhancement)
```typescript
@Get('health/clamav')
async checkClamavHealth() {
  const testBuffer = Buffer.from('Hello World');
  try {
    await this.clamavService.scanFile(testBuffer, 'test.txt');
    return { status: 'healthy', message: 'ClamAV is operational' };
  } catch (err) {
    return { status: 'unhealthy', message: err.message };
  }
}
```

---

## ✅ Deployment Checklist

### Before Deployment
- [x] ClamAV integrated into PurchaseRequestModule
- [x] File validation and scanning implemented
- [x] Upload endpoint uses memoryStorage
- [x] Files saved to disk only after ClamAV approval
- [x] Error handling for malware detection
- [x] Audit logging for security events

### On Production Server
- [ ] Install ClamAV (`sudo apt install clamav clamav-daemon`)
- [ ] Update virus definitions (`sudo freshclam`)
- [ ] Start ClamAV daemon (`sudo systemctl start clamav-daemon`)
- [ ] Verify ClamAV running (`sudo systemctl status clamav-daemon`)
- [ ] Set CLAMAV_ENABLED=true in backend/.env
- [ ] Test file upload with clean file (should succeed)
- [ ] Test with EICAR test file (should be rejected)
- [ ] Monitor logs for ClamAV activity

### Post-Deployment Verification
```bash
# 1. Check ClamAV daemon
sudo systemctl status clamav-daemon

# 2. Check backend can connect to ClamAV
pm2 logs backend | grep -i clam

# 3. Upload a test receipt via frontend
# Expected log: "Scanning file with ClamAV: ..."
# Expected log: "File is clean: ..."

# 4. Check upload directory
ls -lah /var/www/fyp_system/backend/uploads/receipts/
# Should see UUID-named files only (clean files saved)
```

---

## 🎓 Educational Value (FYP)

### Demonstrates
1. **Defense in Depth**: Multiple layers of security (type, size, virus scan, RBAC, MFA)
2. **Zero Trust Architecture**: Never trust user input, always verify
3. **Secure File Handling**: Memory-based scanning, secure storage
4. **Production Security**: Real-world antivirus integration
5. **Audit Trail**: Complete logging of security events

### FYP Report Sections
- **Security Architecture**: ClamAV as part of layered security
- **Threat Mitigation**: How the system prevents malware distribution
- **Performance Trade-offs**: Security vs. speed analysis
- **Real-world Application**: Industry-standard practices

---

## 📝 Summary

✅ **Backend ClamAV Integration**: COMPLETE
- All file uploads are scanned with ClamAV
- Malware is blocked before reaching disk
- Clean files are saved with UUID filenames
- Audit logs capture all security events

🚀 **Next Steps**: Complete Frontend Implementation
- I will create the full frontend pages with file upload UI
- Users will see ClamAV scanning notices
- All uploads go through the secure proxy (no IP hardcoding)
- Complete claims management and verification pages

🔒 **Production Ready**: Yes, with ClamAV installed on EC2
- Follow the deployment checklist above
- Monitor ClamAV health and virus definition updates
- Review audit logs for security insights

---

**Created**: December 22, 2025
**Status**: Backend Complete ✅ | Frontend In Progress 🚀
