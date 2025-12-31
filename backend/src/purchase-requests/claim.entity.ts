import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { PurchaseRequest } from './purchase-request.entity';

export enum ClaimStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  PROCESSED = 'PROCESSED',
  REJECTED = 'REJECTED',
}

export enum MalwareScanStatus {
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
}

@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  purchase_request_id: string;

  @ManyToOne(() => PurchaseRequest, (pr) => pr.claims)
  @JoinColumn({ name: 'purchase_request_id' })
  purchaseRequest: PurchaseRequest;

  @Column({ type: 'varchar', length: 500 })
  receipt_file_path: string;

  @Column({ type: 'varchar', length: 500 })
  receipt_file_original_name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  file_hash: string; // SHA-256 hash to prevent duplicate file uploads

  @Column({
    type: 'varchar',
    length: 20,
    default: MalwareScanStatus.CLEAN,
  })
  malware_scan_status: MalwareScanStatus;

  @Column({ type: 'varchar', length: 255 })
  vendor_name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount_claimed: number;

  @Column({ type: 'date' })
  purchase_date: Date;

  @Column({ type: 'text' })
  claim_description: string;

  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy: User;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.PENDING,
  })
  status: ClaimStatus;

  @Column({ type: 'uuid', nullable: true })
  verified_by_user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verified_by_user_id' })
  verifiedBy: User;

  @Column({ type: 'text', nullable: true })
  verification_notes: string;

  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date;

  @CreateDateColumn()
  uploaded_at: Date;
}
