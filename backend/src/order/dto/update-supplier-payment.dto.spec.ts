import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateSupplierPaymentDto } from './update-supplier-payment.dto';

describe('UpdateSupplierPaymentDto', () => {
  function createDto(data: Record<string, unknown>): UpdateSupplierPaymentDto {
    return plainToInstance(UpdateSupplierPaymentDto, data);
  }

  describe('voucherFileIds validation', () => {
    it('should reject empty voucherFileIds array', async () => {
      const dto = createDto({
        paid: 1000,
        voucherFileIds: [],
      });
      const errors = await validate(dto);
      const voucherError = errors.find((e) => e.property === 'voucherFileIds');
      expect(voucherError).toBeDefined();
    });

    it('should reject missing voucherFileIds field', async () => {
      const dto = createDto({
        paid: 1000,
      });
      const errors = await validate(dto);
      const voucherError = errors.find((e) => e.property === 'voucherFileIds');
      expect(voucherError).toBeDefined();
    });

    it('should accept valid voucherFileIds [1, 2, 3]', async () => {
      const dto = createDto({
        paid: 1000,
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
        paid: 1000,
        voucherFileIds: [1, 2],
        voucherRemarks: ['Supplier invoice', 'Delivery receipt'],
      });
      const errors = await validate(dto);
      const remarksError = errors.find((e) => e.property === 'voucherRemarks');
      expect(remarksError).toBeUndefined();
    });

    it('should accept when voucherRemarks is omitted', async () => {
      const dto = createDto({
        paid: 1000,
        voucherFileIds: [1],
      });
      const errors = await validate(dto);
      const remarksError = errors.find((e) => e.property === 'voucherRemarks');
      expect(remarksError).toBeUndefined();
    });
  });
});
