const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin1234', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Administrator',
      phone: '+40745123456',
      address: 'Galați, Romania',
      role: 'admin',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create categories
  const categories = [
    { name: 'Electronice', slug: 'electronice', nameRo: 'Electronice', nameEn: 'Electronics', icon: '💻' },
    { name: 'Fashion', slug: 'fashion', nameRo: 'Modă', nameEn: 'Fashion', icon: '👔' },
    { name: 'Casă & Grădină', slug: 'casa', nameRo: 'Casă & Grădină', nameEn: 'Home & Garden', icon: '🏡' },
    { name: 'Sport', slug: 'sport', nameRo: 'Sport', nameEn: 'Sports', icon: '⚽' },
    { name: 'Jucării', slug: 'jucari', nameRo: 'Jucării', nameEn: 'Toys', icon: '🧸' },
    { name: 'Cărți', slug: 'carti', nameRo: 'Cărți', nameEn: 'Books', icon: '📚' },
  ];

  const createdCategories = {};
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    createdCategories[category.slug] = created;
  }

  console.log(`✅ Created ${categories.length} categories`);

  // Create sample products
  const products = [
    {
      title: 'Laptop',
      description: 'Display 13.6-inch (2560 x 1664) Liquid Retina display',
      content: 'Processor Apple M2, Graphics 8-core or 10-core Apple GPU, RAM 8GB/16GB',
      price: 10,
      oldPrice: 30,
      stock: 30,
      image: '/images/laptop.jpg',
      category: 'electronice',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'Căștile de gaming',
      description: 'Difuzor de 40 mm din magnet neodim, diafragmă film PET',
      content: 'Răspuns în frecvență: 5 – 20.000 Hz',
      price: 20,
      oldPrice: 80,
      stock: 80,
      image: '/images/casti.jpg',
      category: 'electronice',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'Cămașă de bărbați',
      description: 'Compoziție: 35% bumbac, poliester',
      content: 'Mărime XS, M, L, XL disponibile',
      price: 62.29,
      oldPrice: 88.99,
      stock: 76,
      image: '/images/camasa.jpg',
      category: 'fashion',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'Rochie Guess',
      description: 'Mărime M, Culoare Roșu',
      content: 'Rochie elegantă pentru ocazii speciale',
      price: 34,
      oldPrice: null,
      stock: 45,
      image: '/images/rochie.jpg',
      category: 'fashion',
      status: 'published',
      userId: admin.id,
    },
  ];

  // Check if products already exist
  const existingProducts = await prisma.dataItem.count();
  
  if (existingProducts === 0) {
    for (const product of products) {
      const { category, ...productData } = product;
      const categoryId = createdCategories[category]?.id;
      
      if (!categoryId) continue;
      
      await prisma.dataItem.create({
        data: {
          ...productData,
          categoryId,
        },
      });
    }
    console.log(`✅ Created ${products.length} sample products`);
  } else {
    console.log(`ℹ️  Products already exist, skipping...`);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n👤 Admin Credentials:');
  console.log('   Email: admin@example.com');
  console.log('   Password: Admin1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
