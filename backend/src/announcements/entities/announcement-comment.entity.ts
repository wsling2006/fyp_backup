import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Announcement } from './announcement.entity';
import { User } from '../../users/entities/user.entity';

@Entity('announcement_comments')
export class AnnouncementComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcement_id: string;

  @ManyToOne(() => Announcement, (announcement) => announcement.comments)
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
