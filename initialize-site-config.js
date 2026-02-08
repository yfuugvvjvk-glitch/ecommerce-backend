const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeSiteConfig() {
  console.log('🔧 Inițializare configurații site...');

  const defaultConfigs = [
    {
      key: 'contact_email',
      value: 'crys.cristi@yahoo.com',
      type: 'text',
      description: 'Email de contact',
      isPublic: true
    },
    {
      key: 'contact_phone',
      value: '+40 753 615 752',
      type: 'text',
      description: 'Telefon de contact',
      isPublic: true
    },
    {
      key: 'contact_address',
      value: 'Str. Gari nr. 69, Galați, România, Cod poștal: 800001',
      type: 'text',
      description: 'Adresa companiei',
      isPublic: true
    },
    {
      key: 'business_hours',
      value: JSON.stringify({
        luni: '09:00 - 18:00',
        marți: '09:00 - 18:00',
        miercuri: '09:00 - 18:00',
        joi: '09:00 - 18:00',
        vineri: '09:00 - 18:00',
        sâmbătă: '10:00 - 16:00',
        duminică: 'Închis'
      }),
      type: 'json',
      description: 'Program de lucru',
      isPublic: true
    },
    {
      key: 'site_name',
      value: 'Site Comerț Live',
      type: 'text',
      description: 'Numele site-ului',
      isPublic: true
    },
    {
      key: 'site_description',
      value: 'Platforma de comerț electronic',
      type: 'text',
      description: 'Descrierea site-ului',
      isPublic: true
    },
    {
      key: 'currency',
      value: 'RON',
      type: 'text',
      description: 'Moneda utilizată',
      isPublic: true
    },
    {
      key: 'min_order_value',
      value: '50',
      type: 'number',
      description: 'Valoarea minimă a comenzii',
      isPublic: true
    },
    {
      key: 'free_delivery_threshold',
      value: '100',
      type: 'number',
      description: 'Pragul pentru livrare gratuită',
      isPublic: true
    }
  ];

  for (const config of defaultConfigs) {
    try {
      await prisma.siteConfig.upsert({
        where: { key: config.key },
        update: {
          value: config.value,
          type: config.type,
          description: config.description,
          isPublic: config.isPublic
        },
        create: config
      });
      console.log(`✅ Configurație creată/actualizată: ${config.key}`);
    } catch (error) {
      console.error(`❌ Eroare la ${config.key}:`, error.message);
    }
  }

  console.log('✅ Configurații site inițializate cu succes!');
  await prisma.$disconnect();
}

initializeSiteConfig()
  .catch((error) => {
    console.error('❌ Eroare la inițializare:', error);
    process.exit(1);
  });
