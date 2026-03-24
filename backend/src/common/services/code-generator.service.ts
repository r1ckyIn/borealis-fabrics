import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RedisService } from './redis.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Code type prefixes for different entity types.
 */
export enum CodePrefix {
  FABRIC = 'BF',
  ORDER = 'ORD',
  QUOTE = 'QT',
  // Product code prefixes
  IRON_FRAME = 'TJ',
  MOTOR = 'DJ',
  MATTRESS = 'CD',
  ACCESSORY = 'PJ',
  BUNDLE = 'BD',
}

/**
 * Service for generating unique sequential codes.
 * Uses Redis for atomic increment with DB fallback.
 * Format: {PREFIX}-{YYMM}-{4-digit sequence}
 * Example: QT-2601-0001, BF-2601-0042
 */
@Injectable()
export class CodeGeneratorService {
  private readonly logger = new Logger(CodeGeneratorService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate a unique code for the given type.
   * @param prefix - The code prefix (BF, ORD, QT)
   * @returns The generated code string
   */
  async generateCode(prefix: CodePrefix): Promise<string> {
    const yearMonth = this.getYearMonth();
    const redisKey = `code:${prefix}:${yearMonth}`;

    // Try Redis first
    let sequence = await this.redisService.incr(redisKey);

    if (sequence === null) {
      // Fallback to database
      this.logger.warn(
        `Redis unavailable, falling back to DB for ${prefix} code generation`,
      );
      sequence = await this.getNextSequenceFromDb(prefix, yearMonth);
    }

    // Format: PREFIX-YYMM-NNNN (4-digit padded sequence)
    const paddedSequence = sequence.toString().padStart(4, '0');
    return `${prefix}-${yearMonth}-${paddedSequence}`;
  }

  /**
   * Sync Redis counter from database.
   * Call this when Redis becomes available after downtime.
   */
  async syncFromDatabase(prefix: CodePrefix): Promise<void> {
    const yearMonth = this.getYearMonth();
    const maxSequence = await this.getMaxSequenceFromDb(prefix, yearMonth);

    if (maxSequence > 0) {
      const redisKey = `code:${prefix}:${yearMonth}`;
      await this.redisService.set(redisKey, maxSequence);
      this.logger.log(
        `Synced ${prefix} counter to ${maxSequence} for ${yearMonth}`,
      );
    }
  }

  /**
   * Get the current year-month string (YYMM format).
   */
  private getYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * Get the next sequence number from the database.
   * Uses serializable transaction to prevent race conditions during concurrent access.
   * Note: In high concurrency scenarios, callers should handle unique constraint
   * violations and retry with a new sequence number.
   */
  private async getNextSequenceFromDb(
    prefix: CodePrefix,
    yearMonth: string,
  ): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        const maxSequence = await this.getMaxSequenceFromDbTx(
          tx,
          prefix,
          yearMonth,
        );
        return maxSequence + 1;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  /**
   * Get the maximum sequence number from the database for the given prefix and month.
   * Uses the default Prisma client (non-transactional).
   */
  private async getMaxSequenceFromDb(
    prefix: CodePrefix,
    yearMonth: string,
  ): Promise<number> {
    return this.getMaxSequenceFromDbTx(this.prisma, prefix, yearMonth);
  }

  /**
   * Get the maximum sequence number within a transaction context.
   * @param tx - Prisma transaction client or regular client
   * @param prefix - The code prefix
   * @param yearMonth - The year-month string (YYMM format)
   */
  private async getMaxSequenceFromDbTx(
    tx: Prisma.TransactionClient | PrismaService,
    prefix: CodePrefix,
    yearMonth: string,
  ): Promise<number> {
    // Query the appropriate table based on prefix
    let maxCode: string | null = null;

    switch (prefix) {
      case CodePrefix.FABRIC: {
        const result = await tx.fabric.findFirst({
          where: {
            fabricCode: { startsWith: `${prefix}-${yearMonth}-` },
          },
          orderBy: { fabricCode: 'desc' },
          select: { fabricCode: true },
        });
        maxCode = result?.fabricCode ?? null;
        break;
      }
      case CodePrefix.ORDER: {
        const result = await tx.order.findFirst({
          where: {
            orderCode: { startsWith: `${prefix}-${yearMonth}-` },
          },
          orderBy: { orderCode: 'desc' },
          select: { orderCode: true },
        });
        maxCode = result?.orderCode ?? null;
        break;
      }
      case CodePrefix.QUOTE: {
        const result = await tx.quote.findFirst({
          where: {
            quoteCode: { startsWith: `${prefix}-${yearMonth}-` },
          },
          orderBy: { quoteCode: 'desc' },
          select: { quoteCode: true },
        });
        maxCode = result?.quoteCode ?? null;
        break;
      }
      case CodePrefix.IRON_FRAME:
      case CodePrefix.MOTOR:
      case CodePrefix.MATTRESS:
      case CodePrefix.ACCESSORY: {
        const result = await tx.product.findFirst({
          where: {
            productCode: { startsWith: `${prefix}-${yearMonth}-` },
          },
          orderBy: { productCode: 'desc' },
          select: { productCode: true },
        });
        maxCode = result?.productCode ?? null;
        break;
      }
      case CodePrefix.BUNDLE: {
        const result = await tx.productBundle.findFirst({
          where: {
            bundleCode: { startsWith: `${prefix}-${yearMonth}-` },
          },
          orderBy: { bundleCode: 'desc' },
          select: { bundleCode: true },
        });
        maxCode = result?.bundleCode ?? null;
        break;
      }
      default:
        throw new Error(`Unknown code prefix: ${String(prefix)}`);
    }

    if (!maxCode) {
      return 0;
    }

    // Extract sequence number from code (e.g., "QT-2601-0042" -> 42)
    const parts = maxCode.split('-');
    if (parts.length !== 3) {
      return 0;
    }

    return parseInt(parts[2], 10) || 0;
  }
}
