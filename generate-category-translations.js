const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Traduceri pentru categorii
const categoryTranslations = {
  'Ouă': {
    en: 'Eggs',
    fr: 'Œufs',
    de: 'Eier',
    es: 'Huevos',
    it: 'Uova'
  },
  'Ouă de găină': {
    en: 'Chicken Eggs',
    fr: 'Œufs de Poule',
    de: 'Hühnereier',
    es: 'Huevos de Gallina',
    it: 'Uova di Gallina'
  },
  'Ouă de prepeliță': {
    en: 'Quail Eggs',
    fr: 'Œufs de Caille',
    de: 'Wachteleier',
    es: 'Huevos de Codorniz',
    it: 'Uova di Quaglia'
  },
  'Carne': {
    en: 'Meat',
    fr: 'Viande',
    de: 'Fleisch',
    es: 'Carne',
    it: 'Carne'
  },
  'Preparate din capră': {
    en: 'Goat Products',
    fr: 'Produits de Chèvre',
    de: 'Ziegenprodukte',
    es: 'Productos de Cabra',
    it: 'Prodotti di Capra'
  },
  'Preparate din pasăre': {
    en: 'Poultry Products',
    fr: 'Produits de Volaille',
    de: 'Geflügelprodukte',
    es: 'Productos de Aves',
    it: 'Prodotti di Pollame'
  },
  'Preparate din vită': {
    en: 'Beef Products',
    fr: 'Produits de Bœuf',
    de: 'Rindfleischprodukte',
    es: 'Productos de Res',
    it: 'Prodotti di Manzo'
  },
  'Lapte': {
    en: 'Milk',
    fr: 'Lait',
    de: 'Milch',
    es: 'Leche',
    it: 'Latte'
  },
  'Lapte de vacă': {
    en: 'Cow Milk',
    fr: 'Lait de Vache',
    de: 'Kuhmilch',
    es: 'Leche de Vaca',
    it: 'Latte di Mucca'
  },
  'Lapte de capră': {
    en: 'Goat Milk',
    fr: 'Lait de Chèvre',
    de: 'Ziegenmilch',
    es: 'Leche de Cabra',
    it: 'Latte di Capra'
  },
  'Lapte de măgăriță': {
    en: 'Donkey Milk',
    fr: 'Lait d\'Ânesse',
    de: 'Eselsmilch',
    es: 'Leche de Burra',
    it: 'Latte d\'Asina'
  },
  'Animale vii': {
    en: 'Live Animals',
    fr: 'Animaux Vivants',
    de: 'Lebende Tiere',
    es: 'Animales Vivos',
    it: 'Animali Vivi'
  },
  'Capră': {
    en: 'Goat',
    fr: 'Chèvre',
    de: 'Ziege',
    es: 'Cabra',
    it: 'Capra'
  },
  'Pasăre': {
    en: 'Poultry',
    fr: 'Volaille',
    de: 'Geflügel',
    es: 'Aves',
    it: 'Pollame'
  },
  'Vită': {
    en: 'Cattle',
    fr: 'Bétail',
    de: 'Rind',
    es: 'Ganado',
    it: 'Bovino'
  },
  'Brânză': {
    en: 'Cheese',
    fr: 'Fromage',
    de: 'Käse',
    es: 'Queso',
    it: 'Formaggio'
  },
  'Branză': {
    en: 'Cheese',
    fr: 'Fromage',
    de: 'Käse',
    es: 'Queso',
    it: 'Formaggio'
  },
  'Branză de capră': {
    en: 'Goat Cheese',
    fr: 'Fromage de Chèvre',
    de: 'Ziegenkäse',
    es: 'Queso de Cabra',
    it: 'Formaggio di Capra'
  },
  'Branză de vacă': {
    en: 'Cow Cheese',
    fr: 'Fromage de Vache',
    de: 'Kuhkäse',
    es: 'Queso de Vaca',
    it: 'Formaggio di Mucca'
  }
};

async function generateCategoryTranslations() {
  console.log('🌍 Starting category translation generation...');

  try {
    // Fetch all categories
    const categories = await prisma.category.findMany();
    console.log(`📦 Found ${categories.length} categories`);

    let updatedCount = 0;

    for (const category of categories) {
      const translations = categoryTranslations[category.name];
      
      if (translations) {
        await prisma.category.update({
          where: { id: category.id },
          data: {
            nameRo: category.name, // Original name in Romanian
            nameEn: translations.en,
            nameFr: translations.fr,
            nameDe: translations.de,
            nameEs: translations.es,
            nameIt: translations.it
          }
        });
        
        updatedCount++;
        console.log(`✅ Updated translations for category: ${category.name}`);
      } else {
        console.log(`⚠️  No translations found for category: ${category.name}`);
      }
    }

    console.log(`\n✨ Successfully updated ${updatedCount} categories with translations!`);
  } catch (error) {
    console.error('❌ Error generating category translations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generateCategoryTranslations()
  .then(() => {
    console.log('✅ Category translation generation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to generate category translations:', error);
    process.exit(1);
  });
