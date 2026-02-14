const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedUIElements() {
  try {
    console.log('🌱 Seeding UI Elements...');

    // Găsește un admin user pentru createdById
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      return;
    }

    // Șterge elementele UI existente (opțional)
    await prisma.uIElement.deleteMany({});
    console.log('🗑️  Cleared existing UI elements');

    // Creează butonul de Chat AI
    const chatButton = await prisma.uIElement.create({
      data: {
        type: 'button',
        label: 'Chat AI',
        icon: '💬',
        position: 'floating',
        page: ['all'],
        order: 1,
        size: 'large',
        color: '#10B981',
        isVisible: true,
        action: '/chat',
        settings: JSON.stringify({
          tooltip: 'Deschide chat-ul AI',
          animation: 'bounce'
        }),
        createdById: adminUser.id
      }
    });

    console.log('✅ Created Chat AI button:', chatButton.id);

    // Creează butonul de Contact
    const contactButton = await prisma.uIElement.create({
      data: {
        type: 'button',
        label: 'Contact',
        icon: '📞',
        position: 'header',
        page: ['all'],
        order: 2,
        size: 'medium',
        color: '#3B82F6',
        isVisible: true,
        action: '/contact',
        settings: JSON.stringify({
          tooltip: 'Contactează-ne'
        }),
        createdById: adminUser.id
      }
    });

    console.log('✅ Created Contact button:', contactButton.id);

    // Creează banner-ul de oferte
    const offersBanner = await prisma.uIElement.create({
      data: {
        type: 'banner',
        label: 'Oferte Speciale',
        icon: '🎁',
        position: 'header',
        page: ['home', 'shop'],
        order: 3,
        size: 'large',
        color: '#EF4444',
        isVisible: true,
        action: '/offers',
        settings: JSON.stringify({
          displayDuration: 5000,
          autoClose: false
        }),
        createdById: adminUser.id
      }
    });

    console.log('✅ Created Offers banner:', offersBanner.id);

    console.log('\n🎉 UI Elements seeded successfully!');
    console.log(`Total elements created: 3`);

  } catch (error) {
    console.error('❌ Error seeding UI elements:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedUIElements();
