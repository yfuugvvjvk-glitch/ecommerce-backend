const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeContactPage() {
  console.log('🔧 Inițializare pagină Contact...');

  try {
    // Găsește primul admin
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!admin) {
      console.log('❌ Nu există utilizatori admin. Creează un admin mai întâi.');
      return;
    }

    await prisma.page.upsert({
      where: { slug: 'contact' },
      update: {},
      create: {
        title: 'Contact',
        slug: 'contact',
        content: `
          <div class="space-y-6">
            <h2 class="text-2xl font-bold">Contactează-ne</h2>
            <p>Suntem aici să te ajutăm! Contactează-ne prin oricare dintre metodele de mai jos.</p>
          </div>
        `,
        isPublished: true,
        createdById: admin.id
      }
    });

    console.log('✅ Pagină Contact creată cu succes!');
  } catch (error) {
    console.error('❌ Eroare la creare pagină:', error.message);
  }

  await prisma.$disconnect();
}

initializeContactPage()
  .catch((error) => {
    console.error('❌ Eroare:', error);
    process.exit(1);
  });
