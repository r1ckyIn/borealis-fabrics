import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../common/utils/pagination';

/** Allowed sort fields for audit log queries */
export enum AuditLogSortField {
  createdAt = 'createdAt',
  action = 'action',
  entityType = 'entityType',
  userName = 'userName',
}

/**
 * DTO for querying audit logs with pagination and filtering.
 * All filter fields are optional.
 */
export class QueryAuditLogDto extends PaginationDto {
  @IsOptional()
  @IsEnum(AuditLogSortField)
  sortBy?: string = AuditLogSortField.createdAt;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  startDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  endDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  keyword?: string;
}
