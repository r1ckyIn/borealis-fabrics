import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCustomerPaymentDto } from './update-customer-payment.dto';

describe('UpdateCustomerPaymentDto', () => {
  function createDto(data: Record<string, unknown>): UpdateCustomerPaymentDto {
    return plainToInstance(UpdateCustomerPaymentDto, data);
  }

  describe('voucherFileIds validation', () => {
    it('should reject empty voucherFileIds array', async () => {
      const dto = createDto({
        customerPaid: 1000,
        voucherFileIds: [],
      });
      const errors = await validate(dto);
      const voucherError = errors.find((e) => e.property === 'voucherFileIds');
      expect(voucherError).toBeDefined();
    });

    it('should reject missing voucherFileIds field', async () => {
      const dto = createDto({
        customerPaid: 1000,
      });
      const errors = await validate(dto);
      const voucherError = errors.find((e) => e.property === 'voucherFileIds');
      expect(voucherError).toBeDefined();
    });

    it('should accept valid voucherFileIds [1, 2, 3]', async () => {
      const dto = createDto({
        customerPaid: 1000,
        voucherFileIds: [1, 2, 3],
      });
      const errors = await validate(dto);
      const voucherError = errors.find((e) => e.property === 'voucherFileIds');
      expect(voucherError).toBeUndefined();
    });
  });

  describe('voucherRemarks validation', () => {
    it('should accept optional voucherRemarks string array', async () => {
      const dto = createDto({
        customerPaid: 1000,
        voucherFileIds: [1, 2],
        voucherRemarks: ['Payment receipt', 'Bank transfer confirmation'],
      });
      const errors = await validate(dto);
      const remarksError = errors.find((e) => e.property === 'voucherRemarks');
      expect(remarksError).toBeUndefined();
    });

    it('should accept when voucherRemarks is omitted', async () => {
      const dto = createDto({
        customerPaid: 1000,
        voucherFileIds: [1],
      });
      const errors = await validate(dto);
      const remarksError = errors.find((e) => e.property === 'voucherRemarks');
      expect(remarksError).toBeUndefined();
    });
  });
});
