import { IsNotEmpty, IsString } from 'class-validator';

export class LogActivityDto {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}
