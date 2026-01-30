import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateQuoteDto } from './create-quote.dto';

/**
 * Update quote DTO.
 * - customerId and fabricId cannot be changed after creation
 * - All other fields are optional
 * - Only quotes with status 'active' or 'expired' can be updated
 */
export class UpdateQuoteDto extends PartialType(
  OmitType(CreateQuoteDto, ['customerId', 'fabricId'] as const),
) {}
