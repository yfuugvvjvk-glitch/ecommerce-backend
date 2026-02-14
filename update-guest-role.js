const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateGuestRole() {
  try {
    console.log('🔧 Actualizare rol vizitator...');

    // Actualizează contul guest cu rol special
    const guest = await prisma.user.update({
      where: { email: 'guest@example.com' },
      data: { role: 'guest' },
    });

    console.log(`✅ Cont guest actualizat cu rol: ${guest.role}`);
    console.log('   Email:', guest.email);
    console.log('   Nume:', guest.name);

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateGuestRole();
