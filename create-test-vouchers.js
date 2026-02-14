const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestVouchers() {
  try {
    console.log('🎟️ Creez vouchere de test...');

    // Găsește primul admin
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!admin) {
      console.error('❌ Nu există niciun utilizator admin în baza de date!');
      return;
    }

    console.log(`✅ Folosesc adminul: ${admin.email}`);

    // Voucher 1: Discount procentual 20%
    const voucher1 = await prisma.voucher.create({
      data: {
        code: 'DISCOUNT20',
        description: 'Reducere 20% la orice comandă',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minPurchase: 100,
        maxDiscount: 50,
        maxUsage: 100,
        usedCount: 0,
        validUntil: new Date('2025-12-31'),
        isActive: true,
        createdBy: {
          connect: { id: admin.id }
        }
      },
    });

    console.log('✅ Voucher 1 creat:', voucher1.code);

    // Voucher 2: Discount fix 50 RON
    const voucher2 = await prisma.voucher.create({
      data: {
        code: 'SAVE50',
        description: 'Reducere fixă de 50 RON',
        discountType: 'FIXED',
        discountValue: 50,
        minPurchase: 200,
        maxDiscount: null,
        maxUsage: 50,
        usedCount: 0,
        validUntil: new Date('2025-06-30'),
        isActive: true,
        createdBy: {
          connect: { id: admin.id }
        }
      },
    });

    console.log('✅ Voucher 2 creat:', voucher2.code);

    console.log('\n🎉 Vouchere de test create cu succes!');
    console.log('\nDetalii:');
    console.log('1. DISCOUNT20 - 20% reducere (min 100 RON, max 50 RON discount)');
    console.log('2. SAVE50 - 50 RON reducere fixă (min 200 RON)');

  } catch (error) {
    console.error('❌ Eroare la crearea voucherelor:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestVouchers();
