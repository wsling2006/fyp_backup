# Secure File Upload Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Next.js)                        │
│                              Port 3001                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Accountant Dashboard (accountant/page.tsx)                          │  │
│  │                                                                       │  │
│  │  [Choose File] [Upload Button]                                       │  │
│  │                                                                       │  │
│  │  1. User selects file                                                │  │
│  │  2. Client-side validation (type, size)                              │  │
│  │  3. Shows "Scanning file..." loader                                  │  │
│  │  4. Sends to backend via FormData                                    │  │
│  │  5. Displays result (success or error)                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                  │                                           │
│                                  │ HTTP POST /accountant-files/upload        │
│                                  │ Authorization: Bearer <JWT>               │
│                                  │ Content-Type: multipart/form-data         │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (NestJS)                                │
│                              Port 3000                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  AccountantFilesController                                       │       │
│  │                                                                  │       │
│  │  @UseGuards(JwtAuthGuard, RolesGuard)                          │       │
│  │  @Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)                     │       │
│  │                                                                  │       │
│  │  POST /accountant-files/upload                                  │       │
│  │    ├─ Step 1: Authentication (JWT)         ✓                   │       │
│  │    ├─ Step 2: Authorization (Role)         ✓                   │       │
│  │    ├─ Step 3: Multer File Parsing          ✓                   │       │
│  │    ├─ Step 4: Type & Size Validation       ✓                   │       │
│  │    └─ Step 5: ClamAV Scanning              ✓                   │       │
│  └──────────────────────────┬───────────────────────────────────────┘       │
│                             │                                                │
│                             ├─────────────────┐                              │
│                             ▼                 ▼                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  AccountantFilesService         │  │  ClamavService                  │  │
│  │                                  │  │                                 │  │
│  │  • validateFile()                │  │  • scanFile()                   │  │
│  │  • create()                      │  │    1. Write to /tmp             │  │
│  │  • list()                        │  │    2. Execute clamscan          │  │
│  │  • getFile()                     │  │    3. Parse result              │  │
│  │                                  │  │    4. Delete temp file          │  │
│  └────────┬─────────────────────────┘  └─────────────────────────────────┘  │
│           │                                           │                      │
│           ▼                                           ▼                      │
│  ┌─────────────────────┐                    ┌─────────────────┐            │
│  │  TypeORM Repository │                    │  /tmp directory │            │
│  └──────────┬───────────┘                    └─────────────────┘            │
│             │                                                                │
└─────────────┼────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL Database                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Table: accountant_files                                                    │
│  ┌────────────┬──────────────┬─────────────────────┐                       │
│  │ Column     │ Type         │ Description         │                       │
│  ├────────────┼──────────────┼─────────────────────┤                       │
│  │ id         │ UUID         │ Primary key         │                       │
│  │ filename   │ VARCHAR      │ Original name       │                       │
│  │ mimetype   │ VARCHAR      │ MIME type           │                       │
│  │ size       │ BIGINT       │ File size (bytes)   │                       │
│  │ data       │ BYTEA        │ Binary file content │                       │
│  │ created_at │ TIMESTAMP    │ Upload timestamp    │                       │
│  └────────────┴──────────────┴─────────────────────┘                       │
│                                                                              │
│  Only CLEAN files are stored here (infected files never reach database)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Security Flow Diagram

