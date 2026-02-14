const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteGuest() {
  try {
    console.log('🗑️  Ștergere cont guest...');

    // Șterge contul guest
    const result = await prisma.user.deleteMany({
      where: { email: 'guest@example.com' },
    });

    if (result.count > 0) {
      console.log('✅ Cont guest șters');
    } else {
      console.log('ℹ️  Contul guest nu există');
    }

    // Afișează conturile rămase
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
      },
      orderBy: { role: 'desc' },
    });

    console.log('\n📊 Conturi rămase:');
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.name} (${user.role})`);
    });

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteGuest();
