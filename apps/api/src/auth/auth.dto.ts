import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

const normalize = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class RegisterDto {
  @Transform(normalize)
  @IsEmail({}, { message: 'A valid email is required' })
  email!: string;

  @IsString({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;
}

export class LoginDto {
  @Transform(normalize)
  @IsEmail({}, { message: 'A valid email is required' })
  email!: string;

  @IsString({ message: 'Password is required' })
  password!: string;
}
