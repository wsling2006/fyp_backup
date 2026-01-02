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
import { User } from '../../users/user.entity';

export enum ReactionType {
  THUMBS_UP = '👍',
  HEART = '❤️',
  SURPRISED = '😮',
  SAD = '😢',
  EXCLAMATION = '❗',
}

@Entity('announcement_reactions')
@Unique(['announcement_id', 'user_id'])
export class AnnouncementReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcement_id: string;

  @ManyToOne(() => Announcement, (announcement) => announcement.reactions)
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ReactionType,
  })
  reaction_type: ReactionType;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