```
┌─────────────┐
│ File Upload │
│  Request    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Layer 1: JWT Authentication             │
│ - Verify JWT token in Authorization     │
│ - Extract user info                     │
│ - If invalid: 401 Unauthorized          │
└──────┬──────────────────────────────────┘
       │ ✓ Authenticated
       ▼
┌─────────────────────────────────────────┐
│ Layer 2: Role-Based Authorization       │
│ - Check if user.role === ACCOUNTANT     │
│   or user.role === SUPER_ADMIN          │
│ - If not: 403 Forbidden                 │
└──────┬──────────────────────────────────┘
       │ ✓ Authorized
       ▼
┌─────────────────────────────────────────┐
│ Layer 3: File Type Validation           │
│ - Check MIME type against whitelist:    │
│   • application/pdf                     │
│   • Excel formats                       │
│   • Word formats                        │
│   • text/plain                          │
│ - If invalid: 400 Bad Request           │
└──────┬──────────────────────────────────┘
       │ ✓ Valid Type
       ▼
┌─────────────────────────────────────────┐
│ Layer 4: File Size Validation           │
│ - Check if size <= 10MB                 │
│ - If too large: 400 Bad Request         │
└──────┬──────────────────────────────────┘
       │ ✓ Valid Size
       ▼
┌─────────────────────────────────────────┐
│ Layer 5: Malware Scanning (ClamAV)      │
│                                          │
│ 1. Generate unique temp filename        │
│    /tmp/upload_<timestamp>_<random>_*   │
│                                          │
│ 2. Write file buffer to disk            │
│    await fs.writeFile(tmpPath, buffer)  │
│                                          │
│ 3. Execute ClamAV scan                  │
│    clamscan --no-summary <file>         │
│                                          │
│ 4. Parse scan result                    │
│    - Exit code 0: Clean                 │
│    - Exit code 1: Infected              │
│                                          │
│ 5. Delete temporary file (always)       │
│    await fs.unlink(tmpPath)             │
│    [Executed in finally block]          │
└──────┬───────────────┬──────────────────┘
       │               │
       │ CLEAN         │ INFECTED
       ▼               ▼
┌─────────────┐  ┌──────────────┐
│ Save to DB  │  │ Reject Upload│
│             │  │              │
│ 1. Create   │  │ Return 400   │
│    entity   │  │ "malware     │
│             │  │  detected"   │
│ 2. Save to  │  │              │
│    database │  │ File is NOT  │
│             │  │ saved to DB  │
│ 3. Return   │  └──────────────┘
│    success  │
│    with ID  │
└─────────────┘
```

## ClamAV Scanning Process

```
┌────────────────────────────────────────────────────────────────┐
│                  ClamAV Scanning Lifecycle                      │
└────────────────────────────────────────────────────────────────┘

Step 1: Receive File Buffer
┌──────────────────────────────────────┐
│  File Buffer (from Multer)           │
│  - originalname: "document.pdf"      │
│  - mimetype: "application/pdf"       │
│  - size: 1024567                     │
│  - buffer: <Buffer 25 50 44 46...>   │
└────────────┬─────────────────────────┘
             │
             ▼
Step 2: Generate Unique Filename
┌──────────────────────────────────────┐
│  Temp Filename Generation            │
│  timestamp = Date.now()              │
│  random = Math.random()              │
│  tmpFile = /tmp/upload_              │
│    ${timestamp}_${random}_           │
│    ${originalname}                   │
└────────────┬─────────────────────────┘
             │
             ▼
Step 3: Write to Temporary File
┌──────────────────────────────────────┐
│  await fs.writeFile(tmpPath, buffer) │
│                                       │
│  File exists on disk:                │
│  /tmp/upload_1234567890_abc_doc.pdf  │
└────────────┬─────────────────────────┘
             │
             ▼
Step 4: Execute ClamAV Scan
┌──────────────────────────────────────┐
│  Command: clamscan --no-summary      │
│           /tmp/upload_*              │
│                                       │
│  ClamAV Process:                     │
│  1. Load virus signatures            │
│  2. Scan file contents               │
│  3. Compare against known malware    │
│  4. Return exit code                 │
└────────────┬─────────────────────────┘
             │
             ├──────────────┬──────────────┐
             ▼              ▼              ▼
      ┌───────────┐  ┌───────────┐  ┌───────────┐
      │ Exit 0    │  │ Exit 1    │  │ Exit 2+   │
      │ CLEAN     │  │ INFECTED  │  │ ERROR     │
      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
            │              │              │
            ▼              ▼              ▼
      ┌───────────┐  ┌───────────┐  ┌───────────┐
      │ Return    │  │ Parse     │  │ Throw     │
      │ isClean:  │  │ virus     │  │ error     │
      │ true      │  │ name      │  │           │
      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
            │              │              │
            └──────────────┴──────────────┘
                           │
                           ▼
Step 5: Cleanup (ALWAYS executed)
┌──────────────────────────────────────┐
│  finally {                           │
│    await fs.unlink(tmpPath)          │
│  }                                    │
│                                       │
│  Temp file deleted regardless of:    │
│  - Scan result (clean/infected)      │
│  - Errors during scan                │
│  - Exceptions thrown                 │
└──────────────────────────────────────┘
```

## Module Dependencies

