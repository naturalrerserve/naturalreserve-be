import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, NotContains } from 'class-validator';

export class CreateAdminDto {
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
  @MinLength(8, { message: 'Password minimal 8 karakter.' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password harus mengandung minimal 1 huruf besar dan 1 angka.',
  })
  password: string;
}
