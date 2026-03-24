import { PartialType } from '@nestjs/swagger';
import { CreateProductBundleDto } from './create-product-bundle.dto';

/**
 * DTO for updating a product bundle.
 * All fields are optional for partial updates.
 */
export class UpdateProductBundleDto extends PartialType(
  CreateProductBundleDto,
) {}
