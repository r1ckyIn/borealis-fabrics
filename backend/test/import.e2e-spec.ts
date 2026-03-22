import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as ExcelJS from 'exceljs';
import { ImportModule } from '../src/import/import.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

// Response type definitions
interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface ImportResultData {
  successCount: number;
  skippedCount: number;
  failureCount: number;
  failures: Array<{
    rowNumber: number;
    identifier: string;
    reason: string;
  }>;
}

describe('ImportController (e2e)', () => {
  let app: INestApplication<App>;

  // Define mock service type
  interface MockPrismaServiceType {
    fabric: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    supplier: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  }

  const mockPrismaService: MockPrismaServiceType = {
    fabric: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    supplier: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest
      .fn()
      .mockImplementation((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ImportModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock Excel file
  const createMockExcelFile = async (
    sheetName: string,
    columns: Array<{ header: string; key: string; width: number }>,
    rows: Array<Record<string, unknown>>,
  ): Promise<Buffer> => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;
    rows.forEach((row) => worksheet.addRow(row));

    return Buffer.from(await workbook.xlsx.writeBuffer());
  };

  // ============================================================
  // 3.4.3 GET /import/templates/fabrics
  // ============================================================
  describe('GET /import/templates/fabrics', () => {
    it('should return Excel template file', async () => {
      const response = await request(app.getHttpServer())
        .get('/import/templates/fabrics')
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(response.headers['content-disposition']).toBe(
        'attachment; filename=fabric_import_template.xlsx',
      );
      expect(response.body).toBeInstanceOf(Buffer);
    }, 30000);

    it('should return valid Excel file that can be parsed', async () => {
      const response = await request(app.getHttpServer())
        .get('/import/templates/fabrics')
        .responseType('blob')
        .expect(200);

      const workbook = new ExcelJS.Workbook();

      await workbook.xlsx.load(response.body);

      expect(workbook.worksheets.length).toBe(2);
      expect(workbook.worksheets[0].name).toBe('Fabrics');
      expect(workbook.worksheets[1].name).toBe('Instructions');
    }, 30000);
  });

  // ============================================================
  // 3.4.4 GET /import/templates/suppliers
  // ============================================================
  describe('GET /import/templates/suppliers', () => {
    it('should return Excel template file', async () => {
      const response = await request(app.getHttpServer())
        .get('/import/templates/suppliers')
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(response.headers['content-disposition']).toBe(
        'attachment; filename=supplier_import_template.xlsx',
      );
      expect(response.body).toBeInstanceOf(Buffer);
    }, 30000);

    it('should return valid Excel file that can be parsed', async () => {
      const response = await request(app.getHttpServer())
        .get('/import/templates/suppliers')
        .responseType('blob')
        .expect(200);

      const workbook = new ExcelJS.Workbook();

      await workbook.xlsx.load(response.body);

      expect(workbook.worksheets.length).toBe(2);
      expect(workbook.worksheets[0].name).toBe('Suppliers');
      expect(workbook.worksheets[1].name).toBe('Instructions');
    }, 30000);
  });

  // ============================================================
  // 3.4.1 POST /import/fabrics
  // ============================================================
  describe('POST /import/fabrics', () => {
    const fabricColumns = [
      { header: 'fabricCode*', key: 'fabricCode', width: 20 },
      { header: 'name*', key: 'name', width: 25 },
      { header: 'material', key: 'material', width: 30 },
      { header: 'composition', key: 'composition', width: 25 },
      { header: 'color', key: 'color', width: 15 },
      { header: 'weight', key: 'weight', width: 12 },
      { header: 'width', key: 'width', width: 12 },
      { header: 'defaultPrice', key: 'defaultPrice', width: 15 },
      { header: 'description', key: 'description', width: 40 },
    ];

    it('should successfully import fabrics', async () => {
      const buffer = await createMockExcelFile('Fabrics', fabricColumns, [
        { fabricCode: 'FB-TEST-001', name: 'Test Fabric 1' },
        { fabricCode: 'FB-TEST-002', name: 'Test Fabric 2', color: 'Blue' },
      ]);

      mockPrismaService.fabric.findMany.mockResolvedValue([]);
      mockPrismaService.fabric.create.mockResolvedValue({ id: 1 });

      const response = await request(app.getHttpServer())
        .post('/import/fabrics')
        .attach('file', buffer, {
          filename: 'test.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<ImportResultData>;
      // TransformInterceptor wraps response - code can be 0 or status code
      expect([0, 201]).toContain(body.code);
      expect(body.data.successCount).toBe(2);
      expect(body.data.failureCount).toBe(0);
    }, 30000);

    it('should skip existing fabrics instead of reporting as failures', async () => {
      const buffer = await createMockExcelFile('Fabrics', fabricColumns, [
        { fabricCode: 'FB-EXISTING', name: 'Existing Fabric' },
        { fabricCode: 'FB-NEW', name: 'New Fabric' },
      ]);

      mockPrismaService.fabric.findMany.mockResolvedValue([
        { fabricCode: 'FB-EXISTING' },
      ]);
      mockPrismaService.fabric.create.mockResolvedValue({ id: 1 });

      const response = await request(app.getHttpServer())
        .post('/import/fabrics')
        .attach('file', buffer, {
          filename: 'test.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<ImportResultData>;
      expect(body.data.successCount).toBe(1);
      expect(body.data.skippedCount).toBe(1);
      expect(body.data.failureCount).toBe(0);
    }, 30000);
  });

  // ============================================================
  // 3.4.2 POST /import/suppliers
  // ============================================================
  describe('POST /import/suppliers', () => {
    const supplierColumns = [
      { header: 'companyName*', key: 'companyName', width: 30 },
      { header: 'contactName', key: 'contactName', width: 20 },
      { header: 'phone', key: 'phone', width: 20 },
      { header: 'email', key: 'email', width: 25 },
      { header: 'address', key: 'address', width: 40 },
      { header: 'status', key: 'status', width: 15 },
      { header: 'settleType', key: 'settleType', width: 15 },
      { header: 'creditDays', key: 'creditDays', width: 12 },
    ];

    it('should successfully import suppliers', async () => {
      const buffer = await createMockExcelFile('Suppliers', supplierColumns, [
        { companyName: 'Supplier A', status: 'active', settleType: 'prepay' },
        {
          companyName: 'Supplier B',
          status: 'active',
          settleType: 'credit',
          creditDays: 30,
        },
      ]);

      mockPrismaService.supplier.findMany.mockResolvedValue([]);
      mockPrismaService.supplier.create.mockResolvedValue({ id: 1 });

      const response = await request(app.getHttpServer())
        .post('/import/suppliers')
        .attach('file', buffer, {
          filename: 'test.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<ImportResultData>;
      // TransformInterceptor wraps response - code can be 0 or status code
      expect([0, 201]).toContain(body.code);
      expect(body.data.successCount).toBe(2);
      expect(body.data.failureCount).toBe(0);
    }, 30000);

    it('should skip existing suppliers instead of reporting as failures', async () => {
      const buffer = await createMockExcelFile('Suppliers', supplierColumns, [
        { companyName: 'Existing Co' },
        { companyName: 'New Co' },
      ]);

      mockPrismaService.supplier.findMany.mockResolvedValue([
        { companyName: 'Existing Co' },
      ]);
      mockPrismaService.supplier.create.mockResolvedValue({ id: 1 });

      const response = await request(app.getHttpServer())
        .post('/import/suppliers')
        .attach('file', buffer, {
          filename: 'test.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<ImportResultData>;
      expect(body.data.successCount).toBe(1);
      expect(body.data.skippedCount).toBe(1);
      expect(body.data.failureCount).toBe(0);
    }, 30000);
  });
});
