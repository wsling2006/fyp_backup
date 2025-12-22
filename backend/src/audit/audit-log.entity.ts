import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Audit Log Entity
 * 
 * Tracks sensitive actions like viewing revenue data for security and compliance.
 * Accessible only by SUPER_ADMIN role.
 * 
 * For FYP: Demonstrates security audit trail implementation,
 * compliance with data protection requirements, and activity monitoring.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * User who performed the action
   */
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Action performed
   * Examples: VIEW_REVENUE, CREATE_REVENUE, UPDATE_REVENUE, DELETE_REVENUE,
   *           VIEW_EMPLOYEE, CREATE_USER, etc.
   */
  @Column({ type: 'varchar', length: 100 })
  action: string;

  /**
   * Resource type being accessed
   * Examples: revenue, employee, user, file
   */
  @Column({ type: 'varchar', length: 100 })
  resource: string;

  /**
   * Optional resource ID (e.g., specific revenue record ID)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  resource_id: string | null;

  /**
   * IP address of the request
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  /**
   * User agent (browser/client info)
   */
  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;
}
