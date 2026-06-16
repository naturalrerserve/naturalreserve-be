import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsNotEmpty({ message: 'Token Google (credential) tidak boleh kosong.' })
  @IsString()
  credential: string;
}
