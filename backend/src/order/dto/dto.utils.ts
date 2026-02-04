/**
 * Shared DTO utility functions and transforms.
 */

/**
 * Transform function to trim string values.
 * Used with @Transform decorator from class-transformer.
 *
 * @example
 * @Transform(trimTransform)
 * @IsString()
 * name: string;
 */
export function trimTransform({
  value,
}: {
  value: unknown;
}): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}
