import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Employee } from './employee.entity';

/**
 * Employee Document Entity
 * 
 * Stores employee-related documents such as:
 * - Resume/CV
 * - Employment contracts
 * - Offer letters
 * - Identity documents (IC, passport)
 * - Other HR documents
 * 
 * Security features:
 * - Files are scanned with ClamAV before storage
 * - Only HR and SUPER_ADMIN can upload/download
 * - All access is logged via audit trail
 * - Files stored in database (BYTEA) for security
 * - SHA256 hash for duplicate detection
 * 
 * Database table: employee_documents
 */
@Entity('employee_documents')
export class EmployeeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the employee this document belongs to
   */
  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  /**
   * Original filename as uploaded
   */
  @Column({ type: 'varchar', length: 500 })
  filename: string;

  /**
   * MIME type (e.g., 'application/pdf', 'image/jpeg')
   */
  @Column({ type: 'varchar', length: 100 })
  mimetype: string;

  /**
   * File size in bytes
   */
  @Column({ type: 'bigint' })
  size: number;

  /**
   * Binary file data stored in PostgreSQL
   * Type: BYTEA (PostgreSQL binary data type)
   * 
   * Reuses the same pattern as accountant_files and claims
   * for consistency and EC2 safety
   */
  @Column({ type: 'bytea' })
  data: Buffer;

  /**
   * SHA256 hash for duplicate detection
   * Prevents uploading the same document multiple times
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  file_hash: string | null;

  /**
   * Document type classification
   */
  @Column({ 
    type: 'enum',
    enum: ['RESUME', 'EMPLOYMENT_CONTRACT', 'OFFER_LETTER', 'IDENTITY_DOCUMENT', 'OTHER'],
    default: 'OTHER'
  })
  document_type: 'RESUME' | 'EMPLOYMENT_CONTRACT' | 'OFFER_LETTER' | 'IDENTITY_DOCUMENT' | 'OTHER';

  /**
   * Optional description or notes about the document
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * User who uploaded the document (HR or SUPER_ADMIN)
   */
  @Column({ type: 'uuid' })
  uploaded_by_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploaded_by: User;

  /**
   * Timestamp of upload
   */
  @CreateDateColumn()
  created_at: Date;
}
