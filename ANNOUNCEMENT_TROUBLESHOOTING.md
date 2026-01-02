# 🔧 ANNOUNCEMENT SYSTEM - TROUBLESHOOTING GUIDE

## Quick Fixes for Common Issues

---

## ❌ Issue: "Cannot find module 'Express.Multer'"

**Symptom**: TypeScript compilation error in service/controller

**Cause**: Missing `@types/multer` package

**Fix**:
```bash
cd backend
npm install --save-dev @types/multer
```

---

## ❌ Issue: Migration Fails

**Symptom**: `typeorm migration:run` fails with "relation already exists"

**Cause**: Tables already exist from previous attempt

**Fix Option 1** (Recommended - Fresh Start):
```bash
# Rollback migration
npm run typeorm migration:revert

# Re-run migration
npm run typeorm migration:run
```

**Fix Option 2** (Force - Dangerous):
```sql
-- Connect to PostgreSQL
DROP TABLE IF EXISTS announcement_attachments CASCADE;
DROP TABLE IF EXISTS announcement_comments CASCADE;
DROP TABLE IF EXISTS announcement_reactions CASCADE;
DROP TABLE IF EXISTS announcement_acknowledgments CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;

-- Then re-run migration
```

---

## ❌ Issue: "AnnouncementsModule not found"

**Symptom**: Backend fails to start, module import error

**Cause**: Module not properly registered in `app.module.ts`

**Fix**:
```bash
# Verify app.module.ts includes:
# import { AnnouncementsModule } from './announcements/announcements.module';
# 
# And in imports array:
# AnnouncementsModule,

# Then rebuild:
npm run build
pm2 restart backend
```

---

## ❌ Issue: File Upload Fails with "Executable not allowed"

**Symptom**: User uploads `.pdf` but gets rejection error

**Cause**: MIME type mismatch or incorrect file extension detection

**Debug**:
```typescript
// Add logging in announcements.service.ts::uploadAttachment()
console.log('File MIME:', file.mimetype);
console.log('File Extension:', fileExtension);
console.log('Allowed MIME Types:', ALLOWED_MIME_TYPES);
```

**Fix**:
If MIME type is missing from whitelist, add it to `ALLOWED_MIME_TYPES` array.

---

## ❌ Issue: ClamAV Scan Fails

**Symptom**: All file uploads rejected with "Malware detected"

**Cause**: ClamAV service not running or not updated

**Fix**:
```bash
# Check ClamAV status
sudo systemctl status clamav-daemon

# If not running:
sudo systemctl start clamav-daemon

# Update virus definitions:
sudo freshclam

# Test ClamAV:
curl http://localhost:3310/ping
# Should return: PONG
```

---

## ❌ Issue: Urgent Modal Doesn't Appear

**Symptom**: URGENT announcement created but no modal on login

**Cause**: Modal component not imported in layout

**Fix**:
Add `<UrgentAnnouncementModal />` to:
- Option 1: `app/layout.tsx` (global)
- Option 2: `app/announcements/page.tsx` (page-level)

**Verify**:
```bash
# Check browser console for errors
# Check network tab: GET /announcements/urgent/unacknowledged should return data
```

---

## ❌ Issue: "Cannot read property 'id' of undefined"

**Symptom**: Frontend crashes when accessing announcement detail

**Cause**: Announcement not found or API returned null

**Fix**:
```typescript
// In [id]/page.tsx, check if announcement exists before rendering:
if (!announcement) {
  return (
    <div className="alert alert-danger">
      Announcement not found
    </div>
  );
}
```

---

## ❌ Issue: File Download Opens in Browser Instead of Downloading

**Symptom**: PDF/image opens inline instead of downloading

**Cause**: Missing `Content-Disposition: attachment` header

**Fix**:
Verify in `announcements.controller.ts::downloadAttachment()`:
```typescript
res.set({
  'Content-Disposition': `attachment; filename="${filename}"`, // Important!
  'Content-Type': mimetype,
});
```

---

## ❌ Issue: Audit Logs Not Created

**Symptom**: Actions performed but no audit log entries

**Cause**: `AuditModule` not imported or service not injected

**Fix**:
1. Verify `announcements.module.ts` imports `AuditModule`
2. Verify service constructor has:
```typescript
constructor(
  // ...other services
  private auditService: AuditService, // Must be injected
) {}
```
3. Restart backend

---

## ❌ Issue: "Role HR is not defined"

**Symptom**: RBAC error on creating announcement

**Cause**: Role enum import incorrect

**Fix**:
```typescript
// Verify correct import path in controller:
import { Role } from '../users/enums/role.enum';

// NOT:
// import { Role } from './role.enum'; // Wrong!
```

---

## ❌ Issue: Duplicate File Not Detected

**Symptom**: Same file uploaded multiple times successfully

**Cause**: SHA-256 hash not being checked or saved

**Debug**:
```sql
-- Check if file_hash is unique:
SELECT file_hash, COUNT(*) 
FROM announcement_attachments 
GROUP BY file_hash 
HAVING COUNT(*) > 1;
```

**Fix**:
Verify in migration that `file_hash` column has `unique: true` constraint.

---

## ❌ Issue: EC2 Out of Memory on File Upload

