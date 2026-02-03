import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLogisticsDto } from './create-logistics.dto';

export class UpdateLogisticsDto extends PartialType(
  OmitType(CreateLogisticsDto, ['orderItemId'] as const),
) {}
