import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupplierService } from './supplier.service';

@ApiTags('suppliers')
@Controller('api/v1/suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}
}
