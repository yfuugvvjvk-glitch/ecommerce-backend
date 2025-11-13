import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  const createdCategories: any = {};
  for (const category of categories) {
    const created = await prisma.category.create({ data: category });
    createdCategories[category.slug] = created;
  }

  console.log(`✅ Created ${categories.length} categories`);

  // Create sample products (from your PHP code)
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
      content: 'Răspuns în frecvență: 5 – 20.000 Hz; Microfon bidirectional cu frecvență 100 – 8000 Hz; Conectivitate: wireless pe 2.4 GHz prin adaptor pe USB-A, Bluetooth 5.0',
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

  for (const product of products) {
    const { category, ...productData } = product;
    const categoryId = createdCategories[category]?.id;
    
    if (!categoryId) {
      console.warn(`⚠️ Category '${category}' not found for product '${product.title}'`);
      continue;
    }
    
    await prisma.dataItem.create({
      data: {
        ...productData,
        categoryId,
      },
    });
  }

  console.log(`✅ Created ${products.length} sample products`);

  // Create additional users
  const users = [
    {
      email: 'ion.popescu@example.com',
      password: await bcrypt.hash('User1234', 10),
      name: 'Ion Popescu',
      phone: '+40745234567',
      address: 'Str. Mihai Eminescu nr. 15, București',
      role: 'user',
    },
    {
      email: 'maria.ionescu@example.com',
      password: await bcrypt.hash('User1234', 10),
      name: 'Maria Ionescu',
      phone: '+40756345678',
      address: 'Str. George Coșbuc nr. 23, Cluj-Napoca',
      role: 'user',
    },
    {
      email: 'andrei.popa@example.com',
      password: await bcrypt.hash('User1234', 10),
      name: 'Andrei Popa',
      phone: '+40767456789',
      address: 'Bd. Independenței nr. 45, Timișoara',
      role: 'user',
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    createdUsers.push(user);
  }

  console.log(`✅ Created ${createdUsers.length} additional users`);

  // Get all products
  const allProducts = await prisma.dataItem.findMany();

  // Create reviews
  const reviews = [
    {
      rating: 5,
      comment: 'Laptop excelent! Performanță foarte bună și design elegant.',
      userId: createdUsers[0].id,
      dataItemId: allProducts[0].id,
    },
    {
      rating: 4,
      comment: 'Căștile sunt bune, sunet clar. Doar bateria ar putea dura mai mult.',
      userId: createdUsers[1].id,
      dataItemId: allProducts[1].id,
    },
    {
      rating: 5,
      comment: 'Cămașa este de calitate superioară, material plăcut.',
      userId: createdUsers[2].id,
      dataItemId: allProducts[2].id,
    },
    {
      rating: 3,
      comment: 'Rochie frumoasă dar mărimea nu corespunde exact.',
      userId: createdUsers[0].id,
      dataItemId: allProducts[3].id,
    },
    {
      rating: 5,
      comment: 'Mașina de tuns gazon funcționează perfect! Recomand!',
      userId: createdUsers[1].id,
      dataItemId: allProducts[4].id,
    },
  ];

  for (const review of reviews) {
    await prisma.review.create({ data: review });
  }

  console.log(`✅ Created ${reviews.length} reviews`);

  // Create favorites
  const favorites = [
    { userId: createdUsers[0].id, dataItemId: allProducts[0].id },
    { userId: createdUsers[0].id, dataItemId: allProducts[6].id },
    { userId: createdUsers[1].id, dataItemId: allProducts[1].id },
    { userId: createdUsers[1].id, dataItemId: allProducts[10].id },
    { userId: createdUsers[2].id, dataItemId: allProducts[2].id },
    { userId: createdUsers[2].id, dataItemId: allProducts[8].id },
  ];

  for (const favorite of favorites) {
    await prisma.favorite.create({ data: favorite });
  }

  console.log(`✅ Created ${favorites.length} favorites`);

  // Create offers
  const offers = [
    {
      title: 'Black Friday - Electronice',
      description: 'Reduceri masive la toate produsele electronice! Până la 50% discount!',
      image: '/images/offers/black-friday-electronics.jpg',
      discount: 30,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      active: true,
    },
    {
      title: 'Ofertă Fashion',
      description: 'Colecția de primăvară cu reduceri de până la 40%',
      image: '/images/offers/fashion-spring.jpg',
      discount: 25,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      active: true,
    },
    {
      title: 'Sport & Fitness',
      description: 'Echipamente sportive la prețuri speciale!',
      image: '/images/offers/sport-fitness.jpg',
      discount: 20,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      active: true,
    },
  ];

  const createdOffers = [];
  for (const offer of offers) {
    const createdOffer = await prisma.offer.create({ data: offer });
    createdOffers.push(createdOffer);
  }

  console.log(`✅ Created ${createdOffers.length} offers`);

  // Link products to offers
  const productOffers = [
    // Electronics offer - Laptop and Headphones
    { dataItemId: allProducts[0].id, offerId: createdOffers[0].id },
    { dataItemId: allProducts[1].id, offerId: createdOffers[0].id },
    // Fashion offer - Shirt and Dress
    { dataItemId: allProducts[2].id, offerId: createdOffers[1].id },
    { dataItemId: allProducts[3].id, offerId: createdOffers[1].id },
    // Sport offer - Bench and Dumbbells
    { dataItemId: allProducts[6].id, offerId: createdOffers[2].id },
    { dataItemId: allProducts[7].id, offerId: createdOffers[2].id },
  ];

  for (const productOffer of productOffers) {
    await prisma.productOffer.create({ data: productOffer });
  }

  console.log(`✅ Linked ${productOffers.length} products to offers`);

  // Create vouchers
  const vouchers = [
    {
      code: 'WELCOME10',
      description: 'Voucher de bun venit - 10% reducere',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxUsage: 100,
      usedCount: 0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      isActive: true,
      createdById: admin.id,
    },
    {
      code: 'SUMMER50',
      description: 'Reducere de vară - 50 RON',
      discountType: 'FIXED',
      discountValue: 50,
      maxUsage: 50,
      usedCount: 0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true,
      createdById: admin.id,
    },
  ];

  for (const voucher of vouchers) {
    await prisma.voucher.create({ data: voucher });
  }

  console.log(`✅ Created ${vouchers.length} vouchers`);

  // Create voucher requests
  const voucherRequests = [
    {
      userId: createdUsers[0].id,
      description: 'Aș dori un voucher pentru că sunt client fidel de 2 ani.',
      status: 'PENDING',
    },
    {
      userId: createdUsers[1].id,
      description: 'Am avut o problemă cu ultima comandă, aș aprecia un voucher compensatoriu.',
      status: 'APPROVED',
    },
    {
      userId: createdUsers[2].id,
      description: 'Vreau voucher gratuit.',
      status: 'REJECTED',
    },
  ];

  for (const request of voucherRequests) {
    await prisma.voucherRequest.create({ data: request });
  }

  console.log(`✅ Created ${voucherRequests.length} voucher requests`);

  // Create orders
  const orders = [
    {
      userId: createdUsers[0].id,
      total: 730,
      status: 'DELIVERED',
      shippingAddress: 'Str. Mihai Eminescu nr. 15, București',
      deliveryPhone: '+40745234567',
      deliveryName: 'Ion Popescu',
      paymentMethod: 'CARD',
      orderItems: {
        create: [
          {
            dataItemId: allProducts[0].id,
            quantity: 1,
            price: allProducts[0].price,
          },
          {
            dataItemId: allProducts[6].id,
            quantity: 1,
            price: allProducts[6].price,
          },
        ],
      },
    },
    {
      userId: createdUsers[1].id,
      total: 20,
      status: 'PROCESSING',
      shippingAddress: 'Str. George Coșbuc nr. 23, Cluj-Napoca',
      deliveryPhone: '+40756345678',
      deliveryName: 'Maria Ionescu',
      paymentMethod: 'CASH_ON_DELIVERY',
      orderItems: {
        create: [
          {
            dataItemId: allProducts[1].id,
            quantity: 1,
            price: allProducts[1].price,
          },
        ],
      },
    },
    {
      userId: createdUsers[2].id,
      total: 65.29,
      status: 'DELIVERED',
      shippingAddress: 'Bd. Independenței nr. 45, Timișoara',
      deliveryPhone: '+40767456789',
      deliveryName: 'Andrei Popa',
      paymentMethod: 'CARD',
      orderItems: {
        create: [
          {
            dataItemId: allProducts[2].id,
            quantity: 1,
            price: allProducts[2].price,
          },
          {
            dataItemId: allProducts[9].id,
            quantity: 1,
            price: allProducts[9].price,
          },
        ],
      },
    },
    {
      userId: createdUsers[0].id,
      total: 68,
      status: 'SHIPPING',
      shippingAddress: 'Str. Mihai Eminescu nr. 15, București',
      deliveryPhone: '+40745234567',
      deliveryName: 'Ion Popescu',
      paymentMethod: 'CASH_ON_DELIVERY',
      orderItems: {
        create: [
          {
            dataItemId: allProducts[10].id,
            quantity: 2,
            price: allProducts[10].price,
          },
        ],
      },
    },
  ];

  for (const order of orders) {
    await prisma.order.create({
      data: order,
    });
  }

  console.log(`✅ Created ${orders.length} orders`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Database Summary:');
  console.log(`   - Users: ${createdUsers.length + 1} (including admin)`);
  console.log(`   - Products: ${allProducts.length}`);
  console.log(`   - Reviews: ${reviews.length}`);
  console.log(`   - Favorites: ${favorites.length}`);
  console.log(`   - Orders: ${orders.length}`);
  console.log(`   - Offers: ${createdOffers.length}`);
  console.log(`   - Vouchers: ${vouchers.length}`);
  console.log(`   - Voucher Requests: ${voucherRequests.length}`);
  console.log('\n👤 Test Credentials:');
  console.log('   Admin: admin@example.com / Admin1234');
  console.log('   User 1: ion.popescu@example.com / User1234');
  console.log('   User 2: maria.ionescu@example.com / User1234');
  console.log('   User 3: andrei.popa@example.com / User1234');
  console.log('\n🎟️  Test Vouchers:');
  console.log('   WELCOME10 - 10% discount');
  console.log('   SUMMER50 - 50 RON discount');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
