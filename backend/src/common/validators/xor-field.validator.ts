import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates XOR constraint between two fields.
 * Exactly one of the two fields must be set (not both, not neither).
 *
 * @param otherField - The name of the other field in the XOR pair
 * @param validationOptions - Optional class-validator options
 */
export function IsXorWith(
  otherField: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isXorWith',
      target: object.constructor,
      propertyName,
      constraints: [otherField],
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const thisValue = obj[args.property];
          const otherValue = obj[args.constraints[0] as string];
          const hasThis = thisValue !== undefined && thisValue !== null;
          const hasOther = otherValue !== undefined && otherValue !== null;
          return (hasThis && !hasOther) || (!hasThis && hasOther);
        },
        defaultMessage(args: ValidationArguments) {
          return `Exactly one of ${args.property} or ${args.constraints[0]} must be provided`;
        },
      },
    });
  };
}
