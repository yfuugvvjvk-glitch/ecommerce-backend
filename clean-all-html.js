const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Funcție pentru a curăța HTML din text
function stripHtml(html) {
  if (!html) return html;
  
  // Elimină tag-urile HTML
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decodifică entitățile HTML
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Elimină spațiile multiple
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

async function cleanAllHtml() {
  try {
    console.log('🧹 Începe curățarea HTML din TOATE textele...\n');
    
    let totalUpdated = 0;
    
    // 1. PRODUSE (DataItem)
    console.log('📦 Curățare produse...');
    const products = await prisma.dataItem.findMany();
    let productCount = 0;
    
    for (const product of products) {
      const updates = {};
      
      if (product.title && stripHtml(product.title) !== product.title) {
        updates.title = stripHtml(product.title);
      }
      if (product.description && stripHtml(product.description) !== product.description) {
        updates.description = stripHtml(product.description);
      }
      if (product.content && stripHtml(product.content) !== product.content) {
        updates.content = stripHtml(product.content);
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.dataItem.update({
          where: { id: product.id },
          data: updates
        });
        productCount++;
        console.log(`  ✓ ${product.title} -> ${updates.title || product.title}`);
      }
    }
    console.log(`✅ ${productCount} produse curățate\n`);
    totalUpdated += productCount;
    
    // 2. CATEGORII
    console.log('📂 Curățare categorii...');
    const categories = await prisma.category.findMany();
    let categoryCount = 0;
    
    for (const category of categories) {
      const updates = {};
      
      if (category.name && stripHtml(category.name) !== category.name) {
        updates.name = stripHtml(category.name);
      }
      if (category.description && stripHtml(category.description) !== category.description) {
        updates.description = stripHtml(category.description);
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.category.update({
          where: { id: category.id },
          data: updates
        });
        categoryCount++;
        console.log(`  ✓ ${category.name} -> ${updates.name || category.name}`);
      }
    }
    console.log(`✅ ${categoryCount} categorii curățate\n`);
    totalUpdated += categoryCount;
    
    // 3. MEDIA (pentru carusel)
    console.log('🎬 Curățare media...');
    const mediaItems = await prisma.media.findMany();
    let mediaCount = 0;
    
    for (const media of mediaItems) {
      const updates = {};
      
      if (media.title && stripHtml(media.title) !== media.title) {
        updates.title = stripHtml(media.title);
      }
      if (media.description && stripHtml(media.description) !== media.description) {
        updates.description = stripHtml(media.description);
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.media.update({
          where: { id: media.id },
          data: updates
        });
        mediaCount++;
        console.log(`  ✓ Media curățat`);
      }
    }
    console.log(`✅ ${mediaCount} media curățate\n`);
    totalUpdated += mediaCount;
    
    // 4. CAROUSEL ITEMS
    console.log('🎠 Curățare carousel items...');
    const carouselItems = await prisma.carouselItem.findMany();
    let carouselCount = 0;
    
    for (const item of carouselItems) {
      const updates = {};
      
      if (item.title && stripHtml(item.title) !== item.title) {
        updates.title = stripHtml(item.title);
      }
      if (item.description && stripHtml(item.description) !== item.description) {
        updates.description = stripHtml(item.description);
      }
      if (item.customTitle && stripHtml(item.customTitle) !== item.customTitle) {
        updates.customTitle = stripHtml(item.customTitle);
      }
      if (item.customDescription && stripHtml(item.customDescription) !== item.customDescription) {
        updates.customDescription = stripHtml(item.customDescription);
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.carouselItem.update({
          where: { id: item.id },
          data: updates
        });
        carouselCount++;
        console.log(`  ✓ Carousel item curățat`);
      }
    }
    console.log(`✅ ${carouselCount} carousel items curățate\n`);
    totalUpdated += carouselCount;
    
    // 5. OFFERS
    console.log('🎁 Curățare oferte...');
    const offers = await prisma.offer.findMany();
    let offerCount = 0;
    
    for (const offer of offers) {
      const updates = {};
      
      if (offer.title && stripHtml(offer.title) !== offer.title) {
        updates.title = stripHtml(offer.title);
      }
      if (offer.description && stripHtml(offer.description) !== offer.description) {
        updates.description = stripHtml(offer.description);
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: updates
        });
        offerCount++;
        console.log(`  ✓ ${offer.title} -> ${updates.title || offer.title}`);
      }
    }
    console.log(`✅ ${offerCount} oferte curățate\n`);
    totalUpdated += offerCount;
    
    console.log('═══════════════════════════════════════');
    console.log(`🎉 FINALIZAT! Total: ${totalUpdated} elemente curățate`);
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Rulează scriptul
cleanAllHtml();
