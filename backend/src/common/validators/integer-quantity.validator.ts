import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that quantity is an integer when the specified field is present.
 * Used for non-fabric products which require whole number quantities.
 *
 * @param triggerField - Field name that triggers integer validation (e.g., 'productId')
 * @param validationOptions - Optional class-validator options
 */
export function IsIntegerWhenFieldPresent(
  triggerField: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIntegerWhenFieldPresent',
      target: object.constructor,
      propertyName,
      constraints: [triggerField],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const triggerValue = obj[args.constraints[0] as string];
          const hasTrigger =
            triggerValue !== undefined && triggerValue !== null;

          // Only enforce integer check when trigger field is present
          if (!hasTrigger) {
            return true;
          }

          // Value must be an integer
          return typeof value === 'number' && Number.isInteger(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a whole number when ${args.constraints[0]} is provided`;
        },
      },
    });
  };
}
