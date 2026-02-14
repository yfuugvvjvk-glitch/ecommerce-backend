const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupTestUsers() {
  try {
    console.log('🔧 Configurare utilizatori pentru testare chat...\n');
    
    // Resetează parolele utilizatorilor existenți la parole simple
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    console.log(`📋 Găsiți ${users.length} utilizatori în baza de date\n`);
    console.log('═══════════════════════════════════════════════════════════════');

    for (const user of users) {
      let password;
      
      // Setează parole simple bazate pe rol
      if (user.role === 'admin') {
        password = 'admin123';
      } else if (user.role === 'guest') {
        password = 'guest123';
      } else {
        password = 'user123';
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      console.log(`\n✅ ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Parolă: ${password}`);
      console.log(`   👤 Rol: ${user.role}`);
      
      if (user.role === 'guest') {
        console.log(`   ⚠️  ATENȚIE: Acest cont NU are acces la chat!`);
      } else {
        console.log(`   ✅ Are acces la chat`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\n📝 REZUMAT PENTRU TESTARE CHAT:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const chatUsers = users.filter(u => u.role !== 'guest');
    const guestUsers = users.filter(u => u.role === 'guest');

    console.log('✅ CONTURI CU ACCES LA CHAT:');
    chatUsers.forEach(u => {
      const pwd = u.role === 'admin' ? 'admin123' : 'user123';
      console.log(`   ${u.email} / ${pwd}`);
    });

    if (guestUsers.length > 0) {
      console.log('\n❌ CONTURI FĂRĂ ACCES LA CHAT (guest):');
      guestUsers.forEach(u => {
        console.log(`   ${u.email} / guest123 (BLOCAT)`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\n💡 PENTRU TESTARE:');
    console.log('   1. Deschide 2 ferestre de browser (sau 1 normal + 1 incognito)');
    console.log('   2. Autentifică-te cu 2 conturi diferite din lista de mai sus');
    console.log('   3. Creează un chat între ele');
    console.log('   4. Trimite mesaje și verifică că apar în timp real');
    console.log('   5. Încearcă să te autentifici cu guest - nu vei vedea butonul de chat');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestUsers();
