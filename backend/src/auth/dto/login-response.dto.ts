import { UserResponseDto } from './user-response.dto';

/**
 * Login response DTO containing JWT token and user info.
 */
export class LoginResponseDto {
  token!: string;
  user!: UserResponseDto;
}
