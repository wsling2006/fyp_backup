# 📢 MASTER IMPLEMENTATION PROMPT — ANNOUNCEMENT / NOTICE BOARD SYSTEM

**Target System**: FYP Enterprise Management System  
**Date**: January 2, 2026  
**Deployment Environment**: AWS EC2 (Single Instance)  
**Implementation Approach**: ADDITIVE ONLY - NO BREAKING CHANGES

---

## 🔒 SYSTEM CONTEXT (MANDATORY — DO NOT IGNORE)

You are working on an **existing production-style system** with these characteristics:

### Existing Roles Enum (DO NOT MODIFY)
```typescript
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ACCOUNTANT = 'accountant',
  HR = 'human_resources',
  MARKETING = 'marketing',
  SALES = 'sales_department',
}
```
**Location**: `backend/src/users/roles.enum.ts`

### Existing System Features (STABLE — DO NOT BREAK)
✅ **Authentication & Authorization**
- JWT-based authentication (`JwtAuthGuard`)
- Role-Based Access Control (`RolesGuard`)
- MFA verification with email OTP
- Account lockout after 5 failed attempts
- Session management

✅ **Secure File Upload & Download**
- **ClamAV malware scanning** (`ClamavService`)
- File validation (MIME type, size, hash)
- Database-first storage (BYTEA columns)
- SHA-256 hash-based duplicate detection
- Secure streaming download
- Files stored in database, NOT on disk
- Pattern: Claims (`claim.entity.ts`), Accountant Files (`accountant-file.entity.ts`), HR Documents (`employee-document.entity.ts`)

✅ **Audit Logging**
- Comprehensive action logging (`AuditService`)
- IP address extraction (handles proxies)
- Session-based anti-spam
- Metadata tracking
- Pattern: All sensitive operations logged

✅ **OTP Workflows**
- In-memory OTP store (`Map<string, { otp, expiresAt, action }>`)
- Email delivery via nodemailer + Gmail
- 5-minute expiration
- One-time use
- Pattern: Purchase requests, claims verification

✅ **Database**
- PostgreSQL with TypeORM
- Entities use UUID primary keys
- Migrations for schema changes
- BYTEA for file storage

✅ **Deployment**
- AWS EC2 single instance
- PM2 process manager
- CORS configured for Next.js proxy
- No Redis, no WebSockets
- No multi-instance coordination needed

---

## ⚠️ CRITICAL RULES (READ TWICE)

### 🚨 Rule #1: ADDITIVE ONLY
This task is **ADDITIVE ONLY**. You **MUST NOT**:
- ❌ Refactor existing code
- ❌ Rename existing files, functions, or variables
- ❌ Modify existing endpoints
- ❌ Change existing database tables
- ❌ Alter existing enums
- ❌ Break existing workflows
- ❌ Change file storage strategy (keep database-first)

### 🚨 Rule #2: REUSE EXISTING PATTERNS
If a feature already exists elsewhere, **YOU MUST REFER BACK TO THAT IMPLEMENTATION** and reuse the same approach:

| Feature Needed | Existing Reference | What to Reuse |
|----------------|-------------------|---------------|
| **Secure File Upload** | `purchase-request.controller.ts::uploadReceipt()` | ClamAV scanning, validation, hash generation |
| **Secure File Download** | `purchase-request.controller.ts::downloadClaimReceipt()` | Database streaming, Content-Disposition headers |
| **File Storage** | `claim.entity.ts`, `accountant-file.entity.ts` | BYTEA storage, file_hash, file_data, file_size, mimetype |
| **RBAC Protection** | `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles()` | Guard chain pattern |
| **Audit Logging** | `auditService.logFromRequest()` | IP extraction, metadata tracking |
| **OTP Flow** | `purchase-request.service.ts::requestOtp()` | In-memory store, email delivery |

### 🚨 Rule #3: EC2-SAFE IMPLEMENTATION
- ✅ Use environment variables for paths
- ✅ Stream files (no full file in memory)
- ✅ No WebSockets (use polling)
- ✅ No Redis/queues required
- ✅ No breaking PM2 startup
- ✅ Handle single-instance deployment

### 🚨 Rule #4: SECURITY-FIRST
- ✅ All file uploads **MUST** go through ClamAV
- ✅ Block executable file types (see list below)
- ✅ Validate MIME types and extensions
- ✅ Generate SHA-256 hash for duplicates
- ✅ Store files in database (BYTEA)
- ✅ Log all sensitive actions
- ✅ Enforce RBAC on all endpoints

---

## 🎯 FEATURE OBJECTIVE

Implement a **Company Announcement / Notice Board System** inspired by Microsoft Teams announcements.

### Goals
1. HR can create and publish announcements
2. Announcements have priority levels (URGENT, IMPORTANT, GENERAL)
3. Users receive appropriate notifications
4. URGENT announcements show a **one-time blocking popup**
5. Users can acknowledge, react (emoji), and comment
6. Announcements can include **secure file/image attachments**
7. Feature must be **secure, auditable, and EC2-safe**

---

## 🚨 ANNOUNCEMENT PRIORITY LEVELS (EXACT BEHAVIOR)

### Priority Enum
```typescript
export enum AnnouncementPriority {
  URGENT = 'URGENT',       // Blocking popup
  IMPORTANT = 'IMPORTANT', // Red dot indicator
  GENERAL = 'GENERAL',     // Normal display
}
```

### Behavior Rules (STRICT)

| Priority | Behavior | Implementation |
|----------|----------|----------------|
| **URGENT** | Blocking modal popup shown **ONCE** per user, on **first login after publication**, until acknowledged | Check `announcement_acknowledgments` table |
| **IMPORTANT** | Red dot indicator on "Announcements" menu until acknowledged | Count unacknowledged IMPORTANT/URGENT |
| **GENERAL** | Listed normally, no popup | No special handling |

