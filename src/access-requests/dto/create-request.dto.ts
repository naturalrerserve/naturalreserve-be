import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, NotContains } from 'class-validator';

export class CreateRequestDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @NotContains(' ', { message: 'Username tidak boleh mengandung spasi.' })
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter.' })
  password: string;

  @IsNotEmpty()
  @IsString()
  reason: string;
}
