import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto';
import { Supplier } from '@prisma/client';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new supplier.
   * Throws ConflictException if companyName already exists.
   */
  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Check for duplicate companyName
    const existing = await this.prisma.supplier.findFirst({
      where: { companyName: createSupplierDto.companyName },
    });

    if (existing) {
      throw new ConflictException(
        `Supplier with company name "${createSupplierDto.companyName}" already exists`,
      );
    }

    return this.prisma.supplier.create({
      data: createSupplierDto,
    });
  }
}
