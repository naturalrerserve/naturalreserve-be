import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateAvatarDto {
  @IsNotEmpty()
  @IsString()
  avatar: string; // Base64 encoded image or URL
}