⚠️ **"First time" means**: First login AFTER announcement is published, NOT first-ever login.

**Implementation Pattern**:
```typescript
// On user login or dashboard load
const urgentUnacknowledged = await this.announcementRepo
  .createQueryBuilder('a')
  .leftJoin('announcement_acknowledgments', 'ack', 
    'ack.announcement_id = a.id AND ack.user_id = :userId',
    { userId }
  )
  .where('a.priority = :priority', { priority: AnnouncementPriority.URGENT })
  .andWhere('a.published_at <= :now', { now: new Date() })
  .andWhere('ack.id IS NULL') // Not acknowledged
  .getMany();

// Return first urgent announcement for popup modal
```

---

## 🧠 CORE DATA MODELS (DO NOT SIMPLIFY)

### 1. Announcement Entity
```typescript
@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  content: string; // Rich text or plain text

  @Column({
    type: 'enum',
    enum: AnnouncementPriority,
    default: AnnouncementPriority.GENERAL,
  })
  priority: AnnouncementPriority;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date | null; // NULL = draft, NOT NULL = published

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean; // Soft delete

  @OneToMany(() => AnnouncementAcknowledgment, (ack) => ack.announcement)
  acknowledgments: AnnouncementAcknowledgment[];

  @OneToMany(() => AnnouncementReaction, (reaction) => reaction.announcement)
  reactions: AnnouncementReaction[];

  @OneToMany(() => AnnouncementComment, (comment) => comment.announcement)
  comments: AnnouncementComment[];

  @OneToMany(() => AnnouncementAttachment, (attachment) => attachment.announcement)
  attachments: AnnouncementAttachment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 2. AnnouncementAcknowledgment Entity
```typescript
@Entity('announcement_acknowledgments')
export class AnnouncementAcknowledgment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcement_id: string;

  @ManyToOne(() => Announcement)
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  acknowledged_at: Date;

  // Unique constraint: one acknowledgment per user per announcement
  // Add in migration: UNIQUE(announcement_id, user_id)
}
```

### 3. AnnouncementReaction Entity
```typescript
export enum ReactionType {
  THUMBS_UP = '👍',
  HEART = '❤️',
  SURPRISED = '😮',
  SAD = '😢',
  EXCLAMATION = '❗',
}

@Entity('announcement_reactions')
export class AnnouncementReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcement_id: string;

  @ManyToOne(() => Announcement)
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ReactionType,
  })
  reaction: ReactionType;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date; // For changing reaction

  // Unique constraint: one reaction per user per announcement
  // Add in migration: UNIQUE(announcement_id, user_id)
}
```

### 4. AnnouncementComment Entity
```typescript
@Entity('announcement_comments')
export class AnnouncementComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcement_id: string;

  @ManyToOne(() => Announcement)
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean; // Soft delete only

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 5. AnnouncementAttachment Entity
```typescript
@Entity('announcement_attachments')
export class AnnouncementAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcement_id: string;

  @ManyToOne(() => Announcement)
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @Column({ type: 'varchar', length: 500 })
  filename: string; // Original filename

  @Column({ type: 'varchar', length: 100 })
  mimetype: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'bytea' })
  file_data: Buffer; // Store file in database (same as claims)

  @Column({ type: 'varchar', length: 64 })
  file_hash: string; // SHA-256 hash

  @Column({
    type: 'varchar',
    length: 20,
    default: 'CLEAN',
  })
  malware_scan_status: 'CLEAN' | 'INFECTED' | 'PENDING' | 'ERROR';

  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploaded_by: User;

  @CreateDateColumn()
  created_at: Date;
}
```

---

## 👩‍💼 HR CAPABILITIES (RBAC = HR + SUPER_ADMIN)

### HR Can:
- ✅ View all announcements (including drafts they created)
- ✅ Create new announcement (draft state)
- ✅ Upload attachments to announcement
- ✅ Publish announcement (sets `published_at`)
- ✅ Soft-delete their own announcements
- ✅ View acknowledgment statistics
- ✅ View reaction counts
- ✅ View all comments

### HR Cannot:
- ❌ Edit other users' reactions
- ❌ Edit other users' comments (except soft-delete inappropriate content)
- ❌ Access announcements created by other HR users (unless SUPER_ADMIN)

### Endpoints (HR Only)
```typescript
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementController {
  
  // HR: Create announcement (draft)
  @Post()
  @Roles(Role.HR, Role.SUPER_ADMIN)
  async create(@Body() dto: CreateAnnouncementDto, @Req() req) {
    // Business logic...
  }

  // HR: Upload attachment
  @Post(':id/attachments')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadAttachment(@Param('id') id, @UploadedFile() file, @Req() req) {
    // MUST: Validate file, ClamAV scan, generate hash, store in DB
    // REUSE: purchase-request.service.ts::validateAndScanFile()
  }

  // HR: Publish announcement
  @Put(':id/publish')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  async publish(@Param('id') id, @Req() req) {
    // Set published_at = NOW()
    // Audit log: HR_PUBLISH_ANNOUNCEMENT
  }

  // HR: Get acknowledgment statistics
  @Get(':id/statistics')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  async getStatistics(@Param('id') id, @Req() req) {
    // Return: total users, acknowledged count, reaction counts
  }

  // HR: Soft-delete announcement
  @Delete(':id')
  @Roles(Role.HR, Role.SUPER_ADMIN)
  async delete(@Param('id') id, @Req() req) {
    // Set is_deleted = true
    // Audit log: HR_DELETE_ANNOUNCEMENT
  }
}
```

---

## 👤 USER CAPABILITIES (ALL ROLES)

### All Authenticated Users Can:
- ✅ View published announcements (published_at NOT NULL)
- ✅ Receive urgent popup (if unacknowledged URGENT exists)
- ✅ Acknowledge announcement
- ✅ React with emoji (one reaction per announcement)
- ✅ Comment / reply
- ✅ Download attachments

