const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Chat Normal UI Element...');

  // Găsește un admin pentru createdById
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' }
  });

  if (!admin) {
    console.error('❌ No admin user found. Please create an admin user first.');
    return;
  }

  // Verifică dacă elementul există deja
  const existing = await prisma.uIElement.findFirst({
    where: { label: 'Chat Utilizatori' }
  });

  if (existing) {
    console.log('✅ Chat Utilizatori UI element already exists:', existing.id);
    return;
  }

  // Creează elementul UI pentru Chat Normal
  const chatElement = await prisma.uIElement.create({
    data: {
      type: 'button',
      label: 'Chat Utilizatori',
      icon: '💬',
      position: 'floating',
      page: ['all'],
      order: 1,
      size: 'medium',
      color: '#16A34A', // Verde (green-600)
      isVisible: true,
      createdById: admin.id
    }
  });

  console.log('✅ Chat Utilizatori UI element created:', chatElement.id);
  console.log('📋 Element details:', {
    label: chatElement.label,
    icon: chatElement.icon,
    color: chatElement.color,
    isVisible: chatElement.isVisible
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
