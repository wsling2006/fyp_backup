import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Announcement } from './announcement.entity';
import { User } from '../../users/entities/user.entity';

@Entity('announcement_acknowledgments')
@Unique(['announcement_id', 'user_id'])
export class AnnouncementAcknowledgment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcement_id: string;

  @ManyToOne(() => Announcement, (announcement) => announcement.acknowledgments)
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: true })
  acknowledged: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  acknowledged_at: Date;
}
