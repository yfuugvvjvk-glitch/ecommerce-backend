const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDeliverySchedules() {
  try {
    console.log('🔧 Fixing delivery schedules...');

    // Găsește configurația pentru delivery_schedules
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'delivery_schedules' }
    });

    if (!config) {
      console.log('❌ No delivery schedules config found');
      return;
    }

    console.log('📋 Current config:', config.value);

    // Parse datele curente
    const schedules = JSON.parse(config.value);
    console.log('📦 Found', schedules.length, 'schedules');

    // Curăță fiecare program - păstrează doar primul slot
    const cleanedSchedules = schedules.map(schedule => {
      const firstSlot = schedule.deliveryTimeSlots[0] || {
        startTime: '09:00',
        endTime: '21:00',
        maxOrders: 999
      };

      return {
        ...schedule,
        deliveryTimeSlots: [firstSlot] // Doar primul slot
      };
    });

    console.log('✨ Cleaned schedules:', JSON.stringify(cleanedSchedules, null, 2));

    // Salvează înapoi în baza de date
    await prisma.siteConfig.update({
      where: { key: 'delivery_schedules' },
      data: {
        value: JSON.stringify(cleanedSchedules),
        updatedAt: new Date()
      }
    });

    console.log('✅ Delivery schedules fixed successfully!');
    console.log('📊 Each schedule now has only 1 time slot');

  } catch (error) {
    console.error('❌ Error fixing delivery schedules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDeliverySchedules();
