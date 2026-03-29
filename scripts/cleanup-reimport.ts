import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Find fabrics with auto-generated codes from the prep script (e.g. BY-001, DAVIS-027)
    const count = await prisma.fabric.count({
      where: {
        fabricCode: {
          // Match pattern: 2-5 letter abbreviation + dash + 3 digits
          contains: '-',
        },
        createdAt: {
          gte: new Date('2026-03-27T00:00:00Z'),
        },
      },
    });
    
    console.log(`Found ${count} fabrics imported today with auto-generated codes`);
    
    if (count > 0) {
      // Delete supplier-fabric relations first (foreign key constraint)
      const deletedRelations = await prisma.supplierFabric.deleteMany({
        where: {
          fabric: {
            fabricCode: { contains: '-' },
            createdAt: { gte: new Date('2026-03-27T00:00:00Z') },
          },
        },
      });
      console.log(`Deleted ${deletedRelations.count} supplier-fabric relations`);
      
      // Delete customer pricings
      const deletedPricings = await prisma.customerFabricPricing.deleteMany({
        where: {
          fabric: {
            fabricCode: { contains: '-' },
            createdAt: { gte: new Date('2026-03-27T00:00:00Z') },
          },
        },
      });
      console.log(`Deleted ${deletedPricings.count} customer pricings`);
      
      // Delete the fabrics
      const deleted = await prisma.fabric.deleteMany({
        where: {
          fabricCode: { contains: '-' },
          createdAt: { gte: new Date('2026-03-27T00:00:00Z') },
        },
      });
      console.log(`Deleted ${deleted.count} fabrics`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
