import { IsString, IsEnum, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
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

export class UpdateAnnouncementDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(AnnouncementPriority)
  @IsOptional()
  priority?: AnnouncementPriority;
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
