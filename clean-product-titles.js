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

async function cleanProductTitles() {
  try {
    console.log('🧹 Începe curățarea titlurilor produselor...\n');
    
    // Obține toate produsele
    const products = await prisma.dataItem.findMany({
      select: {
        id: true,
        title: true,
        description: true
      }
    });
    
    console.log(`📦 Găsite ${products.length} produse\n`);
    
    let updatedCount = 0;
    
    for (const product of products) {
      const cleanTitle = stripHtml(product.title);
      const cleanDescription = stripHtml(product.description);
      
      // Verifică dacă titlul sau descrierea conțin HTML
      if (cleanTitle !== product.title || cleanDescription !== product.description) {
        console.log(`🔧 Curățare: "${product.title}" -> "${cleanTitle}"`);
        
        await prisma.dataItem.update({
          where: { id: product.id },
          data: {
            title: cleanTitle,
            description: cleanDescription
          }
        });
        
        updatedCount++;
      }
    }
    
    console.log(`\n✅ Finalizat! ${updatedCount} produse au fost curățate.`);
    console.log(`📊 ${products.length - updatedCount} produse erau deja curate.`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Rulează scriptul
cleanProductTitles();
