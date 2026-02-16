const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addBannerTranslations() {
  try {
    console.log('Adding banner translations...\n');
    
    // Get current banner config
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'announcement_banner' }
    });

    if (!config) {
      console.log('No banner config found');
      return;
    }

    const bannerData = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
    
    console.log('Current banner:');
    console.log(`  Title (RO): ${bannerData.title}`);
    console.log(`  Description (RO): ${bannerData.description}`);
    
    // Add translations
    const updatedBanner = {
      ...bannerData,
      titleEn: 'Order placement blocked',
      titleFr: 'Blocage de commande',
      titleDe: 'Bestellsperre',
      titleEs: 'Bloqueo de pedidos',
      titleIt: 'Blocco ordini',
      descriptionEn: 'Order placement is blocked',
      descriptionFr: 'La passation de commande est bloquée',
      descriptionDe: 'Die Bestellaufgabe ist gesperrt',
      descriptionEs: 'La realización de pedidos está bloqueada',
      descriptionIt: 'Il posizionamento dell\'ordine è bloccato'
    };

    // Update in database
    await prisma.siteConfig.update({
      where: { key: 'announcement_banner' },
      data: {
        value: JSON.stringify(updatedBanner)
      }
    });

    console.log('\n✅ Banner translations added successfully!');
    console.log('\nTranslations:');
    console.log(`  EN: ${updatedBanner.titleEn} - ${updatedBanner.descriptionEn}`);
    console.log(`  FR: ${updatedBanner.titleFr} - ${updatedBanner.descriptionFr}`);
    console.log(`  DE: ${updatedBanner.titleDe} - ${updatedBanner.descriptionDe}`);
    console.log(`  ES: ${updatedBanner.titleEs} - ${updatedBanner.descriptionEs}`);
    console.log(`  IT: ${updatedBanner.titleIt} - ${updatedBanner.descriptionIt}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addBannerTranslations();
