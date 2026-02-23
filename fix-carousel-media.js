const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCarouselMedia() {
  try {
    console.log('🔧 Fixing carousel media relations...');

    // Găsește toate item-urile de carusel de tip media
    const carouselItems = await prisma.carouselItem.findMany({
      where: {
        type: 'media'
      },
      include: {
        Media: true
      }
    });

    console.log(`📦 Found ${carouselItems.length} media carousel items`);

    for (const item of carouselItems) {
      console.log(`\n📋 Item ${item.id}:`);
      console.log(`  - mediaId: ${item.mediaId}`);
      console.log(`  - has Media relation: ${!!item.Media}`);
      
      if (item.mediaId && !item.Media) {
        console.log(`  ⚠️ Media relation missing, checking if media exists...`);
        
        const media = await prisma.media.findUnique({
          where: { id: item.mediaId }
        });
        
        if (media) {
          console.log(`  ✅ Media found: ${media.originalName}`);
          console.log(`  📸 URL: ${media.url}`);
        } else {
          console.log(`  ❌ Media not found in database!`);
          console.log(`  🗑️ Deleting orphaned carousel item...`);
          await prisma.carouselItem.delete({
            where: { id: item.id }
          });
        }
      } else if (item.Media) {
        console.log(`  ✅ Media relation OK: ${item.Media.originalName}`);
        console.log(`  📸 URL: ${item.Media.url}`);
      }
    }

    // Verifică toate media files
    console.log('\n\n📁 All media files in database:');
    const allMedia = await prisma.media.findMany({
      select: {
        id: true,
        originalName: true,
        url: true,
        mimeType: true
      }
    });
    
    console.log(`Found ${allMedia.length} media files:`);
    allMedia.forEach(m => {
      console.log(`  - ${m.originalName} (${m.mimeType})`);
      console.log(`    ID: ${m.id}`);
      console.log(`    URL: ${m.url}`);
    });

    console.log('\n✅ Carousel media check complete!');

  } catch (error) {
    console.error('❌ Error fixing carousel media:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCarouselMedia();