### Users Cannot:
- ❌ View unpublished announcements (drafts)
- ❌ Edit announcements
- ❌ Delete announcements
- ❌ View other users' acknowledgment status

### Endpoints (All Users)
```typescript
// User: Get all published announcements
@Get()
@UseGuards(JwtAuthGuard)
async getAll(@Req() req) {
  // Only published announcements (published_at NOT NULL)
  // Include: attachments count, reaction counts, comment count, user's acknowledgment status
  // NOT audit logged (list view)
}

// User: Get single announcement
@Get(':id')
@UseGuards(JwtAuthGuard)
async getOne(@Param('id') id, @Req() req) {
  // Return full details: content, attachments, reactions, comments
  // NOT audit logged (view only)
}

// User: Check for urgent popup
@Get('urgent/check')
@UseGuards(JwtAuthGuard)
async checkUrgent(@Req() req) {
  // Return first URGENT unacknowledged announcement
  // Used on login / dashboard load
}

// User: Acknowledge announcement
@Post(':id/acknowledge')
@UseGuards(JwtAuthGuard)
async acknowledge(@Param('id') id, @Req() req) {
  // Create acknowledgment record
  // Audit log: USER_ACK_ANNOUNCEMENT
}

// User: React to announcement
@Post(':id/react')
@UseGuards(JwtAuthGuard)
async react(@Param('id') id, @Body() dto: { reaction: ReactionType }, @Req() req) {
  // Upsert reaction (replace if exists)
  // Audit log: USER_REACT_ANNOUNCEMENT
}

// User: Comment on announcement
@Post(':id/comments')
@UseGuards(JwtAuthGuard)
async comment(@Param('id') id, @Body() dto: { content: string }, @Req() req) {
  // Create comment
  // Audit log: USER_COMMENT_ANNOUNCEMENT
}

// User: Download attachment
@Get('attachments/:attachmentId/download')
@UseGuards(JwtAuthGuard)
async downloadAttachment(@Param('attachmentId') attachmentId, @Res() res, @Req() req) {
  // REUSE: purchase-request.controller.ts::downloadClaimReceipt()
  // Stream from database (file_data column)
  // Audit log: USER_DOWNLOAD_ANNOUNCEMENT_ATTACHMENT
}
```

---

## 🔔 ACKNOWLEDGMENT LOGIC (CRITICAL IMPLEMENTATION)

### Database Schema
```sql
CREATE TABLE announcement_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(announcement_id, user_id)
);
```

### Service Logic
```typescript
// Check if user has unacknowledged URGENT announcements
async getUrgentUnacknowledged(userId: string): Promise<Announcement | null> {
  const announcement = await this.announcementRepo
    .createQueryBuilder('a')
    .leftJoin(
      'announcement_acknowledgments',
      'ack',
      'ack.announcement_id = a.id AND ack.user_id = :userId',
      { userId }
    )
    .where('a.priority = :priority', { priority: AnnouncementPriority.URGENT })
    .andWhere('a.published_at IS NOT NULL') // Only published
    .andWhere('a.published_at <= :now', { now: new Date() })
    .andWhere('a.is_deleted = false')
    .andWhere('ack.id IS NULL') // Not acknowledged
    .orderBy('a.published_at', 'DESC')
    .getOne();

  return announcement;
}

// Acknowledge announcement
async acknowledge(announcementId: string, userId: string): Promise<void> {
  // Check if already acknowledged
  const existing = await this.ackRepo.findOne({
    where: { announcement_id: announcementId, user_id: userId },
  });

  if (existing) {
    return; // Already acknowledged, idempotent
  }

  // Create acknowledgment
  const ack = this.ackRepo.create({
    announcement_id: announcementId,
    user_id: userId,
  });

  await this.ackRepo.save(ack);
}
```

### Frontend Logic
```typescript
// On dashboard load (useEffect)
useEffect(() => {
  async function checkUrgent() {
    try {
      const { urgentAnnouncement } = await api.get('/announcements/urgent/check');
      if (urgentAnnouncement) {
        setShowUrgentModal(true);
        setUrgentAnnouncementData(urgentAnnouncement);
      }
    } catch (error) {
      console.error('Failed to check urgent announcements', error);
    }
  }
  
  checkUrgent();
}, []);

// Modal component
<Modal show={showUrgentModal} backdrop="static" keyboard={false}>
  <Modal.Header>
    <Modal.Title>🚨 Urgent Announcement</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <h4>{urgentAnnouncementData?.title}</h4>
    <p>{urgentAnnouncementData?.content}</p>
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={handleAcknowledge}>I Understand</Button>
  </Modal.Footer>
</Modal>

async function handleAcknowledge() {
  await api.post(`/announcements/${urgentAnnouncementData.id}/acknowledge`);
  setShowUrgentModal(false);
}
```

---

## 😄 EMOJI REACTIONS (CONTROLLED SET)

### Allowed Reactions ONLY
```typescript
export enum ReactionType {
  THUMBS_UP = '👍',
  HEART = '❤️',
  SURPRISED = '😮',
  SAD = '😢',
  EXCLAMATION = '❗',
}
```

### Rules
- ✅ One reaction per user per announcement
- ✅ Changing reaction **overwrites** previous one (UPDATE, not INSERT)
- ✅ Store reaction counts efficiently

