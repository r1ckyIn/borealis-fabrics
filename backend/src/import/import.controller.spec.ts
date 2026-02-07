/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import type { ImportResultDto } from './dto';

describe('ImportController', () => {
  let controller: ImportController;
  let service: ImportService;

  const mockImportService = {
    generateFabricTemplate: jest.fn(),
    generateSupplierTemplate: jest.fn(),
    importFabrics: jest.fn(),
    importSuppliers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        {
          provide: ImportService,
          useValue: mockImportService,
        },
      ],
    }).compile();

    controller = module.get<ImportController>(ImportController);
    service = module.get<ImportService>(ImportService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('downloadFabricTemplate', () => {
    it('should return Excel buffer with correct headers', async () => {
      const mockBuffer = Buffer.from('test excel content');
      mockImportService.generateFabricTemplate.mockResolvedValue(mockBuffer);

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.downloadFabricTemplate(mockResponse);

      expect(service.generateFabricTemplate).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=fabric_import_template.xlsx',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('downloadSupplierTemplate', () => {
    it('should return Excel buffer with correct headers', async () => {
      const mockBuffer = Buffer.from('test excel content');
      mockImportService.generateSupplierTemplate.mockResolvedValue(mockBuffer);

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.downloadSupplierTemplate(mockResponse);

      expect(service.generateSupplierTemplate).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=supplier_import_template.xlsx',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('importFabrics', () => {
    it('should call service and return import result', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 100,
      } as Express.Multer.File;

      const mockResult: ImportResultDto = {
        successCount: 5,
        skippedCount: 0,
        failureCount: 1,
        failures: [
          {
            rowNumber: 3,
            identifier: 'FB-001',
            reason: 'Already exists',
          },
        ],
      };

      mockImportService.importFabrics.mockResolvedValue(mockResult);

      const result = await controller.importFabrics(mockFile);

      expect(service.importFabrics).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(mockResult);
    });
  });

  describe('importSuppliers', () => {
    it('should call service and return import result', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 100,
      } as Express.Multer.File;

      const mockResult: ImportResultDto = {
        successCount: 3,
        skippedCount: 0,
        failureCount: 2,
        failures: [
          {
            rowNumber: 2,
            identifier: 'Company A',
            reason: 'Already exists',
          },
          {
            rowNumber: 4,
            identifier: 'Company B',
            reason: 'Invalid status',
          },
        ],
      };

      mockImportService.importSuppliers.mockResolvedValue(mockResult);

      const result = await controller.importSuppliers(mockFile);

      expect(service.importSuppliers).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(mockResult);
    });
  });
});
