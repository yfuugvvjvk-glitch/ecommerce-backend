const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock translations dictionary
const mockTranslations = {
  // Products
  'Lapte de vacă': {
    en: 'Cow Milk',
    fr: 'Lait de vache',
    de: 'Kuhmilch',
    es: 'Leche de vaca',
    it: 'Latte di mucca'
  },
  'Lapte de capră': {
    en: 'Goat Milk',
    fr: 'Lait de chèvre',
    de: 'Ziegenmilch',
    es: 'Leche de cabra',
    it: 'Latte di capra'
  },
  'Brânză': {
    en: 'Cheese',
    fr: 'Fromage',
    de: 'Käse',
    es: 'Queso',
    it: 'Formaggio'
  },
  'Unt': {
    en: 'Butter',
    fr: 'Beurre',
    de: 'Butter',
    es: 'Mantequilla',
    it: 'Burro'
  },
  'Ouă': {
    en: 'Eggs',
    fr: 'Œufs',
    de: 'Eier',
    es: 'Huevos',
    it: 'Uova'
  },
  
  // Delivery locations
  'Sediul Principal': {
    en: 'Main Office',
    fr: 'Siège principal',
    de: 'Hauptsitz',
    es: 'Sede principal',
    it: 'Sede principale'
  },
  'Sediu Principal - Galați': {
    en: 'Main Office - Galați',
    fr: 'Siège principal - Galați',
    de: 'Hauptsitz - Galați',
    es: 'Sede principal - Galați',
    it: 'Sede principale - Galați'
  },
  'În Galați': {
    en: 'In Galați',
    fr: 'À Galați',
    de: 'In Galați',
    es: 'En Galați',
    it: 'A Galați'
  },
  'Localități limitrofe': {
    en: 'Nearby Localities',
    fr: 'Localités voisines',
    de: 'Benachbarte Ortschaften',
    es: 'Localidades cercanas',
    it: 'Località limitrofe'
  }
};

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function getMockTranslation(text, targetLang) {
  const cleanText = stripHtml(text);
  
  // Check if we have a direct translation
  if (mockTranslations[cleanText] && mockTranslations[cleanText][targetLang]) {
    return mockTranslations[cleanText][targetLang];
  }
  
  // Check if text contains a known phrase
  for (const [key, translations] of Object.entries(mockTranslations)) {
    if (cleanText.includes(key) && translations[targetLang]) {
      return cleanText.replace(key, translations[targetLang]);
    }
  }
  
  // Return with language prefix if no translation found
  return `[${targetLang.toUpperCase()}] ${cleanText}`;
}

async function generateProductTranslations() {
  console.log('🔄 Generating product translations...');
  
  const products = await prisma.dataItem.findMany();
  
  console.log(`📦 Found ${products.length} products`);
  
  for (const product of products) {
    const updates = {};
    
    // Generate title translations
    if (product.title) {
      updates.titleEn = getMockTranslation(product.title, 'en');
      updates.titleFr = getMockTranslation(product.title, 'fr');
      updates.titleDe = getMockTranslation(product.title, 'de');
      updates.titleEs = getMockTranslation(product.title, 'es');
      updates.titleIt = getMockTranslation(product.title, 'it');
    }
    
    // Generate description translations
    if (product.description) {
      updates.descriptionEn = getMockTranslation(product.description, 'en');
      updates.descriptionFr = getMockTranslation(product.description, 'fr');
      updates.descriptionDe = getMockTranslation(product.description, 'de');
      updates.descriptionEs = getMockTranslation(product.description, 'es');
      updates.descriptionIt = getMockTranslation(product.description, 'it');
    }
    
    await prisma.dataItem.update({
      where: { id: product.id },
      data: updates
    });
    
    console.log(`✅ Updated product: ${stripHtml(product.title)}`);
  }
  
  console.log('✅ Product translations generated!');
}

async function generateDeliveryLocationTranslations() {
  console.log('🔄 Generating delivery location translations...');
  
  const locations = await prisma.deliveryLocation.findMany();
  
  console.log(`📍 Found ${locations.length} delivery locations`);
  
  for (const location of locations) {
    const updates = {};
    
    // Generate name translations
    if (location.name) {
      updates.nameEn = getMockTranslation(location.name, 'en');
      updates.nameFr = getMockTranslation(location.name, 'fr');
      updates.nameDe = getMockTranslation(location.name, 'de');
      updates.nameEs = getMockTranslation(location.name, 'es');
      updates.nameIt = getMockTranslation(location.name, 'it');
    }
    
    // Generate special instructions translations
    if (location.specialInstructions) {
      updates.specialInstructionsEn = getMockTranslation(location.specialInstructions, 'en');
      updates.specialInstructionsFr = getMockTranslation(location.specialInstructions, 'fr');
      updates.specialInstructionsDe = getMockTranslation(location.specialInstructions, 'de');
      updates.specialInstructionsEs = getMockTranslation(location.specialInstructions, 'es');
      updates.specialInstructionsIt = getMockTranslation(location.specialInstructions, 'it');
    }
    
    await prisma.deliveryLocation.update({
      where: { id: location.id },
      data: updates
    });
    
    console.log(`✅ Updated location: ${location.name}`);
  }
  
  console.log('✅ Delivery location translations generated!');
}

async function main() {
  try {
    await generateProductTranslations();
    await generateDeliveryLocationTranslations();
    
    console.log('\n🎉 All translations generated successfully!');
  } catch (error) {
    console.error('❌ Error generating translations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