### Service Logic
```typescript
async react(announcementId: string, userId: string, reaction: ReactionType): Promise<void> {
  // Check if user already reacted
  let existing = await this.reactionRepo.findOne({
    where: { announcement_id: announcementId, user_id: userId },
  });

  if (existing) {
    // Update existing reaction
    existing.reaction = reaction;
    existing.updated_at = new Date();
    await this.reactionRepo.save(existing);
  } else {
    // Create new reaction
    const newReaction = this.reactionRepo.create({
      announcement_id: announcementId,
      user_id: userId,
      reaction,
    });
    await this.reactionRepo.save(newReaction);
  }
}

// Get reaction counts for an announcement
async getReactionCounts(announcementId: string): Promise<Record<ReactionType, number>> {
  const counts = await this.reactionRepo
    .createQueryBuilder('r')
    .select('r.reaction', 'reaction')
    .addSelect('COUNT(*)', 'count')
    .where('r.announcement_id = :announcementId', { announcementId })
    .groupBy('r.reaction')
    .getRawMany();

  // Initialize all reactions to 0
  const result: Record<string, number> = {
    [ReactionType.THUMBS_UP]: 0,
    [ReactionType.HEART]: 0,
    [ReactionType.SURPRISED]: 0,
    [ReactionType.SAD]: 0,
    [ReactionType.EXCLAMATION]: 0,
  };

  // Fill in actual counts
  counts.forEach((c) => {
    result[c.reaction] = parseInt(c.count, 10);
  });

  return result;
}
```

---

## 💬 COMMENTS / REPLIES

### Features
- ✅ Flat comment list (no threading, optional enhancement later)
- ✅ Each comment stores: user_id, announcement_id, content, created_at
- ✅ Soft-delete only (is_deleted flag)
- ✅ No editing after posting (industry standard for audit trail)

### Service Logic
```typescript
async createComment(announcementId: string, userId: string, content: string): Promise<AnnouncementComment> {
  // Validate content length
  if (!content || content.trim().length === 0) {
    throw new BadRequestException('Comment cannot be empty');
  }

  if (content.length > 2000) {
    throw new BadRequestException('Comment too long (max 2000 characters)');
  }

  // Create comment
  const comment = this.commentRepo.create({
    announcement_id: announcementId,
    user_id: userId,
    content: content.trim(),
  });

  const saved = await this.commentRepo.save(comment);

  // Audit log
  await this.auditService.logFromRequest(req, userId, 'USER_COMMENT_ANNOUNCEMENT', 'announcement', announcementId, {
    comment_id: saved.id,
    content_length: content.length,
  });

  return saved;
}

async getComments(announcementId: string): Promise<AnnouncementComment[]> {
  return this.commentRepo.find({
    where: { announcement_id: announcementId, is_deleted: false },
    relations: ['user'],
    order: { created_at: 'ASC' },
  });
}

// HR soft-delete inappropriate comment
async deleteComment(commentId: string, userId: string, userRole: string): Promise<void> {
  // Only HR or SUPER_ADMIN can delete
  if (userRole !== Role.HR && userRole !== Role.SUPER_ADMIN) {
    throw new ForbiddenException('Only HR can delete comments');
  }

  const comment = await this.commentRepo.findOne({ where: { id: commentId } });
  if (!comment) {
    throw new NotFoundException('Comment not found');
  }

  comment.is_deleted = true;
  await this.commentRepo.save(comment);

  // Audit log
  await this.auditService.log({
    userId,
    action: 'HR_DELETE_COMMENT',
    resource: 'announcement_comment',
    resourceId: commentId,
    metadata: { announcement_id: comment.announcement_id },
  });
}
```

---

## 📎 ATTACHMENTS (SECURITY-CRITICAL)

### Attachment Upload Rules (NON-NEGOTIABLE)

#### 1. Reuse Existing Secure Upload Logic
**Reference**: `backend/src/purchase-requests/purchase-request.controller.ts::uploadReceipt()`

```typescript
// REUSE THIS PATTERN EXACTLY
@Post(':id/attachments')
@Roles(Role.HR, Role.SUPER_ADMIN)
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB max
    },
  }),
)
async uploadAttachment(
  @Param('id') announcementId: string,
  @UploadedFile() file: any,
  @Req() req: any,
) {
  if (!file) {
    throw new BadRequestException('No file uploaded');
  }

  // Step 1: Validate file
  this.validateAttachmentFile(file);

  // Step 2: ClamAV scan (CRITICAL)
  const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
  if (!isClean) {
    throw new BadRequestException('Malware detected in file');
  }

  // Step 3: Generate SHA-256 hash
  const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

  // Step 4: Check for duplicates
  const duplicate = await this.attachmentRepo.findOne({ where: { file_hash: fileHash } });
  if (duplicate) {
    throw new BadRequestException('This file has already been uploaded');
  }

  // Step 5: Store in database
  const attachment = this.attachmentRepo.create({
    announcement_id: announcementId,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    file_data: file.buffer,
    file_hash: fileHash,
    malware_scan_status: 'CLEAN',
    uploaded_by_user_id: req.user.userId,
  });

  const saved = await this.attachmentRepo.save(attachment);

  // Step 6: Audit log
  await this.auditService.logFromRequest(req, req.user.userId, 'HR_UPLOAD_ANNOUNCEMENT_ATTACHMENT', 'announcement', announcementId, {
    attachment_id: saved.id,
    filename: file.originalname,
    size: file.size,
  });

  return saved;
}
```

#### 2. File Type Policy (EXPLICIT)

**Allowed File Types** (MIME type whitelist):
```typescript
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain', // .txt
  'text/csv', // .csv

  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',

  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];
```

**EXPLICITLY BLOCKED Extensions** (even if MIME type passes):
```typescript
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1',
  '.js', '.vbs', '.jar', '.apk', '.msi',
  '.dll', '.so', '.dylib',
];

function validateAttachmentFile(file: any): void {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(
      `File type not allowed. Allowed types: PDF, Word, Excel, PowerPoint, images, text files, archives.`
    );
  }

  // Check file extension (secondary check)
  const ext = file.originalname.toLowerCase().split('.').pop();
  if (BLOCKED_EXTENSIONS.includes(`.${ext}`)) {
    throw new BadRequestException(
      `Executable files are not allowed for security reasons.`
    );
  }

  // Check file size
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    throw new BadRequestException(
      `File size exceeds limit (max ${maxSize / 1024 / 1024}MB).`
    );
  }
}
```

