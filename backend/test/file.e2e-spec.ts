import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FileModule } from '../src/file/file.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createMockCls } from './helpers/mock-builders';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

// Response type definitions for type safety
interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface ApiErrorResponse {
  code: number;
  message: string;
  path: string;
  timestamp: string;
}

interface FileData {
  id: number;
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

describe('FileController (e2e)', () => {
  let app: INestApplication<App>;

  // Mock data
  const mockFile = {
    id: 1,
    key: 'test-uuid-1234.png',
    url: 'http://localhost:3000/uploads/test-uuid-1234.png',
    originalName: 'test-image.png',
    mimeType: 'image/png',
    size: 1024,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  // Define mock service type for better type safety
  interface MockFileMethods {
    create: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
  }

  interface MockPrismaServiceType {
    file: MockFileMethods;
  }

  const mockPrismaService: MockPrismaServiceType = {
    file: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'UPLOAD_DIR') return '/tmp/test-uploads';
      if (key === 'BASE_URL') return 'http://localhost:3000';
      return null;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FileModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes and filters as in AppModule
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(createMockCls()));
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // POST /api/v1/files - Upload File
  // ============================================================
  describe('POST /api/v1/files', () => {
    it('should upload a file successfully', async () => {
      mockPrismaService.file.create.mockResolvedValue(mockFile);

      const response = await request(app.getHttpServer())
        .post('/api/v1/files')
        .attach('file', Buffer.from('test image content'), {
          filename: 'test-image.png',
          contentType: 'image/png',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FileData>;
      expect(body.code).toBe(201);
      expect(body.message).toBe('success');
      expect(body.data.originalName).toBe('test-image.png');
      expect(body.data.mimeType).toBe('image/png');
    });

    it('should upload a PDF file successfully', async () => {
      const pdfFile = {
        ...mockFile,
        key: 'test-uuid-pdf.pdf',
        url: 'http://localhost:3000/uploads/test-uuid-pdf.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
      };
      mockPrismaService.file.create.mockResolvedValue(pdfFile);

      const response = await request(app.getHttpServer())
        .post('/api/v1/files')
        .attach('file', Buffer.from('pdf content'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FileData>;
      expect(body.code).toBe(201);
      expect(body.data.mimeType).toBe('application/pdf');
    });

    it('should upload an Excel file successfully', async () => {
      const excelFile = {
        ...mockFile,
        key: 'test-uuid-excel.xlsx',
        url: 'http://localhost:3000/uploads/test-uuid-excel.xlsx',
        originalName: 'spreadsheet.xlsx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      mockPrismaService.file.create.mockResolvedValue(excelFile);

      const response = await request(app.getHttpServer())
        .post('/api/v1/files')
        .attach('file', Buffer.from('excel content'), {
          filename: 'spreadsheet.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FileData>;
      expect(body.code).toBe(201);
      expect(body.data.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files')
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
      expect(body.message).toContain('No file provided');
    });

    it('should return 400 for invalid MIME type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files')
        .attach('file', Buffer.from('executable content'), {
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
      expect(body.message).toContain('Invalid file type');
    });

    it('should return 400 for text/plain MIME type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files')
        .attach('file', Buffer.from('plain text'), {
          filename: 'readme.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
      expect(body.message).toContain('Invalid file type');
    });

    it('should accept all allowed image types', async () => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      for (const mimeType of imageTypes) {
        mockPrismaService.file.create.mockResolvedValue({
          ...mockFile,
          mimeType,
        });

        const ext = mimeType.split('/')[1];
        const response = await request(app.getHttpServer())
          .post('/api/v1/files')
          .attach('file', Buffer.from('image content'), {
            filename: `test.${ext}`,
            contentType: mimeType,
          })
          .expect(201);

        const body = response.body as ApiSuccessResponse<FileData>;
        expect(body.code).toBe(201);
      }
    });
  });

  // ============================================================
  // GET /api/v1/files/:id - Get File by ID
  // ============================================================
  describe('GET /api/v1/files/:id', () => {
    it('should return a file when found', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/1')
        .expect(200);

      const body = response.body as ApiSuccessResponse<FileData>;
      expect(body.code).toBe(200);
      expect(body.message).toBe('success');
      expect(body.data.id).toBe(1);
      expect(body.data.key).toBe('test-uuid-1234.png');
      expect(body.data.originalName).toBe('test-image.png');
    });

    it('should return 404 when file not found', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/999')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
      expect(body.message).toContain('not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/files/invalid')
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });

    it('should return 404 for negative ID (treated as non-existent)', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/-1')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
    });
  });

  // ============================================================
  // DELETE /api/v1/files/:id - Delete File
  // ============================================================
  describe('DELETE /api/v1/files/:id', () => {
    it('should delete a file successfully', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.file.delete.mockResolvedValue(mockFile);

      await request(app.getHttpServer()).delete('/api/v1/files/1').expect(204);

      expect(mockPrismaService.file.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.file.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return 404 when file not found', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/files/999')
        .expect(404);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(404);
      expect(body.message).toContain('not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/files/invalid')
        .expect(400);

      const body = response.body as ApiErrorResponse;
      expect(body.code).toBe(400);
    });
  });

  // ============================================================
  // Response Format Validation
  // ============================================================
  describe('Response Format', () => {
    it('should wrap successful response with code, message, and data', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/1')
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('message', 'success');
      expect(response.body).toHaveProperty('data');
    });

    it('should wrap error response with code, message, path, and timestamp', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/files/999')
        .expect(404);

      expect(response.body).toHaveProperty('code', 404);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include file metadata in upload response', async () => {
      mockPrismaService.file.create.mockResolvedValue(mockFile);

      const response = await request(app.getHttpServer())
        .post('/api/v1/files')
        .attach('file', Buffer.from('test content'), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(201);

      const body = response.body as ApiSuccessResponse<FileData>;
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('key');
      expect(body.data).toHaveProperty('url');
      expect(body.data).toHaveProperty('originalName');
      expect(body.data).toHaveProperty('mimeType');
      expect(body.data).toHaveProperty('size');
    });
  });
});