```
┌──────────────────────────────────────────────────────────────┐
│                         AppModule                             │
│                                                               │
│  imports: [                                                   │
│    TypeOrmModule.forRoot(...),                               │
│    AuthModule,                                                │
│    UsersModule,                                               │
│    AccountantFilesModule  ←─────────────────┐               │
│  ]                                            │               │
└───────────────────────────────────────────────┼───────────────┘
                                                │
                                                │
        ┌───────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│                  AccountantFilesModule                        │
│                                                               │
│  imports: [                                                   │
│    TypeOrmModule.forFeature([AccountantFile]),               │
│    ClamavModule  ←──────────────────┐                       │
│  ]                                    │                       │
│                                       │                       │
│  providers: [                         │                       │
│    AccountantFilesService             │                       │
│  ]                                    │                       │
│                                       │                       │
│  controllers: [                       │                       │
│    AccountantFilesController          │                       │
│  ]                                    │                       │
└───────────────────────────────────────┼───────────────────────┘
                                        │
                                        │
        ┌───────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│                      ClamavModule                             │
│                                                               │
│  providers: [                                                 │
│    ClamavService                                              │
│  ]                                                            │
│                                                               │
│  exports: [                                                   │
│    ClamavService  ← Available to AccountantFilesModule       │
│  ]                                                            │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow: Successful Upload

```
Time  │ Component              │ Action
──────┼────────────────────────┼─────────────────────────────────────
0ms   │ Frontend               │ User clicks "Upload"
      │                        │ Shows "Scanning file..." loader
──────┼────────────────────────┼─────────────────────────────────────
10ms  │ Browser                │ Sends POST request with FormData
      │                        │ Authorization: Bearer <JWT>
──────┼────────────────────────┼─────────────────────────────────────
50ms  │ NestJS Middleware      │ Parse request
      │ JwtAuthGuard           │ Verify JWT ✓
      │ RolesGuard             │ Check role ✓
      │ Multer                 │ Parse file to buffer ✓
──────┼────────────────────────┼─────────────────────────────────────
100ms │ Controller             │ handleUpload(@UploadedFile())
      │                        │ Received file buffer
──────┼────────────────────────┼─────────────────────────────────────
120ms │ AccountantFilesService │ validateFile()
      │                        │ Check type & size ✓
──────┼────────────────────────┼─────────────────────────────────────
150ms │ ClamavService          │ scanFile(buffer, filename)
      │                        │ Generate temp filename
      │                        │ Write to /tmp/upload_*
──────┼────────────────────────┼─────────────────────────────────────
200ms │ ClamAV (clamscan)      │ Load virus database
      │                        │ Scan file contents
      │                        │ Compare signatures
──────┼────────────────────────┼─────────────────────────────────────
2000ms│ ClamAV (clamscan)      │ Scan complete: CLEAN (exit 0)
──────┼────────────────────────┼─────────────────────────────────────
2020ms│ ClamavService          │ Parse result: isClean = true
      │                        │ Delete /tmp/upload_* ✓
      │                        │ Return true
──────┼────────────────────────┼─────────────────────────────────────
2050ms│ AccountantFilesService │ create(file)
      │                        │ Save to database ✓
──────┼────────────────────────┼─────────────────────────────────────
2100ms│ Controller             │ Return success response:
      │                        │ { success: true, id: "...", ... }
──────┼────────────────────────┼─────────────────────────────────────
2150ms│ Frontend               │ Receive response
      │                        │ Hide loader
      │                        │ Show "Upload successful"
      │                        │ Refresh file list
──────┴────────────────────────┴─────────────────────────────────────

Total Time: ~2.1 seconds (scan dominates, ~1.8s)
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Scenarios                           │
└─────────────────────────────────────────────────────────────┘

Error 1: No JWT Token
├─ Caught by: JwtAuthGuard
├─ Response: 401 Unauthorized
├─ Message: "Unauthorized"
└─ Frontend: Logout user

Error 2: Wrong Role (e.g., EMPLOYEE)
├─ Caught by: RolesGuard
├─ Response: 403 Forbidden
├─ Message: "Forbidden resource"
└─ Frontend: Show error, redirect

Error 3: Invalid File Type
├─ Caught by: AccountantFilesService.validateFile()
├─ Response: 400 Bad Request
├─ Message: "Unsupported file type. Allowed: PDF, Excel, Word, Plain text"
└─ Frontend: Show error message

