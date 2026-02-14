const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function fixAdminAccount() {
  try {
    console.log('🔧 Corectare cont administrator...');

    // 1. Verifică dacă există admin@site.ro
    let adminSiteRo = await prisma.user.findUnique({
      where: { email: 'admin@site.ro' },
    });

    if (adminSiteRo) {
      console.log('✅ Contul admin@site.ro există deja');
    } else {
      // 2. Șterge admin@example.com dacă există
      const adminExample = await prisma.user.findUnique({
        where: { email: 'admin@example.com' },
      });

      if (adminExample) {
        await prisma.user.delete({
          where: { email: 'admin@example.com' },
        });
        console.log('🗑️  Șters admin@example.com');
      }

      // 3. Creează admin@site.ro
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      adminSiteRo = await prisma.user.create({
        data: {
          email: 'admin@site.ro',
          password: hashedPassword,
          name: 'Administrator',
          role: 'admin',
          phone: null,
          address: null,
          city: null,
          county: null,
          street: null,
          streetNumber: null,
          addressDetails: null,
          locale: 'ro',
        },
      });

      console.log('✅ Cont admin@site.ro creat');
      console.log('   Parolă: admin123');
    }

    // 4. Afișează toate conturile
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
      },
      orderBy: { role: 'desc' },
    });

    console.log('\n📊 Conturi existente:');
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.name} (${user.role})`);
    });

  } catch (error) {
    console.error('❌ Eroare:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminAccount();