#### 3. Attachment Download (Secure Streaming)

**Reference**: `backend/src/purchase-requests/purchase-request.controller.ts::downloadClaimReceipt()`

```typescript
@Get('attachments/:attachmentId/download')
@UseGuards(JwtAuthGuard)
async downloadAttachment(
  @Param('attachmentId') attachmentId: string,
  @Req() req: any,
  @Res({ passthrough: false }) res: Response,
) {
  const userId = req.user.userId;

  // Step 1: Get attachment
  const attachment = await this.attachmentRepo.findOne({
    where: { id: attachmentId },
    relations: ['announcement'],
  });

  if (!attachment) {
    throw new NotFoundException('Attachment not found');
  }

  // Step 2: Check if announcement is published
  if (!attachment.announcement.published_at) {
    throw new ForbiddenException('Cannot download attachments from unpublished announcements');
  }

  // Step 3: Check file data exists
  if (!attachment.file_data || attachment.file_data.length === 0) {
    throw new NotFoundException('File data not found');
  }

  // Step 4: Audit log
  await this.auditService.logFromRequest(req, userId, 'USER_DOWNLOAD_ANNOUNCEMENT_ATTACHMENT', 'announcement_attachment', attachmentId, {
    filename: attachment.filename,
    announcement_id: attachment.announcement_id,
    size: attachment.size,
  });

  // Step 5: Set secure headers
  res.setHeader('Content-Type', attachment.mimetype || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Step 6: Stream file from database
  return res.send(Buffer.from(attachment.file_data));
}
```

---

## 🔐 SECURITY & AUDIT (NON-NEGOTIABLE)

### Audit Log Actions
Log the following actions using **existing audit log system**:

```typescript
// HR Actions
'HR_CREATE_ANNOUNCEMENT'      // When HR creates announcement (draft)
'HR_UPLOAD_ANNOUNCEMENT_ATTACHMENT'  // When HR uploads file
'HR_PUBLISH_ANNOUNCEMENT'     // When HR publishes announcement
'HR_DELETE_ANNOUNCEMENT'      // When HR soft-deletes announcement
'HR_DELETE_COMMENT'           // When HR deletes inappropriate comment

// User Actions
'USER_ACK_ANNOUNCEMENT'       // When user acknowledges announcement
'USER_REACT_ANNOUNCEMENT'     // When user reacts (emoji)
'USER_COMMENT_ANNOUNCEMENT'   // When user comments
'USER_DOWNLOAD_ANNOUNCEMENT_ATTACHMENT'  // When user downloads file
```

### Audit Service Usage
```typescript
// Pattern: auditService.logFromRequest(req, userId, action, resource, resourceId, metadata)

// Example: HR publishes announcement
await this.auditService.logFromRequest(
  req,
  req.user.userId,
  'HR_PUBLISH_ANNOUNCEMENT',
  'announcement',
  announcement.id,
  {
    title: announcement.title,
    priority: announcement.priority,
    has_attachments: announcement.attachments.length > 0,
  }
);

// Example: User acknowledges announcement
await this.auditService.logFromRequest(
  req,
  req.user.userId,
  'USER_ACK_ANNOUNCEMENT',
  'announcement',
  announcementId,
  {
    priority: announcement.priority,
  }
);
```

---

## 🖥 UI REQUIREMENTS (FULL IMPLEMENTATION)

### 1. Navigation
**Location**: `frontend/components/Navbar.tsx` or similar

```typescript
// Add to navigation menu
<Nav.Link href="/announcements">
  📢 Announcements
  {unreadCount > 0 && (
    <Badge bg="danger" className="ms-2">{unreadCount}</Badge>
  )}
</Nav.Link>

// Fetch unread count
useEffect(() => {
  async function fetchUnreadCount() {
    const { count } = await api.get('/announcements/unread-count');
    setUnreadCount(count);
  }
  fetchUnreadCount();
}, []);
```

### 2. Urgent Modal Popup
**Location**: `frontend/components/UrgentAnnouncementModal.tsx`

```tsx
export function UrgentAnnouncementModal() {
  const [show, setShow] = useState(false);
  const [announcement, setAnnouncement] = useState<any>(null);

  useEffect(() => {
    async function checkUrgent() {
      try {
        const { urgentAnnouncement } = await api.get('/announcements/urgent/check');
        if (urgentAnnouncement) {
          setAnnouncement(urgentAnnouncement);
          setShow(true);
        }
      } catch (error) {
        console.error('Failed to check urgent announcements', error);
      }
    }
    
    checkUrgent();
  }, []);

  async function handleAcknowledge() {
    try {
      await api.post(`/announcements/${announcement.id}/acknowledge`);
      setShow(false);
      toast.success('Announcement acknowledged');
    } catch (error) {
      toast.error('Failed to acknowledge announcement');
    }
  }

  if (!announcement) return null;

  return (
    <Modal show={show} backdrop="static" keyboard={false} centered size="lg">
      <Modal.Header className="bg-danger text-white">
        <Modal.Title>🚨 URGENT ANNOUNCEMENT</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4>{announcement.title}</h4>
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.content) }} />
        
        {announcement.attachments?.length > 0 && (
          <div className="mt-3">
            <strong>Attachments:</strong>
            <ul>
              {announcement.attachments.map(att => (
                <li key={att.id}>
                  <a href={`/api/announcements/attachments/${att.id}/download`} download>
                    📎 {att.filename}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleAcknowledge} size="lg">
          I Understand and Acknowledge
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
```

### 3. Announcement List Page
**Location**: `frontend/pages/announcements/index.tsx`