**Symptom**: Backend crashes when uploading large files

**Cause**: File loaded entirely into memory (20MB+)

**Fix**:
1. Verify file size limit is enforced:
```typescript
if (file.size > MAX_FILE_SIZE) {
  throw new BadRequestException('File too large');
}
```

2. Increase EC2 instance memory (if budget allows)

3. Consider streaming upload for files > 10MB

---

## ❌ Issue: PostgreSQL "bytea" Column Too Large

**Symptom**: Database error when storing large attachments

**Cause**: PostgreSQL has max BYTEA size (~1GB), but EC2 may have memory limits

**Fix**:
1. Enforce strict file size limits (10-20MB)
2. For production, migrate to S3 storage:
```typescript
// Store S3 key instead of BYTEA:
@Column({ type: 'varchar', length: 255 })
s3_key: string; // e.g. "announcements/abc123.pdf"
```

---

## ❌ Issue: Comments Not Showing

**Symptom**: Comments posted but don't appear on detail page

**Cause**: Not reloading data after post

**Fix**:
```typescript
const handleAddComment = async (e: React.FormEvent) => {
  // ...post comment
  await addComment(announcementId, newComment);
  setNewComment('');
  loadData(); // <-- Must reload to show new comment
};
```

---

## ❌ Issue: Reactions Not Updating

**Symptom**: Click reaction button but count doesn't change

**Cause**: Reaction upsert not working or not reloading

**Fix**:
1. Verify backend deletes old reaction before inserting new:
```typescript
// Delete existing
await this.reactionRepo.delete({
  announcement_id: announcementId,
  user_id: userId,
});

// Add new
await this.reactionRepo.save({
  announcement_id: announcementId,
  user_id: userId,
  reaction_type: reactionDto.reaction_type,
});
```

2. Reload data after reaction in frontend

---

## 🧪 Testing Commands

### Backend Health Check
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check announcements endpoint (requires JWT)
curl -X GET http://localhost:3000/announcements \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Database Check
```bash
# Connect to PostgreSQL
psql -U postgres -d fyp_db

# Check tables exist
\dt announcement*

# Check data
SELECT id, title, priority FROM announcements;
SELECT * FROM announcement_acknowledgments;
```

### ClamAV Check
```bash
# Check daemon running
sudo systemctl status clamav-daemon

# Test scan
curl http://localhost:3310/ping
```

### PM2 Check
```bash
# Check process status
pm2 status

# View logs
pm2 logs backend --lines 50
pm2 logs frontend --lines 50

# Restart if needed
pm2 restart backend
pm2 restart frontend
```

---

## 📊 Monitoring Queries

### Count Announcements by Priority
```sql
SELECT priority, COUNT(*) 
FROM announcements 
WHERE is_deleted = false 
GROUP BY priority;
```

### Unacknowledged Urgent Count
```sql
SELECT COUNT(*) 
FROM announcements a
LEFT JOIN announcement_acknowledgments ack 
  ON a.id = ack.announcement_id AND ack.user_id = 'USER_ID_HERE'
WHERE a.priority = 'URGENT' 
  AND a.is_deleted = false 
  AND ack.id IS NULL;
```

### File Upload Statistics
```sql
SELECT 
  COUNT(*) as total_files,
  SUM(file_size) as total_size_bytes,
  AVG(file_size) as avg_file_size,
  MAX(file_size) as max_file_size
FROM announcement_attachments
WHERE is_deleted = false;
```

### Audit Log for Announcements
```sql
SELECT action, details, created_at 
FROM audit_logs 
WHERE action LIKE '%ANNOUNCEMENT%' 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## 🆘 Emergency Reset

If system is completely broken:

```bash
# 1. Stop services
pm2 stop all

# 2. Rollback migration
cd backend
npm run typeorm migration:revert

# 3. Drop tables manually (if needed)
psql -U postgres -d fyp_db -c "
DROP TABLE IF EXISTS announcement_attachments CASCADE;
DROP TABLE IF EXISTS announcement_comments CASCADE;
DROP TABLE IF EXISTS announcement_reactions CASCADE;
DROP TABLE IF EXISTS announcement_acknowledgments CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
"

# 4. Re-run migration
npm run typeorm migration:run

# 5. Rebuild backend
npm run build

# 6. Restart services
pm2 restart all

# 7. Verify
curl http://localhost:3000/announcements \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📞 Getting Help

1. **Check logs first**: `pm2 logs backend`
2. **Check browser console**: F12 → Console tab
3. **Check network tab**: F12 → Network tab → Look for failed requests
4. **Check database**: Connect via psql and verify data
5. **Check migration status**: `npm run typeorm migration:show`

---

## ✅ Health Checklist

Before reporting issues, verify:

- [ ] Backend is running (`pm2 status`)
- [ ] Frontend is running (`pm2 status`)
- [ ] Database tables exist (`\dt announcement*`)
- [ ] ClamAV is running (`systemctl status clamav-daemon`)
- [ ] Migration completed (`migration:show`)
- [ ] JWT token is valid (not expired)
- [ ] User has correct role (HR for create/upload)
- [ ] Browser console has no errors
- [ ] Network requests return 200 status

---

**Last Updated**: 2024  
**System**: FYP Announcement System v1.0
