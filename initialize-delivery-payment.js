const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeDeliveryPayment() {
  console.log('🔧 Inițializare metode de livrare și plată...');

  // Metode de livrare implicite
  const deliveryMethods = [
    {
      name: 'Livrare Standard',
      deliveryCost: 15,
      freeDeliveryThreshold: 100,
      isActive: true,
      deliveryTimeHours: 24,
      deliveryTimeDays: 1
    },
    {
      name: 'Livrare Rapidă',
      deliveryCost: 25,
      freeDeliveryThreshold: 200,
      isActive: true,
      deliveryTimeHours: 12,
      deliveryTimeDays: 0
    },
    {
      name: 'Ridicare din Magazin',
      deliveryCost: 0,
      isActive: true,
      deliveryTimeHours: 2,
      deliveryTimeDays: 0
    }
  ];

  // Metode de plată implicite
  const paymentMethods = [
    {
      name: 'Card Bancar',
      type: 'card',
      description: 'Plată securizată cu cardul bancar',
      isActive: true,
      icon: '💳'
    },
    {
      name: 'Numerar la Livrare',
      type: 'cash',
      description: 'Plată cash la primirea comenzii',
      isActive: true,
      icon: '💵'
    },
    {
      name: 'Transfer Bancar',
      type: 'bank_transfer',
      description: 'Transfer bancar în contul companiei',
      isActive: true,
      icon: '🏦'
    }
  ];

  try {
    // Creează metode de livrare
    for (const method of deliveryMethods) {
      const existing = await prisma.deliverySettings.findFirst({
        where: { name: method.name }
      });

      if (!existing) {
        await prisma.deliverySettings.create({
          data: method
        });
        console.log(`✅ Metodă de livrare creată: ${method.name}`);
      } else {
        console.log(`ℹ️  Metodă de livrare există deja: ${method.name}`);
      }
    }

    // Creează metode de plată
    for (const method of paymentMethods) {
      const existing = await prisma.paymentMethod.findFirst({
        where: { name: method.name }
      });

      if (!existing) {
        await prisma.paymentMethod.create({
          data: method
        });
        console.log(`✅ Metodă de plată creată: ${method.name}`);
      } else {
        console.log(`ℹ️  Metodă de plată există deja: ${method.name}`);
      }
    }

    console.log('✅ Metode de livrare și plată inițializate cu succes!');
  } catch (error) {
    console.error('❌ Eroare:', error.message);
  }

  await prisma.$disconnect();
}

initializeDeliveryPayment()
  .catch((error) => {
    console.error('❌ Eroare:', error);
    process.exit(1);
  });
