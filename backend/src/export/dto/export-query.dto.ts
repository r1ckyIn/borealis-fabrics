import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for export query parameters.
 * Fields are provided as a comma-separated string of field names.
 */
export class ExportQueryDto {
  @IsString()
  @IsNotEmpty()
  fields!: string;
}
