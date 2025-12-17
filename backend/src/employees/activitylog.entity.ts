import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_email: string;

  @Column()
  action: string;

  @Column('text')
  details: string;

  @CreateDateColumn()
  timestamp: Date;
}
