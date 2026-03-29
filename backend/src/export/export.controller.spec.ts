import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ExportController', () => {
  let controller: ExportController;
  let exportService: {
    getFieldConfig: jest.Mock;
    export: jest.Mock;
  };

  beforeEach(async () => {
    exportService = {
      getFieldConfig: jest.fn(),
      export: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [{ provide: ExportService, useValue: exportService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExportController>(ExportController);
  });

  describe('getFieldConfig', () => {
    it('should return field config array for valid entity type', () => {
      const mockConfig = [
        { field: 'companyName', label: '供应商名称', type: 'string' },
        { field: 'contactName', label: '联系人', type: 'string' },
      ];
      exportService.getFieldConfig.mockReturnValue(mockConfig);

      const result = controller.getFieldConfig('supplier');

      expect(result).toEqual(mockConfig);
      expect(exportService.getFieldConfig).toHaveBeenCalledWith('supplier');
    });

    it('should propagate BadRequestException for unknown entity type', () => {
      exportService.getFieldConfig.mockImplementation(() => {
        throw new BadRequestException('Unknown entity type');
      });

      expect(() => controller.getFieldConfig('unknown')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('exportEntity', () => {
    it('should call service.export and write buffer to response', async () => {
      const mockBuffer = Buffer.from('test-xlsx-content');
      exportService.export.mockResolvedValue(mockBuffer);

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
      };

      await controller.exportEntity(
        'supplier',
        { fields: 'companyName,contactName' },
        mockRes as unknown as import('express').Response,
      );

      expect(exportService.export).toHaveBeenCalledWith('supplier', [
        'companyName',
        'contactName',
      ]);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(
          /^attachment; filename=supplier-export-\d{8}\.xlsx$/,
        ),
      );
      expect(mockRes.end).toHaveBeenCalledWith(mockBuffer);
    });

    it('should propagate service errors', async () => {
      exportService.export.mockRejectedValue(
        new BadRequestException('Invalid fields'),
      );

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
      };

      await expect(
        controller.exportEntity(
          'supplier',
          { fields: 'invalidField' },
          mockRes as unknown as import('express').Response,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
