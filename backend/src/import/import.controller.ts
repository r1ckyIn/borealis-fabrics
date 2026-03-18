import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ImportService } from './import.service';
import { ImportResultDto } from './dto';

/**
 * Maximum file size: 10MB
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Valid Excel MIME types
 */
const VALID_XLSX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream', // Some browsers/clients send this
];

/**
 * XLSX magic bytes (ZIP signature since XLSX is a ZIP archive)
 */
const XLSX_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * Custom file validator for Excel files
 * Checks both MIME type and file extension, plus validates magic bytes
 */
class ExcelFileValidator extends FileValidator {
  isValid(file: Express.Multer.File): boolean {
    if (!file) return false;

    // Check file extension
    const hasValidExtension = file.originalname
      ?.toLowerCase()
      .endsWith('.xlsx');

    // Check MIME type (allow octet-stream for test environments)
    const hasValidMimeType = VALID_XLSX_MIME_TYPES.includes(file.mimetype);

    // Check magic bytes (XLSX is a ZIP file)
    const hasValidMagicBytes =
      file.buffer &&
      file.buffer.length >= 4 &&
      file.buffer.slice(0, 4).equals(XLSX_MAGIC_BYTES);

    // Accept if it has valid extension AND (valid MIME type OR valid magic bytes)
    return hasValidExtension && (hasValidMimeType || hasValidMagicBytes);
  }

  buildErrorMessage(): string {
    return 'Invalid file type';
  }
}

@ApiTags('Import')
@Controller('api/v1/import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * 3.4.3 Download fabric import template
   */
  @Get('templates/fabrics')
  @ApiOperation({ summary: 'Download fabric import template' })
  @ApiResponse({
    status: 200,
    description: 'Excel template file',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async downloadFabricTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.importService.generateFabricTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=fabric_import_template.xlsx',
    );
    res.send(buffer);
  }

  /**
   * 3.4.4 Download supplier import template
   */
  @Get('templates/suppliers')
  @ApiOperation({ summary: 'Download supplier import template' })
  @ApiResponse({
    status: 200,
    description: 'Excel template file',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async downloadSupplierTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.importService.generateSupplierTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=supplier_import_template.xlsx',
    );
    res.send(buffer);
  }

  /**
   * 3.4.1 Import fabrics from Excel
   */
  @Post('fabrics')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import fabrics from Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import result',
    type: ImportResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async importFabrics(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new ExcelFileValidator({}),
        ],
        fileIsRequired: true,
        exceptionFactory: (error) => {
          if (error === 'File is required') {
            return new BadRequestException('File is required');
          }
          if (error.includes('size')) {
            return new BadRequestException('File size exceeds 10MB limit');
          }
          if (error.includes('type') || error.includes('Validation failed')) {
            return new BadRequestException(
              'Invalid file type. Only .xlsx files are allowed',
            );
          }
          return new BadRequestException(error);
        },
      }),
    )
    file: Express.Multer.File,
  ): Promise<ImportResultDto> {
    return this.importService.importFabrics(file);
  }

  /**
   * 3.4.2 Import suppliers from Excel
   */
  @Post('suppliers')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import suppliers from Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import result',
    type: ImportResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async importSuppliers(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new ExcelFileValidator({}),
        ],
        fileIsRequired: true,
        exceptionFactory: (error) => {
          if (error === 'File is required') {
            return new BadRequestException('File is required');
          }
          if (error.includes('size')) {
            return new BadRequestException('File size exceeds 10MB limit');
          }
          if (error.includes('type') || error.includes('Validation failed')) {
            return new BadRequestException(
              'Invalid file type. Only .xlsx files are allowed',
            );
          }
          return new BadRequestException(error);
        },
      }),
    )
    file: Express.Multer.File,
  ): Promise<ImportResultDto> {
    return this.importService.importSuppliers(file);
  }
}
