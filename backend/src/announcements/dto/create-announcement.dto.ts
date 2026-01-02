import { IsString, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { AnnouncementPriority } from '../enums/announcement-priority.enum';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(AnnouncementPriority)
  @IsNotEmpty()
  priority: AnnouncementPriority;
}

export class AddCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AddReactionDto {
  @IsEnum(['👍', '❤️', '😮', '😢', '❗'])
  @IsNotEmpty()
  reaction_type: string;
}
