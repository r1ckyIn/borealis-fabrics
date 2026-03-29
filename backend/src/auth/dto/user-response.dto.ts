/**
 * User response DTO for authenticated endpoints.
 */
export class UserResponseDto {
  id!: number;
  weworkId!: string;
  name!: string;
  avatar?: string;
  mobile?: string;
  isAdmin!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
