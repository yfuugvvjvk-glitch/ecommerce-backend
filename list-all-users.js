const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listAllUsers() {
  try {
    console.log('📋 Lista utilizatori din baza de date:\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        role: 'asc'
      }
    });

    if (users.length === 0) {
      console.log('❌ Nu există utilizatori în baza de date');
      return;
    }

    console.log(`✅ Total utilizatori: ${users.length}\n`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Parolă: [Vezi mai jos pentru parole standard]`);
      console.log(`   👤 Rol: ${user.role}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   📅 Creat: ${user.createdAt.toLocaleDateString('ro-RO')}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\n🔐 PAROLE STANDARD (pentru testare):');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📌 ADMIN:');
    console.log('   Email: crys.cristi@yahoo.com');
    console.log('   Parolă: admin123');
    console.log('   Rol: admin');
    
    console.log('\n📌 GUEST (VIZITATOR - FĂRĂ ACCES LA CHAT):');
    console.log('   Email: guest@example.com');
    console.log('   Parolă: guest123');
    console.log('   Rol: guest');
    console.log('   ⚠️  Acest cont NU are acces la chat!');
    
    console.log('\n📌 UTILIZATORI NORMALI (cu acces la chat):');
    console.log('   Pentru utilizatorii cu rol "user", parolele standard sunt:');
    console.log('   - user123');
    console.log('   - password123');
    console.log('   - test123');
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\n💡 NOTĂ: Dacă nu poți intra cu parolele de mai sus,');
    console.log('   rulează: node backend/reset-user-password.js <email> <parola_noua>');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Grupează utilizatorii pe roluri
    const byRole = users.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});

    console.log('\n📊 STATISTICI PE ROLURI:');
    console.log('═══════════════════════════════════════════════════════════════');
    Object.entries(byRole).forEach(([role, roleUsers]) => {
      console.log(`\n${role.toUpperCase()}: ${roleUsers.length} utilizatori`);
      roleUsers.forEach(u => console.log(`   - ${u.name} (${u.email})`));
    });
    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllUsers();