```tsx
export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      const { announcements } = await api.get('/announcements');
      setAnnouncements(announcements);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container>
      <h1 className="my-4">📢 Company Announcements</h1>
      
      {loading ? (
        <Spinner />
      ) : (
        <Row>
          {announcements.map(ann => (
            <Col key={ann.id} md={12} className="mb-4">
              <Card className={ann.priority === 'URGENT' ? 'border-danger' : ''}>
                <Card.Header className="d-flex justify-content-between">
                  <span>
                    {ann.priority === 'URGENT' && '🚨 '}
                    {ann.priority === 'IMPORTANT' && '⚠️ '}
                    <strong>{ann.title}</strong>
                  </span>
                  <small className="text-muted">
                    {new Date(ann.published_at).toLocaleDateString()}
                  </small>
                </Card.Header>
                <Card.Body>
                  <p>{ann.content.substring(0, 200)}...</p>
                  <Link href={`/announcements/${ann.id}`}>
                    <Button variant="outline-primary" size="sm">
                      Read More →
                    </Button>
                  </Link>
                </Card.Body>
                <Card.Footer>
                  {/* Reaction counts */}
                  <div className="d-flex gap-3">
                    <span>👍 {ann.reactions?.['👍'] || 0}</span>
                    <span>❤️ {ann.reactions?.['❤️'] || 0}</span>
                    <span>😮 {ann.reactions?.['😮'] || 0}</span>
                    <span>😢 {ann.reactions?.['😢'] || 0}</span>
                    <span>❗ {ann.reactions?.['❗'] || 0}</span>
                    <span className="ms-auto">💬 {ann.comment_count || 0} comments</span>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}
```

### 4. Announcement Detail Page
**Location**: `frontend/pages/announcements/[id].tsx`

```tsx
export default function AnnouncementDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [announcement, setAnnouncement] = useState<any>(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [myReaction, setMyReaction] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchAnnouncement();
      fetchComments();
    }
  }, [id]);

  async function fetchAnnouncement() {
    const { announcement } = await api.get(`/announcements/${id}`);
    setAnnouncement(announcement);
    setMyReaction(announcement.user_reaction);
  }

  async function fetchComments() {
    const { comments } = await api.get(`/announcements/${id}/comments`);
    setComments(comments);
  }

  async function handleReact(reaction: string) {
    await api.post(`/announcements/${id}/react`, { reaction });
    setMyReaction(reaction);
    toast.success('Reaction recorded');
    fetchAnnouncement(); // Refresh to get new counts
  }

  async function handleComment() {
    if (!newComment.trim()) return;
    await api.post(`/announcements/${id}/comments`, { content: newComment });
    setNewComment('');
    toast.success('Comment posted');
    fetchComments();
  }

  async function handleAcknowledge() {
    await api.post(`/announcements/${id}/acknowledge`);
    toast.success('Announcement acknowledged');
    fetchAnnouncement();
  }

  if (!announcement) return <Spinner />;

  return (
    <Container className="my-4">
      <Card>
        <Card.Header className={`bg-${announcement.priority === 'URGENT' ? 'danger' : announcement.priority === 'IMPORTANT' ? 'warning' : 'light'} text-${announcement.priority === 'URGENT' ? 'white' : 'dark'}`}>
          <h2>{announcement.title}</h2>
          <small>Published by {announcement.created_by.email} on {new Date(announcement.published_at).toLocaleString()}</small>
        </Card.Header>
        <Card.Body>
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.content) }} />
          
          {/* Attachments */}
          {announcement.attachments?.length > 0 && (
            <div className="mt-4">
              <h5>📎 Attachments</h5>
              <ListGroup>
                {announcement.attachments.map(att => (
                  <ListGroup.Item key={att.id}>
                    <a href={`/api/announcements/attachments/${att.id}/download`} download>
                      {att.filename} ({(att.size / 1024 / 1024).toFixed(2)} MB)
                    </a>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          )}

          {/* Acknowledge button */}
          {!announcement.user_acknowledged && (
            <Button variant="primary" onClick={handleAcknowledge} className="mt-3">
              ✓ Acknowledge
            </Button>
          )}
        </Card.Body>
        
        {/* Reactions */}
        <Card.Footer>
          <div className="d-flex gap-2">
            <ButtonGroup>
              <Button variant={myReaction === '👍' ? 'primary' : 'outline-secondary'} onClick={() => handleReact('👍')}>
                👍 {announcement.reactions?.['👍'] || 0}
              </Button>
              <Button variant={myReaction === '❤️' ? 'primary' : 'outline-secondary'} onClick={() => handleReact('❤️')}>
                ❤️ {announcement.reactions?.['❤️'] || 0}
              </Button>
              <Button variant={myReaction === '😮' ? 'primary' : 'outline-secondary'} onClick={() => handleReact('😮')}>
                😮 {announcement.reactions?.['😮'] || 0}
              </Button>
              <Button variant={myReaction === '😢' ? 'primary' : 'outline-secondary'} onClick={() => handleReact('😢')}>
                😢 {announcement.reactions?.['😢'] || 0}
              </Button>
              <Button variant={myReaction === '❗' ? 'primary' : 'outline-secondary'} onClick={() => handleReact('❗')}>
                ❗ {announcement.reactions?.['❗'] || 0}
              </Button>
            </ButtonGroup>
          </div>
        </Card.Footer>
      </Card>

      {/* Comments Section */}
      <Card className="mt-4">
        <Card.Header>
          <h5>💬 Comments ({comments.length})</h5>
        </Card.Header>
        <Card.Body>
          {comments.map(comment => (
            <div key={comment.id} className="mb-3 p-3 border-bottom">
              <strong>{comment.user.email}</strong>
              <small className="text-muted ms-2">{new Date(comment.created_at).toLocaleString()}</small>
              <p className="mt-2 mb-0">{comment.content}</p>
            </div>
          ))}
          
          {/* Add comment */}
          <Form onSubmit={(e) => { e.preventDefault(); handleComment(); }}>
            <Form.Group className="mt-3">
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </Form.Group>
            <Button type="submit" variant="primary" className="mt-2">
              Post Comment
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
```

