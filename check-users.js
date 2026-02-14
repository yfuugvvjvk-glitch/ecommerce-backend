const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    console.log('📋 Utilizatori în baza de date:\n');
    users.forEach(user => {
      console.log(`${user.role === 'admin' ? '👑' : '👤'} ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rol: ${user.role}`);
      console.log('');
    });

    console.log(`Total: ${users.length} utilizatori`);
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
