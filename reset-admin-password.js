const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔐 Resetare parolă admin...\n');

    const email = 'crys.cristi@yahoo.com';
    const newPassword = 'admin123'; // Parolă simplă pentru test

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    console.log('✅ Parolă resetată cu succes!\n');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Parolă nouă: ${newPassword}`);
    console.log(`👤 Nume: ${user.name}`);
    console.log(`👑 Rol: ${user.role}\n`);
    console.log('💡 Acum poți să te autentifici cu aceste credențiale!');

  } catch (error) {
    console.error('❌ Eroare:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
