# Secure File Upload with ClamAV

This module implements secure file upload functionality with malware scanning using ClamAV.

## Features

- **Multi-layer Security**:
  - JWT authentication
  - Role-based access control (Accountant + Super Admin only)
  - File type validation (whitelist approach)
  - File size limits (10MB)
  - Malware scanning with ClamAV

- **Supported File Types**:
  - PDF documents (`.pdf`)
  - Excel spreadsheets (`.xlsx`, `.xls`)
  - Word documents (`.docx`, `.doc`)
  - Plain text files (`.txt`)

## Prerequisites

### Install ClamAV

#### macOS (using Homebrew):
```bash
brew install clamav
```

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install clamav clamav-daemon
```

### Update Virus Definitions

After installing ClamAV, you must update the virus database:

```bash
# macOS
sudo freshclam

# Ubuntu/Debian
sudo systemctl stop clamav-freshclam
sudo freshclam
sudo systemctl start clamav-freshclam
```

**Note**: The first run of `freshclam` may take several minutes as it downloads the complete virus database.

### Verify Installation

Check that ClamAV is properly installed:

```bash
clamscan --version
```

You should see output like: `ClamAV 1.x.x`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Upload Request                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              JWT Auth + Role Guard (ACCOUNTANT)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Multer (file parsing, 10MB limit)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        Validate File Type & Size (whitelist)                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│             ClamAV Malware Scan                             │
│    (file saved to /tmp, scanned, then deleted)              │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
         ┌──────────┐           ┌──────────┐
         │  CLEAN   │           │ INFECTED │
         └──────────┘           └──────────┘
                │                       │
                ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ Save to Database │    │  Reject Upload   │
    └──────────────────┘    └──────────────────┘
                │                       │
                ▼                       ▼
        ┌─────────────┐       ┌──────────────┐
        │   Success   │       │    Error     │
        └─────────────┘       └──────────────┘
```

## API Endpoints

### 1. Upload File
```http
POST /accountant-files/upload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: <binary file data>
```

**Success Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "id": "uuid-of-file",
  "filename": "document.pdf"
}
```

**Error Response (Malware Detected):**
```json
{
  "statusCode": 400,
  "message": "File upload rejected: malware detected. Please scan your files before uploading.",
  "error": "Bad Request"
}
```

### 2. List Files
```http
GET /accountant-files
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "files": [
    {
      "id": "uuid",
      "filename": "report.pdf",
      "mimetype": "application/pdf",
      "size": 1024567,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 3. Download File
```http
GET /accountant-files/:id
Authorization: Bearer <jwt_token>
```

**Response:** Binary file data with appropriate headers

## Implementation Details

### ClamavService (`src/clamav/clamav.service.ts`)

The ClamAV service handles malware scanning:

1. **File Buffering**: Accepts file buffer from Multer
2. **Temporary Storage**: Writes file to `/tmp` with unique name
3. **Scanning**: Executes `clamscan` command on the file
4. **Cleanup**: Always deletes temporary file (even if scan fails)
5. **Result Parsing**: Returns `true` (clean) or `false` (infected)

**Key Methods:**
- `scanFile(buffer, filename)`: Main scanning method
- `executeClamScan(path)`: Executes clamscan command
- `checkClamAvAvailability()`: Verifies ClamAV installation

### AccountantFilesController (`src/accountant-files/accountant-files.controller.ts`)

Handles HTTP requests with security guards:

1. **Authentication**: `JwtAuthGuard` validates JWT token
2. **Authorization**: `RolesGuard` checks for ACCOUNTANT or SUPER_ADMIN role
3. **File Upload**: Uses Multer with memory storage (10MB limit)
4. **Validation**: Checks file type and size before scanning
5. **Scanning**: Calls ClamavService to scan for malware
6. **Storage**: Saves clean files to PostgreSQL

### AccountantFilesService (`src/accountant-files/accountant-files.service.ts`)

Business logic for file operations:

- **Validation**: Whitelisted file types and size limits
- **Database**: TypeORM integration for CRUD operations
- **Error Handling**: Specific error messages for different failure cases

## Security Considerations

### Defense in Depth

This implementation uses multiple security layers:

1. **Authentication**: JWT tokens verify user identity
2. **Authorization**: Role-based access control
3. **Input Validation**: File type and size checks
4. **Malware Scanning**: ClamAV virus detection
5. **Temporary Storage**: Files scanned in `/tmp`, not directly to DB
6. **Error Handling**: Generic errors prevent information leakage

### File Type Validation

Uses a **whitelist approach** (more secure than blacklisting):
- Only explicitly allowed MIME types are accepted
- File extension validation as secondary check
- Prevents upload of executables, scripts, archives

### Rate Limiting

Consider adding rate limiting to prevent abuse:
```typescript
// In main.ts or module
import rateLimit from 'express-rate-limit';

app.use('/accountant-files/upload', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // limit each IP to 10 requests per windowMs
}));
```

## Testing

### Test with EICAR Test File

EICAR is a safe test file that antivirus software detects as malware:

```bash
# Create EICAR test file
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt

# Upload via curl
curl -X POST http://localhost:3000/accountant-files/upload \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "file=@eicar.txt"
```

**Expected Result:** Upload should be rejected with malware detection message.

### Test with Clean File

```bash
# Create a clean test file
echo "This is a safe test file" > test.txt

# Upload via curl
curl -X POST http://localhost:3000/accountant-files/upload \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "file=@test.txt"
```

**Expected Result:** Upload should succeed and return file ID.

## Troubleshooting

### "ClamAV is not installed"
- Install ClamAV using the instructions above
- Verify installation: `clamscan --version`

### "ClamAV virus database not initialized"
- Run `sudo freshclam` to download virus definitions
- Wait for download to complete (may take several minutes)
- Restart your application

### "Permission denied" on /tmp
- Check /tmp directory permissions: `ls -la /tmp`
- Ensure application has write access to /tmp

### Slow scanning
- Consider running `clamd` daemon for faster scans
- For development, ClamAV scans may take 1-3 seconds per file
- In production, `clamd` daemon reduces scan time to ~100ms

## Production Recommendations

1. **Use clamd daemon**: Much faster than clamscan command
2. **Cloud Storage**: Store files in S3/Azure Blob instead of PostgreSQL
3. **Async Processing**: Use message queue for scanning (upload → queue → scan → save)
4. **Rate Limiting**: Prevent abuse with request throttling
5. **Monitoring**: Log all upload attempts and scan results
6. **Virus Database Updates**: Automate freshclam updates (cron job)

## For FYP Documentation

This implementation demonstrates:

- **Secure Software Development Lifecycle**: Security built in from design
- **Defense in Depth**: Multiple security layers working together
- **Industry Best Practices**: Following OWASP guidelines for file uploads
- **Clean Architecture**: Separation of concerns (Controller → Service → Repository)
- **Error Handling**: Graceful failure with informative messages
- **Testing**: Comprehensive test cases including malware scenarios
- **Documentation**: Clear comments and architectural diagrams

## References

- [ClamAV Official Documentation](https://docs.clamav.net/)
- [OWASP File Upload Security](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)
- [Multer Documentation](https://github.com/expressjs/multer)