Error 4: File Too Large
├─ Caught by: AccountantFilesService.validateFile()
├─ Response: 400 Bad Request
├─ Message: "File too large. Maximum size is 10MB"
└─ Frontend: Show error message

Error 5: Malware Detected
├─ Caught by: ClamavService.scanFile() returns false
├─ Response: 400 Bad Request
├─ Message: "File upload rejected: malware detected..."
├─ Database: File NOT saved
├─ Temp File: Deleted ✓
└─ Frontend: Show error message

Error 6: ClamAV Not Installed
├─ Caught by: ClamavService.executeClamScan()
├─ Response: 500 Internal Server Error
├─ Message: "File scanning failed. Please try again later."
├─ Logged: "ClamAV is not installed. Please install..."
└─ Frontend: Generic error message

Error 7: Database Error
├─ Caught by: TypeORM save() throws
├─ Response: 500 Internal Server Error
├─ Message: "File upload failed. Please try again..."
├─ Temp File: Already deleted ✓
└─ Frontend: Show error message

All errors follow this pattern:
1. Catch specific error
2. Log detailed info (server-side)
3. Return generic message (client-side)
4. Clean up resources (temp files)
5. Frontend displays user-friendly message
```

## File Storage Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              Current Implementation (FYP Prototype)          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Storage Location: PostgreSQL Database                      │
│  Column Type: BYTEA (binary data)                           │
│                                                              │
│  Pros:                                                       │
│  ✓ Simple implementation                                    │
│  ✓ No external dependencies                                 │
│  ✓ Atomic transactions (metadata + data)                    │
│  ✓ Built-in backup with DB backups                          │
│                                                              │
│  Cons:                                                       │
│  ✗ Database bloat with large files                          │
│  ✗ Slower queries (even for metadata)                       │
│  ✗ Not scalable for high volume                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Production Recommendation                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Storage Location: Cloud Storage (S3, Azure Blob)           │
│  Database: Metadata + URL reference only                    │
│                                                              │
│  Flow:                                                       │
│  1. Scan file with ClamAV                                   │
│  2. If clean, upload to S3                                  │
│  3. Save metadata + S3 URL in database                      │
│  4. Return download URL (presigned)                         │
│                                                              │
│  Pros:                                                       │
│  ✓ Scalable for any file size/volume                        │
│  ✓ CDN integration for faster downloads                     │
│  ✓ Database remains small and fast                          │
│  ✓ Versioning and lifecycle policies                        │
│                                                              │
│  Implementation (conceptual):                                │
│                                                              │
│  async create(file: UploadedFile) {                         │
│    // After ClamAV scan                                     │
│    const s3Key = await this.s3.upload(file.buffer);        │
│    const entity = this.repo.create({                        │
│      filename: file.originalname,                           │
│      s3_key: s3Key,  // Instead of 'data' column           │
│      size: file.size,                                       │
│    });                                                       │
│    return this.repo.save(entity);                           │
│  }                                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Stack                          │
├─────────────────────────────────────────────────────────────┤
│  • Next.js 14 (React framework)                             │
│  • TypeScript (type safety)                                 │
│  • Tailwind CSS (styling)                                   │
│  • Axios (HTTP client via api.ts)                           │
│  • React Context (AuthContext for auth state)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Backend Stack                           │
├─────────────────────────────────────────────────────────────┤
│  • NestJS (Node.js framework)                               │
│  • TypeScript                                                │
│  • TypeORM (ORM for PostgreSQL)                             │
│  • Passport.js + JWT (authentication)                       │
│  • Multer (file upload middleware)                          │
│  • Node.js child_process (execute clamscan)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Security Tools                          │
├─────────────────────────────────────────────────────────────┤
│  • ClamAV 1.5.1 (antivirus engine)                          │
│  • JWT (JSON Web Tokens for auth)                           │
│  • Bcrypt/Argon2 (password hashing - assumed)               │
│  • HTTPS/TLS (in production)                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Database                                │
├─────────────────────────────────────────────────────────────┤
│  • PostgreSQL (relational database)                         │
│  • BYTEA type for binary file storage                       │
│  • UUID for primary keys                                    │
└─────────────────────────────────────────────────────────────┘
```

---

**This architecture demonstrates a production-ready secure file upload system with multiple layers of defense and proper separation of concerns.**
