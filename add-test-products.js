const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestProducts() {
  try {
    console.log('📦 Adăugare produse de test...\n');

    // Găsește admin-ul
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (!admin) {
      console.log('❌ Nu s-a găsit niciun admin');
      return;
    }

    console.log(`✅ Folosesc admin: ${admin.email}`);

    // Găsește o categorie (Lapte)
    let lapteCategory = await prisma.category.findFirst({
      where: { slug: 'lapte' },
    });

    if (!lapteCategory) {
      console.log('Categorie Lapte nu există, o creez...');
      lapteCategory = await prisma.category.create({
        data: {
          name: 'Lapte',
          slug: 'lapte',
          nameRo: 'Lapte',
          nameEn: 'Milk',
          description: 'Produse lactate proaspete',
          icon: '🥛',
          position: 1,
          isActive: true,
        },
      });
    }

    // Găsește categorie Brânză
    let branzaCategory = await prisma.category.findFirst({
      where: { slug: 'branza' },
    });

    if (!branzaCategory) {
      console.log('Categorie Brânză nu există, o creez...');
      branzaCategory = await prisma.category.create({
        data: {
          name: 'Brânză',
          slug: 'branza',
          nameRo: 'Brânză',
          nameEn: 'Cheese',
          description: 'Brânzeturi tradiționale',
          icon: '🧀',
          position: 2,
          isActive: true,
        },
      });
    }

    // Produs 1: Lapte de vacă
    const product1 = await prisma.dataItem.create({
      data: {
        title: 'Lapte de vacă',
        description: 'Lapte proaspăt de la fermă',
        content: 'Lapte de vacă 100% natural, proaspăt de la fermă. Fără conservanți sau aditivi.',
        price: 8.5,
        oldPrice: 10.0,
        stock: 50,
        availableStock: 50,
        lowStockAlert: 10,
        isInStock: true,
        trackInventory: true,
        image: '/images/products/lapte-vaca.jpg',
        categoryId: lapteCategory.id,
        status: 'published',
        rating: 4.5,
        userId: admin.id,
        unitType: 'liter',
        unitName: 'litru',
        priceType: 'per_unit',
        minQuantity: 0.5,
        quantityStep: 0.5,
        allowFractional: true,
        isPerishable: true,
        shelfLifeDays: 7,
        showInCarousel: true,
        carouselOrder: 1,
      },
    });

    console.log(`✅ Creat: ${product1.title}`);

    // Produs 2: Brânză de burduf
    const product2 = await prisma.dataItem.create({
      data: {
        title: 'Brânză de burduf',
        description: 'Brânză tradițională maturată în burduf',
        content: 'Brânză de burduf tradițională, maturată natural. Gust intens și aromat.',
        price: 45.0,
        oldPrice: 50.0,
        stock: 15,
        availableStock: 15,
        lowStockAlert: 5,
        isInStock: true,
        trackInventory: true,
        image: '/images/products/branza-burduf.jpg',
        categoryId: branzaCategory.id,
        status: 'published',
        rating: 5.0,
        userId: admin.id,
        unitType: 'kg',
        unitName: 'kg',
        priceType: 'per_unit',
        minQuantity: 0.25,
        quantityStep: 0.25,
        allowFractional: true,
        isPerishable: true,
        shelfLifeDays: 30,
        showInCarousel: true,
        carouselOrder: 2,
      },
    });

    console.log(`✅ Creat: ${product2.title}`);

    // Adaugă produsele în carousel
    await prisma.carouselItem.create({
      data: {
        type: 'product',
        position: 1,
        productId: product1.id,
        isActive: true,
        createdById: admin.id,
      },
    });

    await prisma.carouselItem.create({
      data: {
        type: 'product',
        position: 2,
        productId: product2.id,
        isActive: true,
        createdById: admin.id,
      },
    });

    console.log('✅ Produse adăugate în carousel');

    console.log('\n📊 Rezumat:');
    console.log(`   - 2 produse create`);
    console.log(`   - 2 items în carousel`);
    console.log(`   - Categorii: Lapte, Brânză`);

  } catch (error) {
    console.error('❌ Eroare:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestProducts();