### 5. HR: Create Announcement Page
**Location**: `frontend/pages/announcements/create.tsx`

```tsx
export default function CreateAnnouncementPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('GENERAL');
  const [files, setFiles] = useState<File[]>([]);
  const router = useRouter();

  async function handleCreate() {
    try {
      // Create announcement
      const { announcement } = await api.post('/announcements', {
        title,
        content,
        priority,
      });

      // Upload attachments
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/announcements/${announcement.id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Publish
      await api.put(`/announcements/${announcement.id}/publish`);

      toast.success('Announcement published successfully');
      router.push('/announcements');
    } catch (error) {
      toast.error('Failed to create announcement');
    }
  }

  return (
    <Container className="my-4">
      <h1>Create New Announcement</h1>
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Title *</Form.Label>
          <Form.Control
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter announcement title"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Content *</Form.Label>
          <Form.Control
            as="textarea"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter announcement content"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Priority *</Form.Label>
          <Form.Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="GENERAL">General</option>
            <option value="IMPORTANT">Important (Red dot indicator)</option>
            <option value="URGENT">Urgent (Blocking popup)</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Attachments (Optional)</Form.Label>
          <Form.Control
            type="file"
            multiple
            onChange={(e: any) => setFiles(Array.from(e.target.files))}
          />
          <Form.Text>
            Allowed: PDF, Word, Excel, PowerPoint, images, text files, archives. Max 20MB per file.
          </Form.Text>
        </Form.Group>

        <Button variant="primary" onClick={handleCreate}>
          Publish Announcement
        </Button>
      </Form>
    </Container>
  );
}
```

---

## ☁️ AWS EC2 DEPLOYMENT CONSTRAINTS (CRITICAL)

### Environment Variables
```bash
# .env (backend)
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=fyp_db
JWT_SECRET=your_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3001
NODE_ENV=production
```

### No Breaking Changes
- ✅ All existing endpoints continue to work
- ✅ Existing database tables untouched
- ✅ PM2 configuration unchanged
- ✅ CORS settings unchanged
- ✅ File storage strategy unchanged (database-first)

### Streaming Downloads
```typescript
// ALWAYS stream from database, NEVER load full file into memory
res.send(Buffer.from(attachment.file_data));
// NOT: const data = attachment.file_data; res.send(data); // BAD (holds reference)
```

### No WebSockets
```typescript
// Use polling for urgent announcements
// Check on login / dashboard load
// NO Socket.io, NO Server-Sent Events (SSE)
```

---

## 🧪 TESTING REQUIREMENTS

### Manual Test Cases

#### Authentication & Authorization
- [ ] HR can access create announcement page
- [ ] Non-HR cannot access create announcement page (403 Forbidden)
- [ ] Unauthenticated users redirected to login

#### Announcement Creation
- [ ] HR can create announcement (draft state)
- [ ] HR can upload multiple attachments
- [ ] HR can publish announcement (sets published_at)
- [ ] Published announcements appear in user list

#### Priority Behavior
- [ ] URGENT announcement shows blocking popup on first login
- [ ] Popup does NOT reappear after acknowledgment
- [ ] Popup does NOT appear after backend restart (sessionStorage check)
- [ ] IMPORTANT announcement shows red dot until acknowledged
- [ ] GENERAL announcement displays normally

#### File Upload Security
- [ ] PDF upload works
- [ ] Word/Excel/PowerPoint uploads work
- [ ] Image uploads work
- [ ] `.exe` file rejected with error message
- [ ] `.js` file rejected with error message
- [ ] File > 20MB rejected
- [ ] Duplicate file rejected (same hash)
- [ ] Infected file rejected (if ClamAV has test virus)

#### File Download
- [ ] Attachment downloads correctly
- [ ] Correct filename in download
- [ ] Content-Disposition: attachment header present
- [ ] Audit log created on download
- [ ] Cannot download from unpublished announcement

#### Reactions
- [ ] User can react with emoji
- [ ] Changing reaction updates previous one (no duplicates)
- [ ] Reaction counts update correctly
- [ ] Only one reaction per user per announcement

#### Comments
- [ ] User can post comment
- [ ] Comment appears immediately
- [ ] Empty comment rejected
- [ ] Comment > 2000 chars rejected
- [ ] HR can soft-delete inappropriate comment

