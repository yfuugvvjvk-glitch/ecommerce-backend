const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Funcție simplă de traducere (folosește Google Translate API sau alt serviciu)
async function translateText(text, targetLang) {
  if (!text || text.trim() === '') return '';
  
  try {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      console.warn(`⚠️ No Google Translate API key found. Skipping translation to ${targetLang}`);
      return text; // Return original text if no API key
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'ro',
        target: targetLang,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error(`Error translating to ${targetLang}:`, error.message);
    return text; // Return original text on error
  }
}

async function generateCarouselTranslations() {
  console.log('🌍 Starting carousel translations generation...\n');

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

    const languages = ['en', 'fr', 'de', 'es', 'it'];
    let translatedCount = 0;

    for (const item of carouselItems) {
      console.log(`\n📝 Processing carousel item: ${item.id}`);
      console.log(`   Type: ${item.type}, Position: ${item.position}`);
      
      const updates = {};

      // Translate customTitle
      if (item.customTitle && item.customTitle.trim() !== '') {
        console.log(`   Original Title (RO): ${item.customTitle}`);
        
        for (const lang of languages) {
          const fieldName = `customTitle${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
          const existingTranslation = item[fieldName];
          
          if (!existingTranslation || existingTranslation.trim() === '') {
            console.log(`   Translating title to ${lang.toUpperCase()}...`);
            const translated = await translateText(item.customTitle, lang);
            updates[fieldName] = translated;
            console.log(`   ✓ ${lang.toUpperCase()}: ${translated}`);
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.log(`   ⏭️  ${lang.toUpperCase()}: Already translated`);
          }
        }
      }

      // Translate customDescription
      if (item.customDescription && item.customDescription.trim() !== '') {
        console.log(`   Original Description (RO): ${item.customDescription.substring(0, 50)}...`);
        
        for (const lang of languages) {
          const fieldName = `customDescription${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
          const existingTranslation = item[fieldName];
          
          if (!existingTranslation || existingTranslation.trim() === '') {
            console.log(`   Translating description to ${lang.toUpperCase()}...`);
            const translated = await translateText(item.customDescription, lang);
            updates[fieldName] = translated;
            console.log(`   ✓ ${lang.toUpperCase()}: ${translated.substring(0, 50)}...`);
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.log(`   ⏭️  ${lang.toUpperCase()}: Already translated`);
          }
        }
      }

      // Update the carousel item if there are translations
      if (Object.keys(updates).length > 0) {
        await prisma.carouselItem.update({
          where: { id: item.id },
          data: updates
        });
        translatedCount++;
        console.log(`   ✅ Updated carousel item ${item.id}`);
      } else {
        console.log(`   ⏭️  No updates needed for ${item.id}`);
      }
    }

    console.log(`\n✅ Translation complete! Updated ${translatedCount} carousel items.`);
  } catch (error) {
    console.error('❌ Error generating translations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateCarouselTranslations();
