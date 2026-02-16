const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Traduceri manuale pentru textele din carousel
const translations = {
  title: {
    ro: 'Descoperă gustul care te întoarce acasă!',
    en: 'Discover the taste that brings you home!',
    fr: 'Découvrez le goût qui vous ramène à la maison!',
    de: 'Entdecken Sie den Geschmack, der Sie nach Hause bringt!',
    es: '¡Descubre el sabor que te lleva a casa!',
    it: 'Scopri il gusto che ti riporta a casa!'
  },
  description: {
    ro: 'DIN OGRADA MEA- DIRECT PE MASA TA',
    en: 'FROM MY GARDEN - DIRECTLY TO YOUR TABLE',
    fr: 'DE MON JARDIN - DIRECTEMENT SUR VOTRE TABLE',
    de: 'AUS MEINEM GARTEN - DIREKT AUF IHREN TISCH',
    es: 'DE MI HUERTO - DIRECTAMENTE A TU MESA',
    it: 'DAL MIO ORTO - DIRETTAMENTE SULLA TUA TAVOLA'
  }
};

async function addManualTranslations() {
  console.log('🌍 Adding manual carousel translations...\n');

  try {
    // Fetch all carousel items that have customTitle or customDescription
    const carouselItems = await prisma.carouselItem.findMany({
      where: {
        OR: [
          { customTitle: { not: null } },
          { customDescription: { not: null } }
        ]
      }
    });

    console.log(`Found ${carouselItems.length} carousel items to translate\n`);

    for (const item of carouselItems) {
      console.log(`\n📝 Processing carousel item: ${item.id}`);
      console.log(`   Type: ${item.type}, Position: ${item.position}`);
      
      const updates = {};

      // Check if customTitle matches our translation key
      if (item.customTitle && item.customTitle.trim().includes('Descoperă gustul')) {
        console.log(`   Updating title translations...`);
        updates.customTitleEn = translations.title.en;
        updates.customTitleFr = translations.title.fr;
        updates.customTitleDe = translations.title.de;
        updates.customTitleEs = translations.title.es;
        updates.customTitleIt = translations.title.it;
      }

      // Check if customDescription matches our translation key
      if (item.customDescription && item.customDescription.trim().includes('DIN OGRADA MEA')) {
        console.log(`   Updating description translations...`);
        updates.customDescriptionEn = translations.description.en;
        updates.customDescriptionFr = translations.description.fr;
        updates.customDescriptionDe = translations.description.de;
        updates.customDescriptionEs = translations.description.es;
        updates.customDescriptionIt = translations.description.it;
      }

      // Update the carousel item if there are translations
      if (Object.keys(updates).length > 0) {
        await prisma.carouselItem.update({
          where: { id: item.id },
          data: updates
        });
        console.log(`   ✅ Updated carousel item ${item.id}`);
      } else {
        console.log(`   ⏭️  No updates needed for ${item.id}`);
      }
    }

    console.log(`\n✅ Manual translations added successfully!`);
  } catch (error) {
    console.error('❌ Error adding translations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addManualTranslations();
