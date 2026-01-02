import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Announcement } from './announcement.entity';
import { User } from '../../users/user.entity';

@Entity('announcement_attachments')
export class AnnouncementAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcement_id: string;

  @ManyToOne(() => Announcement, (announcement) => announcement.attachments)
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @Column({ type: 'varchar', length: 255 })
  original_filename: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stored_filename: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  file_hash: string;

  @Column({ type: 'bytea' })
  file_data: Buffer;

  @Column({ type: 'uuid' })
  uploaded_by: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  uploaded_at: Date;
}
