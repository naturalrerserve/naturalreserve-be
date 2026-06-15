import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateCodeDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string; // Optional custom code
}
