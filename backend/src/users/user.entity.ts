import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Role } from './roles.enum';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password_hash: string;

  @Column({
    type: 'enum',
    enum: Role,
    nullable: false
  })
  role: Role;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  emergency_contact: string;

  @Column({ default: true })
  mfa_enabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_password_change: Date;

  @Column({ nullable: true })
  @Exclude()
  otp_code: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  otp_expires_at: Date | null;

  @Column({ nullable: true })
  @Exclude()
  otp_reset: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  otp_reset_expires_at: Date | null;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  suspended: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date;

  @Column({ default: 0 })
  failed_login_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  account_locked_until: Date | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string;

  @ManyToOne(() => User, { nullable: true })
  created_by: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  isAccountLocked(): boolean {
    if (!this.account_locked_until) return false;
    return new Date() < this.account_locked_until;
  }

  isOtpValid(otp: string): boolean {
    if (!this.otp_code || !this.otp_expires_at) return false;
    if (new Date() > this.otp_expires_at) return false;
    return this.otp_code === otp;
  }
}