#### Acknowledgment
- [ ] User can acknowledge announcement
- [ ] Acknowledgment idempotent (clicking twice doesn't create duplicate)
- [ ] Acknowledged announcement doesn't show in urgent check
- [ ] Red dot clears after acknowledging IMPORTANT announcement

#### Audit Logging
- [ ] HR create announcement logged
- [ ] HR upload attachment logged
- [ ] HR publish announcement logged
- [ ] User acknowledge logged
- [ ] User react logged
- [ ] User comment logged
- [ ] User download attachment logged

---

## 🚫 EXPLICITLY FORBIDDEN ACTIONS (CRITICAL)

### DO NOT:
- ❌ Modify existing `purchase-request` logic
- ❌ Modify existing `claim` logic
- ❌ Modify existing `hr` module logic
- ❌ Change `Role` enum
- ❌ Add public file URLs
- ❌ Skip ClamAV scanning
- ❌ Store files on disk (use database ONLY)
- ❌ Introduce background workers
- ❌ Introduce WebSockets
- ❌ Assume multi-EC2 deployment
- ❌ Reimplement existing features differently
- ❌ Change existing API response formats
- ❌ Modify existing audit log structure
- ❌ Break PM2 or startup logic
- ❌ Introduce new dependencies without checking compatibility

---

## 🧠 FINAL INSTRUCTION (MOST IMPORTANT)

### Pattern Reuse Mandate

**If any feature already exists elsewhere in the system, YOU MUST REFER BACK TO THAT IMPLEMENTATION and reuse the same approach to avoid bugs.**

| Feature | Existing Reference File | Method to Reuse |
|---------|------------------------|-----------------|
| **File Upload** | `purchase-request.controller.ts` | `uploadReceipt()` |
| **File Validation** | `purchase-request.service.ts` | `validateAndScanFile()` |
| **ClamAV Scan** | `clamav.service.ts` | `scanFile()` |
| **File Hash** | `purchase-request.service.ts` | `generateFileHash()` |
| **File Download** | `purchase-request.controller.ts` | `downloadClaimReceipt()` |
| **Audit Logging** | `audit.service.ts` | `logFromRequest()` |
| **RBAC Protection** | Any controller with guards | `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles()` |
| **OTP Flow** | `purchase-request.service.ts` | `requestOtp()`, in-memory store |
| **Database Storage** | `claim.entity.ts` | BYTEA columns |

### Code Review Checklist

Before considering this task complete, verify:

- [ ] All file uploads go through ClamAV scanning
- [ ] All executable file types are blocked
- [ ] All files stored in database (BYTEA)
- [ ] All sensitive actions audit logged
- [ ] All endpoints protected with guards
- [ ] URGENT popup appears exactly once per user
- [ ] No existing logic modified
- [ ] No new dependencies added without justification
- [ ] EC2 deployment still works
- [ ] PM2 restart still works
- [ ] Existing tests still pass
- [ ] No console errors on frontend
- [ ] No breaking API changes

---

## ✅ DEFINITION OF DONE

This task is complete **ONLY IF**:

1. ✅ Announcement system works end-to-end
2. ✅ URGENT popup behavior is correct (once per user)
3. ✅ File upload security is enforced (ClamAV, blocking exes)
4. ✅ File download works securely (streaming from DB)
5. ✅ Reactions work correctly (one per user, updateable)
6. ✅ Comments work correctly (flat list, soft-delete)
7. ✅ Acknowledgments work correctly (idempotent)
8. ✅ Audit logs created for all actions
9. ✅ RBAC enforced (HR-only create, all users view)
10. ✅ Existing system remains stable (NO breaking changes)
11. ✅ EC2 deployment unaffected
12. ✅ Security principles preserved
13. ✅ Behavior matches specification exactly
14. ✅ All test cases pass
15. ✅ No console errors or warnings

---

## 📋 IMPLEMENTATION STEPS (RECOMMENDED ORDER)

### Phase 1: Database & Entities
1. Create migration for 5 new tables
2. Create entity files (Announcement, AnnouncementAcknowledgment, AnnouncementReaction, AnnouncementComment, AnnouncementAttachment)
3. Run migration
4. Verify tables created correctly

### Phase 2: Backend Services
1. Create `announcement.service.ts` (CRUD operations)
2. Create `announcement.controller.ts` (endpoints)
3. Add file upload endpoint (reuse ClamAV pattern)
4. Add file download endpoint (reuse streaming pattern)
5. Add audit logging to all actions
6. Test with Postman/Insomnia

### Phase 3: Frontend UI
1. Add "Announcements" to navbar
2. Create announcement list page
3. Create announcement detail page
4. Create urgent popup modal component
5. Create HR create/publish page
6. Test user flows

### Phase 4: Testing & Refinement
1. Run all test cases
2. Fix any bugs
3. Verify audit logs
4. Verify EC2 deployment
5. Verify no breaking changes

---

## 🎓 ACADEMIC DEFENSE POINTS

If examiner asks:

**Q: "Why do you allow file attachments?"**  
**A**: "To enable HR to share important documents (policy updates, forms, contracts) with all employees efficiently through a centralized system."

**Q: "Why don't you allow all file types?"**  
**A**: "We allow most document and media file types but explicitly block executable formats (.exe, .bat, .js, etc.) to prevent malware propagation. This aligns with Zero Trust security principles and defense-in-depth strategy."

**Q: "How do you ensure file security?"**  
**A**: "Three layers: (1) MIME type whitelist, (2) File extension blocking, (3) ClamAV malware scanning. Files are stored in database with SHA-256 hash-based duplicate detection."

**Q: "Why one-time popup instead of persistent notification?"**  
**A**: "To avoid notification fatigue while ensuring critical messages are seen. The blocking modal guarantees visibility, and acknowledgment tracking prevents spam on subsequent logins."

**Q: "How scalable is this design?"**  
**A**: "Current design is optimized for single EC2 instance (10-50 users). For larger scale, we would move to: (1) Object storage (S3) for files, (2) Redis for popup state, (3) Load balancer + multiple EC2 instances."

---

**END OF PROMPT**

---

## 📎 APPENDIX: File Structure

```
backend/src/
├── announcements/
│   ├── announcement.entity.ts
│   ├── announcement-acknowledgment.entity.ts
│   ├── announcement-reaction.entity.ts
│   ├── announcement-comment.entity.ts
│   ├── announcement-attachment.entity.ts
│   ├── announcement.service.ts
│   ├── announcement.controller.ts
│   ├── announcement.module.ts
│   └── dto/
│       ├── create-announcement.dto.ts
│       ├── update-announcement.dto.ts
│       └── react-announcement.dto.ts
├── migrations/
│   └── 1704100000000-CreateAnnouncementTables.ts

frontend/
├── pages/
│   └── announcements/
│       ├── index.tsx (list)
│       ├── [id].tsx (detail)
│       └── create.tsx (HR only)
├── components/
│   └── UrgentAnnouncementModal.tsx
```

---

**This is the complete, production-ready prompt. Copy it exactly and paste into VS Code Copilot Chat.**
