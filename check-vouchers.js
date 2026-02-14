const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVouchers() {
  try {
    console.log('🔍 Verificăm voucherele din baza de date...\n');

    const vouchers = await prisma.voucher.findMany({
      include: {
        createdBy: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    console.log(`📊 Total vouchere găsite: ${vouchers.length}\n`);

    if (vouchers.length === 0) {
      console.log('❌ Nu există vouchere în baza de date!');
    } else {
      vouchers.forEach((v, index) => {
        console.log(`${index + 1}. ${v.code}`);
        console.log(`   Descriere: ${v.description}`);
        console.log(`   Tip: ${v.discountType}`);
        console.log(`   Valoare: ${v.discountValue}`);
        console.log(`   Activ: ${v.isActive ? '✅' : '❌'}`);
        console.log(`   Creat de: ${v.createdBy.email}`);
        console.log(`   Valid până: ${v.validUntil}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVouchers();
