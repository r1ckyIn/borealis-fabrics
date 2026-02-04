/**
 * User response DTO for authenticated endpoints.
 */
export class UserResponseDto {
  id!: number;
  weworkId!: string;
  name!: string;
  avatar?: string;
  mobile?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Login response DTO containing JWT token and user info.
 */
export class LoginResponseDto {
  token!: string;
  user!: UserResponseDto;
}

/**
 * Logout response DTO.
 */
export class LogoutResponseDto {
  message!: string;
}
