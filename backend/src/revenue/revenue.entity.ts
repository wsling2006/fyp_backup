import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Revenue Entity
 * 
 * Tracks company revenue records for financial reporting and analytics.
 * Accessible only by ACCOUNTANT and SUPER_ADMIN roles.
 * 
 * For FYP: Demonstrates financial data handling with RBAC,
 * audit trails, and secure access control patterns.
 */
@Entity('revenue')
export class Revenue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Invoice or transaction reference ID
   * Used for traceability and reconciliation
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  invoice_id: string | null;

  /**
   * Client or customer name
   * For revenue source tracking
   */
  @Column({ type: 'varchar', length: 255 })
  client: string;

  /**
   * Revenue source or category
   * Examples: 'Product Sales', 'Service Contract', 'Consulting'
   */
  @Column({ type: 'varchar', length: 100 })
  source: string;

  /**
   * Revenue amount in cents (to avoid floating point issues)
   * Stored as bigint to support large amounts
   * Display as: amount / 100
   */
  @Column({ type: 'bigint' })
  amount: number;

  /**
   * Currency code (ISO 4217)
   * Default: SGD (Singapore Dollar)
   */
  @Column({ type: 'varchar', length: 3, default: 'SGD' })
  currency: string;

  /**
   * Date when revenue was earned/recognized
   */
  @Column({ type: 'date' })
  date: Date;

  /**
   * Payment status
   * PAID: Revenue received
   * PENDING: Revenue recorded but payment not yet received
   */
  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: 'PAID' | 'PENDING';

  /**
   * Optional notes or description
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * User who created this revenue record
   * For audit trail and accountability
   */
  @Column({ type: 'uuid' })
  created_by_user_id: string;

  /**
   * Relationship to User entity
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
