import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { AnnouncementPriority } from '../enums/announcement-priority.enum';
import { AnnouncementAcknowledgment } from './announcement-acknowledgment.entity';
import { AnnouncementReaction } from './announcement-reaction.entity';
import { AnnouncementComment } from './announcement-comment.entity';
import { AnnouncementAttachment } from './announcement-attachment.entity';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: AnnouncementPriority,
    default: AnnouncementPriority.GENERAL,
  })
  priority: AnnouncementPriority;

  @Column({ type: 'uuid' })
  created_by: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by' })
  author: User;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => AnnouncementAcknowledgment, (ack) => ack.announcement)
  acknowledgments: AnnouncementAcknowledgment[];

  @OneToMany(() => AnnouncementReaction, (reaction) => reaction.announcement)
  reactions: AnnouncementReaction[];

  @OneToMany(() => AnnouncementComment, (comment) => comment.announcement)
  comments: AnnouncementComment[];

  @OneToMany(() => AnnouncementAttachment, (attachment) => attachment.announcement)
  attachments: AnnouncementAttachment[];
}
