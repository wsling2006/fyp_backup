import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum PurchaseRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum PurchaseRequestPriority {
  NORMAL = 1,
  MEDIUM = 2,
  HIGH = 3,
  VERY_HIGH = 4,
  URGENT = 5,
}

@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  department: string; // sales_department, marketing

  @Column({ type: 'int', default: 1 })
  priority: number; // 1-5

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  estimated_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  approved_amount: number;

  @Column({
    type: 'enum',
    enum: PurchaseRequestStatus,
    default: PurchaseRequestStatus.DRAFT,
  })
  status: PurchaseRequestStatus;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by_user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedBy: User;

  @Column({ type: 'text', nullable: true })
  review_notes: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date;

  @OneToMany('Claim', 'purchaseRequest')
  claims: any[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
