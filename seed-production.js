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
      content: 'Răspuns în frecvență: 5 – 20.000 Hz; Microfon bidirectional cu frecvență 100 – 8000 Hz',
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
    {
      title: 'Mașină De Tuns Gazon',
      description: 'Mașina de tuns iarba pe benzina Lehmann Buggle',
      content: 'Ideala pentru gradinile de peste 2.000 m². Cu o latime de taiere de 51 cm si un cos de 60 de litri',
      price: 160,
      oldPrice: 260,
      stock: 46,
      image: '/images/masina.jpg',
      category: 'casa',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'Despicător de busteni',
      description: 'Despicatoarele BRECKNER GERMANY',
      content: 'Model DB 7-52-S, dotat cu un motor electric monofazat de 2000 W, dezvolta pana la 7 tone forta de despicare',
      price: 720,
      oldPrice: null,
      stock: 67,
      image: '/images/despicator.jpg',
      category: 'casa',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'Bancă de exerciții reglabilă',
      description: 'Banca de exercitii reglabila FitTronic B230',
      content: 'Ideala pentru uz casnic, ocupand un loc mic si avand posibilitati multiple de asezare',
      price: 700,
      oldPrice: null,
      stock: 34,
      image: '/images/banca.jpg',
      category: 'sport',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'Set gantere reglabile',
      description: 'Set gantere reglabile BodyFit 30 kg',
      content: 'Formata din doua gantere a cate 15 kg, si o bara cu ajutorul careie se poate face si haltera',
      price: 67,
      oldPrice: 400,
      stock: 5,
      image: '/images/gantere.jpg',
      category: 'sport',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'Bicicletă',
      description: 'Bicicletă pentru copii cu roți ajutătoare',
      content: 'Cadru metalic, dimensiune roti: 12 Inch, roti din cauciuc, spite metalice',
      price: 3,
      oldPrice: null,
      stock: 4,
      image: '/images/bicicleta.jpg',
      category: 'jucari',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'MoYu RS3M 2020',
      description: 'Cub Rubik profesional',
      content: 'MoYu MoFang JiaoShi RS3 M 2020 reprezintă o versiune actualizată a bine-cunoscutului cub MF3RS3',
      price: 10,
      oldPrice: null,
      stock: 67,
      image: '/images/cub.jpg',
      category: 'jucari',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'Chiriașa',
      description: 'Carte thriller psihologic',
      content: 'Când Blake decide să închirieze o cameră în casa sa luxoasă, nu bănuiește că tocmai a deschis ușa celei mai mari greșeli din viața lui',
      price: 34,
      oldPrice: 89,
      stock: 100,
      image: '/images/chiriasa.jpg',
      category: 'carti',
      status: 'published',
      userId: admin.id,
    },
    {
      title: 'Soarele negru',
      description: 'Câștigătoare la Gala Premiilor Literare Bookzone 2025',
      content: 'Cartea Anului 2024',
      price: 34,
      oldPrice: null,
      stock: 54,
      image: '/images/soare.jpg',
      category: 'carti',
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
