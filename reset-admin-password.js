const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔄 Resetare parolă pentru admin...');
    
    // Hash-uiește parola "admin123"
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Actualizează parola pentru admin
    const result = await prisma.user.update({
      where: {
        email: 'admin@site.ro'
      },
      data: {
        password: hashedPassword
      }
    });

    console.log('✅ Parola pentru admin@site.ro a fost resetată la: admin123');
    console.log(`   User: ${result.name} (${result.email})`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
