const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPages() {
  try {
    // Găsește primul user admin
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!admin) {
      console.log('Nu există utilizatori admin. Creează unul mai întâi.');
      return;
    }

    console.log('Admin găsit:', admin.email);

    // Creează pagini de test
    const pages = [
      {
        id: 'page-' + Date.now() + '-1',
        slug: 'despre-noi',
        title: 'Despre Noi',
        content: '<h1>Despre Noi</h1><p>Bine ați venit pe site-ul nostru!</p>',
        metaTitle: 'Despre Noi - Magazin Online',
        metaDescription: 'Aflați mai multe despre magazinul nostru online',
        isPublished: true,
        createdById: admin.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'page-' + Date.now() + '-2',
        slug: 'contact',
        title: 'Contact',
        content: '<h1>Contact</h1><p>Contactați-ne pentru mai multe informații.</p>',
        metaTitle: 'Contact - Magazin Online',
        metaDescription: 'Informații de contact',
        isPublished: true,
        createdById: admin.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'page-' + Date.now() + '-3',
        slug: 'termeni-si-conditii',
        title: 'Termeni și Condiții',
        content: '<h1>Termeni și Condiții</h1><p>Termenii și condițiile de utilizare.</p>',
        metaTitle: 'Termeni și Condiții',
        metaDescription: 'Termeni și condiții de utilizare',
        isPublished: false,
        createdById: admin.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const page of pages) {
      await prisma.page.create({ data: page });
      console.log('Pagină creată:', page.slug);
    }

    console.log('✅ Pagini create cu succes!');
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPages();
