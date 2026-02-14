const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeAnnouncementBanner() {
  console.log('🔧 Inițializare configurație banner anunțuri...');

  const defaultBannerConfig = {
    key: 'announcement_banner',
    value: JSON.stringify({
      isActive: false,
      title: '',
      description: '',
      titleStyle: {
        color: '#000000',
        backgroundColor: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        textAlign: 'center'
      },
      descriptionStyle: {
        color: '#333333',
        backgroundColor: '#F9FAFB',
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        textAlign: 'left'
      }
    }),
    type: 'json',
    description: 'Configurație banner anunțuri importante',
    isPublic: true
  };

  try {
    const result = await prisma.siteConfig.upsert({
      where: { key: defaultBannerConfig.key },
      update: {
        value: defaultBannerConfig.value,
        type: defaultBannerConfig.type,
        description: defaultBannerConfig.description,
        isPublic: defaultBannerConfig.isPublic
      },
      create: defaultBannerConfig
    });

    console.log(`✅ Configurație banner creată/actualizată: ${defaultBannerConfig.key}`);
    console.log('📋 Configurație implicită:');
    console.log('   - isActive: false (banner dezactivat implicit)');
    console.log('   - title: gol');
    console.log('   - description: gol');
    console.log('   - titleStyle: negru pe alb, 24px, Arial, bold, centrat');
    console.log('   - descriptionStyle: gri închis pe gri deschis, 16px, Arial, normal, stânga');
  } catch (error) {
    console.error(`❌ Eroare la inițializarea banner-ului:`, error.message);
    throw error;
  }

  console.log('✅ Configurație banner anunțuri inițializată cu succes!');
  await prisma.$disconnect();
}

initializeAnnouncementBanner()
  .catch((error) => {
    console.error('❌ Eroare la inițializare:', error);
    process.exit(1);
  });
