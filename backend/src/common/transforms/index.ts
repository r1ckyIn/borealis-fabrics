/**
 * Common transform functions for class-transformer decorators.
 */

/**
 * Trim whitespace from string values.
 * Used with @Transform decorator to sanitize string inputs.
 *
 * @example
 * @Transform(trimTransform)
 * @IsString()
 * name!: string;
 */
export const trimTransform = ({
  value,
}: {
  value: unknown;
}): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;
