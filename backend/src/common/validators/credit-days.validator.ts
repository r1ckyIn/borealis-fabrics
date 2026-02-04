import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator: creditDays is only allowed when the specified type field is 'credit'.
 * If the type field is 'prepay' and creditDays is provided, validation fails.
 *
 * This validator is generic and can be used for both:
 * - Supplier: checks 'settleType' field
 * - Customer: checks 'creditType' field
 *
 * @param typeFieldName - The name of the field to check ('settleType' or 'creditType')
 * @param validationOptions - Optional validation options
 *
 * @example
 * // In Supplier DTO
 * @IsCreditDaysValidFor('settleType')
 * creditDays?: number;
 *
 * @example
 * // In Customer DTO
 * @IsCreditDaysValidFor('creditType')
 * creditDays?: number;
 */
export function IsCreditDaysValidFor(
  typeFieldName: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCreditDaysValidFor',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          // If creditDays is not provided, always valid
          if (value === undefined || value === null) {
            return true;
          }
          // creditDays is only valid when the specified type field is 'credit'
          return obj[typeFieldName] === 'credit';
        },
        defaultMessage() {
          return `creditDays can only be set when ${typeFieldName} is 'credit'`;
        },
      },
    });
  };
}
