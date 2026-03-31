import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ExportService } from './export.service';
import { PrismaService } from '../prisma/prisma.service';
import { loadTestWorkbook } from '../../test/helpers/mock-builders';

describe('ExportService', () => {
  let service: ExportService;
  let prismaService: Record<string, { findMany: jest.Mock }>;

  beforeEach(async () => {
    prismaService = {
      supplier: { findMany: jest.fn() },
      customer: { findMany: jest.fn() },
      fabric: { findMany: jest.fn() },
      product: { findMany: jest.fn() },
      order: { findMany: jest.fn() },
      quote: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  describe('getFieldConfig', () => {
    it('should return field config for supplier entity', () => {
      const config = service.getFieldConfig('supplier');

      expect(config).toBeInstanceOf(Array);
      expect(config.length).toBeGreaterThan(0);
      expect(config[0]).toHaveProperty('field');
      expect(config[0]).toHaveProperty('label');
      expect(config[0]).toHaveProperty('type');

      const fieldNames = config.map((c) => c.field);
      expect(fieldNames).toContain('companyName');
      expect(fieldNames).toContain('contactName');
      expect(fieldNames).toContain('phone');
    });

    it('should return field config for all 6 entity types', () => {
      const entityTypes = [
        'supplier',
        'customer',
        'fabric',
        'product',
        'order',
        'quote',
      ];

      for (const entityType of entityTypes) {
        const config = service.getFieldConfig(entityType);
        expect(config).toBeInstanceOf(Array);
        expect(config.length).toBeGreaterThan(0);
      }
    });

    it('should throw BadRequestException for unknown entity type', () => {
      expect(() => service.getFieldConfig('unknown_entity')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('export', () => {
    it('should return a Buffer with xlsx content for valid entity and fields', async () => {
      prismaService.supplier.findMany.mockResolvedValue([
        {
          id: 1,
          companyName: 'Test Supplier',
          contactName: 'John',
          phone: '13800138000',
          createdAt: new Date('2026-01-15T10:00:00Z'),
        },
      ]);

      const result = await service.export('supplier', [
        'companyName',
        'contactName',
      ]);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      // Verify it's valid xlsx by reading it back
      const workbook = await loadTestWorkbook(result);
      const worksheet = workbook.getWorksheet('supplier');
      expect(worksheet).toBeDefined();
    });

    it('should include selected fields as columns with Chinese labels', async () => {
      prismaService.supplier.findMany.mockResolvedValue([
        {
          id: 1,
          companyName: 'Supplier A',
          contactName: 'Alice',
        },
      ]);

      const result = await service.export('supplier', [
        'companyName',
        'contactName',
      ]);

      const workbook = await loadTestWorkbook(result);
      const worksheet = workbook.getWorksheet('supplier')!;

      // Check header row has the correct labels
      const headerRow = worksheet.getRow(1);
      expect(headerRow.getCell(1).value).toMatch(/供应商名称/);
      expect(headerRow.getCell(2).value).toMatch(/联系人/);
    });

    it('should format date values as YYYY-MM-DD HH:mm', async () => {
      const testDate = new Date('2026-03-15T14:30:00Z');
      prismaService.supplier.findMany.mockResolvedValue([
        {
          id: 1,
          companyName: 'Supplier A',
          createdAt: testDate,
        },
      ]);

      const result = await service.export('supplier', [
        'companyName',
        'createdAt',
      ]);

      const workbook = await loadTestWorkbook(result);
      const worksheet = workbook.getWorksheet('supplier')!;

      const dataRow = worksheet.getRow(2);
      const dateValue = dataRow.getCell(2).value as string;
      // Should be formatted as date string, not raw Date object
      expect(typeof dateValue).toBe('string');
      expect(dateValue).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should export order entity type without deletedAt filter', async () => {
      prismaService.order.findMany.mockResolvedValue([
        {
          id: 1,
          orderCode: 'BF-2601-0001',
          status: 'CONFIRMED',
          createdAt: new Date(),
        },
      ]);

      const result = await service.export('order', ['orderCode', 'status']);

      const workbook = await loadTestWorkbook(result);
      const worksheet = workbook.getWorksheet('order')!;
      expect(worksheet).toBeDefined();
    });

    it('should throw BadRequestException for unknown entity type', async () => {
      await expect(
        service.export('invalid_entity', ['companyName']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid field name', async () => {
      await expect(
        service.export('supplier', ['nonExistentField']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle empty result set', async () => {
      prismaService.supplier.findMany.mockResolvedValue([]);

      const result = await service.export('supplier', ['companyName']);

      expect(result).toBeInstanceOf(Buffer);

      const workbook = await loadTestWorkbook(result);
      const worksheet = workbook.getWorksheet('supplier')!;
      expect(worksheet.rowCount).toBe(1); // Header row only
    });

    it('should export fabric entity with correct data', async () => {
      prismaService.fabric.findMany.mockResolvedValue([
        {
          id: 1,
          fabricCode: 'FB-001',
          name: 'Test Fabric',
          composition: 'cotton 100%',
          createdAt: new Date(),
        },
      ]);

      const result = await service.export('fabric', ['fabricCode', 'name']);

      const workbook = await loadTestWorkbook(result);
      const worksheet = workbook.getWorksheet('fabric')!;
      const dataRow = worksheet.getRow(2);
      expect(dataRow.getCell(1).value).toBe('FB-001');
    });

    it('should style header row with bold font and gray background', async () => {
      prismaService.supplier.findMany.mockResolvedValue([]);

      const result = await service.export('supplier', ['companyName']);

      const workbook = await loadTestWorkbook(result);
      const worksheet = workbook.getWorksheet('supplier')!;
      const headerRow = worksheet.getRow(1);
      const headerCell = headerRow.getCell(1);

      expect(headerCell.font?.bold).toBe(true);
    });
  });
});
