import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Employee Entity
 * 
 * Stores employee information with both public and sensitive fields.
 * 
 * Access control:
 * - List view (minimal): employee_id, name, status only
 * - Detail view (full): all fields including sensitive data
 * - Only HR and SUPER_ADMIN can access
 * - All accesses to sensitive fields are logged
 */
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Public fields (shown in list view)
   */
  @Column({ unique: true, nullable: true })
  employee_id: string; // Employee ID (e.g., EMP001)

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'],
    default: 'ACTIVE'
  })
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

  /**
   * Sensitive fields (only in detail view, audit logged)
   */
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  emergency_contact: string;

  @Column({ nullable: true })
  ic_number: string; // IC / Passport number

  @Column({ type: 'date', nullable: true })
  birthday: Date;

  @Column({ nullable: true })
  bank_account_number: string;

  /**
   * Job-related fields
   */
  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  department: string;

  @Column({ type: 'date', nullable: true })
  date_of_joining: Date;

  /**
   * Legacy field for backward compatibility
   * Use 'status' field instead
   */
  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
