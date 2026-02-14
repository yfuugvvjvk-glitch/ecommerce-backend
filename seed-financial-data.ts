import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFinancialData() {
  console.log('🌱 Începe popularea bazei de date cu date financiare...');

  try {
    // 1. Verifică dacă există utilizatori
    const users = await prisma.user.findMany({
      where: { role: 'user' }
    });

    if (users.length === 0) {
      console.log('❌ Nu există utilizatori în baza de date. Rulează mai întâi seed-ul principal.');
      return;
    }

    // 2. Verifică dacă există produse
    const products = await prisma.dataItem.findMany({
      where: { status: 'published' }
    });

    if (products.length === 0) {
      console.log('❌ Nu există produse în baza de date. Rulează mai întâi seed-ul principal.');
      return;
    }

    console.log(`✅ Găsite ${users.length} utilizatori și ${products.length} produse`);

    // 3. Creează comenzi pentru ultimele 30 de zile
    const ordersToCreate = 50;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log(`📦 Creează ${ordersToCreate} comenzi...`);

    const statuses = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const statusWeights = [0.2, 0.15, 0.6, 0.05]; // 60% delivered, 20% processing, etc.

    for (let i = 0; i < ordersToCreate; i++) {
      // Generează o dată aleatorie în ultimele 30 de zile
      const randomDate = new Date(
        thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
      );

      // Selectează un utilizator aleatoriu
      const user = users[Math.floor(Math.random() * users.length)];

      // Selectează 1-5 produse aleatorii
      const numProducts = Math.floor(Math.random() * 5) + 1;
      const selectedProducts = [];
      
      for (let j = 0; j < numProducts; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        selectedProducts.push({ product, quantity });
      }

      // Calculează totalul
      const subtotal = selectedProducts.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      const shippingCost = subtotal > 200 ? 0 : 15;
      const total = subtotal + shippingCost;

      // Selectează un status bazat pe ponderări
      let status = 'DELIVERED';
      const rand = Math.random();
      let cumulative = 0;
      for (let k = 0; k < statuses.length; k++) {
        cumulative += statusWeights[k];
        if (rand <= cumulative) {
          status = statuses[k];
          break;
        }
      }

      // Creează comanda
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          total,
          subtotal,
          shippingCost,
          status,
          shippingAddress: `Str. Test ${Math.floor(Math.random() * 100)}, București`,
          deliveryPhone: `07${Math.floor(Math.random() * 100000000)}`,
          deliveryName: user.name,
          paymentMethod: Math.random() > 0.5 ? 'card' : 'cash',
          deliveryMethod: Math.random() > 0.3 ? 'courier' : 'pickup',
          createdAt: randomDate,
          updatedAt: randomDate,
          orderItems: {
            create: selectedProducts.map(item => ({
              dataItemId: item.product.id,
              quantity: item.quantity,
              price: item.product.price
            }))
          }
        }
      });

      // Creează tranzacție cu cardul dacă metoda de plată este card
      if (order.paymentMethod === 'card' && status !== 'CANCELLED') {
        await prisma.cardTransaction.create({
          data: {
            userId: user.id,
            orderId: order.id,
            amount: total,
            type: 'PAYMENT',
            status: 'COMPLETED',
            cardLast4: `${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            cardType: Math.random() > 0.5 ? 'VISA' : 'MASTERCARD',
            description: `Plată comandă #${order.id.substring(0, 8)}`,
            createdAt: randomDate
          }
        });
      }

      if ((i + 1) % 10 === 0) {
        console.log(`   Progres: ${i + 1}/${ordersToCreate} comenzi create`);
      }
    }

    console.log('✅ Comenzi create cu succes!');

    // 4. Actualizează statisticile produselor
    console.log('📊 Actualizează statisticile produselor...');

    for (const product of products) {
      const orderItems = await prisma.orderItem.findMany({
        where: {
          dataItemId: product.id,
          order: {
            status: {
              in: ['DELIVERED', 'PROCESSING', 'SHIPPED']
            }
          }
        }
      });

      const totalSold = orderItems.reduce((sum, item) => sum + item.quantity, 0);

      await prisma.dataItem.update({
        where: { id: product.id },
        data: {
          totalSold,
          stock: Math.max(0, product.stock - totalSold)
        }
      });
    }

    console.log('✅ Statistici produse actualizate!');

    // 5. Creează câteva review-uri
    console.log('⭐ Creează review-uri...');

    const deliveredOrders = await prisma.order.findMany({
      where: { status: 'DELIVERED' },
      include: { orderItems: true },
      take: 20
    });

    for (const order of deliveredOrders) {
      // 70% șansă să lase review
      if (Math.random() > 0.3) {
        for (const item of order.orderItems) {
          // 50% șansă să lase review pentru fiecare produs
          if (Math.random() > 0.5) {
            const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stele
            const comments = [
              'Produs excelent, recomand!',
              'Foarte mulțumit de calitate.',
              'Livrare rapidă, produs conform descrierii.',
              'Calitate bună, raport preț-calitate excelent.',
              'Exact ce căutam, mulțumesc!'
            ];

            try {
              await prisma.review.create({
                data: {
                  userId: order.userId,
                  dataItemId: item.dataItemId,
                  rating,
                  comment: comments[Math.floor(Math.random() * comments.length)]
                }
              });
            } catch (error) {
              // Ignoră erorile de duplicate (utilizatorul a lăsat deja review)
            }
          }
        }
      }
    }

    console.log('✅ Review-uri create!');

    // 6. Actualizează rating-urile produselor
    console.log('📈 Actualizează rating-urile...');

    for (const product of products) {
      const reviews = await prisma.review.findMany({
        where: { dataItemId: product.id }
      });

      if (reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await prisma.dataItem.update({
          where: { id: product.id },
          data: { rating: avgRating }
        });
      }
    }

    console.log('✅ Rating-uri actualizate!');

    // 7. Afișează statistici finale
    const totalOrders = await prisma.order.count();
    const totalRevenue = await prisma.order.aggregate({
      where: {
        status: {
          in: ['DELIVERED', 'PROCESSING', 'SHIPPED']
        }
      },
      _sum: {
        total: true
      }
    });

    const totalTransactions = await prisma.cardTransaction.count({
      where: {
        type: 'PAYMENT',
        status: 'COMPLETED'
      }
    });

    console.log('\n📊 STATISTICI FINALE:');
    console.log(`   Total comenzi: ${totalOrders}`);
    console.log(`   Venituri totale: ${totalRevenue._sum.total?.toFixed(2) || 0} RON`);
    console.log(`   Tranzacții cu cardul: ${totalTransactions}`);
    console.log(`   Produse în catalog: ${products.length}`);
    console.log(`   Clienți activi: ${users.length}`);

    console.log('\n✅ Popularea bazei de date s-a finalizat cu succes!');
    console.log('🎉 Poți accesa rapoartele la: GET /api/admin/reports/financial');

  } catch (error) {
    console.error('❌ Eroare la popularea bazei de date:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Rulează seed-ul
seedFinancialData()
  .catch((error) => {
    console.error('❌ Eroare fatală:', error);
    process.exit(1);
  });
