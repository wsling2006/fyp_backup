import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

/**
 * AccountantFile Entity
 * 
 * Represents a file uploaded by an accountant or super admin.
 * Files are stored directly in PostgreSQL (binary data in BYTEA column).
 * 
 * Database table: accountant_files
 * 
 * For FYP: This demonstrates TypeORM entity definition with relationships,
 * binary data storage, and automatic timestamp management.
 * 
 * Security considerations:
 * - All files are scanned with ClamAV before being saved
 * - Only specific file types are allowed (see validation in service)
 * - File size is limited to 10MB
 * - Access is restricted by role-based authentication
 */
@Entity('accountant_files')
export class AccountantFile {
  // Primary key: Auto-generated UUID
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Original filename as uploaded by user
  @Column()
  filename: string;

  // MIME type (e.g., 'application/pdf', 'text/plain')
  @Column()
  mimetype: string;

  // File size in bytes (stored as bigint to support large files)
  @Column({ type: 'bigint' })
  size: number;

  /**
   * Binary file data stored in PostgreSQL
   * Type: BYTEA (PostgreSQL binary data type)
   * 
   * Note: For production with large files, consider using cloud storage
   * (S3, Azure Blob) and storing only the reference URL here.
   */
  @Column({ type: 'bytea' })
  data: Buffer;

  /**
   * SHA256 hash of the file content
   * Used for duplicate detection - prevents uploading the same file multiple times
   * 
   * For FYP: This demonstrates content-based deduplication using cryptographic hashing.
   * SHA256 is chosen for its strong collision resistance and wide industry adoption.
   * The hash is indexed for fast duplicate lookups.
   * 
   * Nullable to support existing files that were uploaded before this feature was added.
   * New uploads will always have a hash. Duplicate detection only works for files with hashes.
   */
  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  file_hash: string | null;

  /**
   * ID of the user who uploaded the file
   * Nullable to allow anonymous uploads in prototype
   */
  @Column({ type: 'uuid', nullable: true })
  uploaded_by_id?: string | null;

  /**
   * Relationship to User entity
   * Many files can be uploaded by one user
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploaded_by?: User;

  /**
   * Timestamp of when the file was uploaded
   * Automatically set by TypeORM on creation
   */
  @CreateDateColumn()
  created_at: Date;
}
