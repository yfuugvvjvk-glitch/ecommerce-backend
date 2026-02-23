const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetGuestPassword() {
  try {
    console.log('🔄 Resetare parolă pentru guest...');
    
    // Hash-uiește parola "guest123"
    const hashedPassword = await bcrypt.hash('guest123', 10);
    
    // Actualizează parola pentru guest
    const result = await prisma.user.update({
      where: {
        email: 'guest@example.com'
      },
      data: {
        password: hashedPassword
      }
    });

    console.log('✅ Parola pentru guest@example.com a fost resetată la: guest123');
    console.log(`   User: ${result.name} (${result.email})`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetGuestPassword();
