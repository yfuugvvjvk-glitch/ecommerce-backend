const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeSystem() {
  try {
    console.log('🚀 Initializing system with default configurations and pages...');

    // Initialize default site configurations
    console.log('📝 Initializing site configurations...');
    
    const defaultConfigs = [
      {
        key: 'site_name',
        value: 'Site Comerț Live',
        type: 'text',
        description: 'Numele site-ului',
        isPublic: true
      },
      {
        key: 'site_description',
        value: 'Platforma de comerț electronic cu funcționalități avansate',
        type: 'text',
        description: 'Descrierea site-ului',
        isPublic: true
      },
      {
        key: 'contact_email',
        value: 'contact@site.ro',
        type: 'text',
        description: 'Email-ul de contact principal',
        isPublic: true
      },
      {
        key: 'contact_phone',
        value: '+40 123 456 789',
        type: 'text',
        description: 'Telefonul de contact principal',
        isPublic: true
      },
      {
        key: 'business_hours',
        value: JSON.stringify({
          monday: '09:00 - 18:00',
          tuesday: '09:00 - 18:00',
          wednesday: '09:00 - 18:00',
          thursday: '09:00 - 18:00',
          friday: '09:00 - 18:00',
          saturday: '10:00 - 16:00',
          sunday: 'Închis'
        }),
        type: 'json',
        description: 'Programul de lucru',
        isPublic: true
      },
      {
        key: 'company_address',
        value: 'Strada Exemplu, Nr. 123, București, România',
        type: 'text',
        description: 'Adresa companiei',
        isPublic: true
      },
      {
        key: 'company_coordinates',
        value: JSON.stringify({ lat: 44.4268, lng: 26.1025 }),
        type: 'json',
        description: 'Coordonatele companiei pentru hartă',
        isPublic: true
      },
      {
        key: 'currency',
        value: 'RON',
        type: 'text',
        description: 'Moneda folosită',
        isPublic: true
      },
      {
        key: 'tax_rate',
        value: '19',
        type: 'number',
        description: 'Rata TVA (%)',
        isPublic: false
      },
      {
        key: 'min_order_value',
        value: '50',
        type: 'number',
        description: 'Valoarea minimă a comenzii',
        isPublic: true
      },
      {
        key: 'free_delivery_threshold',
        value: '100',
        type: 'number',
        description: 'Pragul pentru livrare gratuită',
        isPublic: true
      },
      {
        key: 'social_media',
        value: JSON.stringify({
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: ''
        }),
        type: 'json',
        description: 'Link-uri rețele sociale',
        isPublic: true
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        type: 'boolean',
        description: 'Modul de mentenanță',
        isPublic: false
      },
      {
        key: 'allow_registrations',
        value: 'true',
        type: 'boolean',
        description: 'Permite înregistrări noi',
        isPublic: false
      }
    ];

    // Check existing configs
    const existingConfigs = await prisma.siteConfig.findMany({
      select: { key: true }
    });
    const existingKeys = existingConfigs.map(c => c.key);

    // Create only new configs
    const newConfigs = defaultConfigs.filter(config => !existingKeys.includes(config.key));
    
    if (newConfigs.length > 0) {
      for (const config of newConfigs) {
        await prisma.siteConfig.create({
          data: config
        });
      }
      console.log(`✅ Created ${newConfigs.length} new configurations`);
    } else {
      console.log('✅ All configurations already exist');
    }

    // Initialize default pages
    console.log('📄 Initializing default pages...');
    
    // Find an admin user to assign as creator
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.log('⚠️ No admin user found. Creating default admin user...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@site.ro',
          password: hashedPassword,
          name: 'Administrator',
          role: 'admin'
        }
      });
      
      console.log('✅ Created default admin user: admin@site.ro / admin123');
      adminUser = newAdmin;
    }

    const defaultPages = [
      {
        slug: 'home',
        title: 'Acasă',
        content: `
          <div class="hero-section">
            <h1>Bine ați venit la ${defaultConfigs.find(c => c.key === 'site_name')?.value}</h1>
            <p>Descoperă produsele noastre de calitate și comenzile cu livrare rapidă!</p>
          </div>
          
          <div class="features-section">
            <h2>De ce să ne alegi?</h2>
            <ul>
              <li>🚚 Livrare rapidă în toată țara</li>
              <li>💳 Plăți securizate</li>
              <li>📞 Suport clienți 24/7</li>
              <li>🎯 Produse de calitate</li>
            </ul>
          </div>
        `,
        metaTitle: 'Acasă - Site Comerț Live',
        metaDescription: 'Platforma de comerț electronic cu produse de calitate și livrare rapidă',
        isPublished: true,
        template: 'home',
        createdById: adminUser.id
      },
      {
        slug: 'about',
        title: 'Despre Noi',
        content: `
          <div class="about-section">
            <h1>Despre Noi</h1>
            <p>Suntem o companie dedicată să vă oferim cele mai bune produse și servicii.</p>
            
            <h2>Misiunea Noastră</h2>
            <p>Să facem cumpărăturile online simple, sigure și plăcute pentru toți clienții noștri.</p>
            
            <h2>Valorile Noastre</h2>
            <ul>
              <li>Calitate în tot ce facem</li>
              <li>Transparență în relația cu clienții</li>
              <li>Inovație continuă</li>
              <li>Responsabilitate socială</li>
            </ul>
          </div>
        `,
        metaTitle: 'Despre Noi - Site Comerț Live',
        metaDescription: 'Aflați mai multe despre compania noastră și valorile pe care le promovăm',
        isPublished: true,
        template: 'default',
        createdById: adminUser.id
      },
      {
        slug: 'contact',
        title: 'Contact',
        content: `
          <div class="contact-section">
            <h1>Contactați-ne</h1>
            <p>Suntem aici să vă ajutăm! Nu ezitați să ne contactați.</p>
            
            <div class="contact-info">
              <h2>Informații de Contact</h2>
              <p><strong>📧 Email:</strong> ${defaultConfigs.find(c => c.key === 'contact_email')?.value}</p>
              <p><strong>📞 Telefon:</strong> ${defaultConfigs.find(c => c.key === 'contact_phone')?.value}</p>
              <p><strong>📍 Adresă:</strong> ${defaultConfigs.find(c => c.key === 'company_address')?.value}</p>
              
              <h2>Program de Lucru</h2>
              <ul>
                <li>Luni - Vineri: 09:00 - 18:00</li>
                <li>Sâmbătă: 10:00 - 16:00</li>
                <li>Duminică: Închis</li>
              </ul>
            </div>
            
            <div class="contact-form">
              <h2>Trimite-ne un Mesaj</h2>
              <p>Folosește formularul de mai jos pentru a ne contacta direct:</p>
              <!-- Formularul va fi adăugat prin JavaScript -->
            </div>
          </div>
        `,
        metaTitle: 'Contact - Site Comerț Live',
        metaDescription: 'Contactați-ne pentru orice întrebări sau suport. Suntem aici să vă ajutăm!',
        isPublished: true,
        template: 'contact',
        createdById: adminUser.id
      },
      {
        slug: 'privacy',
        title: 'Politica de Confidențialitate',
        content: `
          <div class="privacy-section">
            <h1>Politica de Confidențialitate</h1>
            <p><em>Ultima actualizare: ${new Date().toLocaleDateString('ro-RO')}</em></p>
            
            <h2>1. Informații Generale</h2>
            <p>Această politică de confidențialitate descrie modul în care colectăm, folosim și protejăm informațiile dumneavoastră personale.</p>
            
            <h2>2. Informații Colectate</h2>
            <ul>
              <li>Informații de contact (nume, email, telefon)</li>
              <li>Adresa de livrare</li>
              <li>Istoricul comenzilor</li>
              <li>Preferințele de cumpărături</li>
            </ul>
            
            <h2>3. Utilizarea Informațiilor</h2>
            <p>Folosim informațiile pentru:</p>
            <ul>
              <li>Procesarea comenzilor</li>
              <li>Comunicarea cu clienții</li>
              <li>Îmbunătățirea serviciilor</li>
              <li>Marketing personalizat (cu acordul dumneavoastră)</li>
            </ul>
            
            <h2>4. Protecția Datelor</h2>
            <p>Implementăm măsuri de securitate pentru a proteja informațiile dumneavoastră personale.</p>
            
            <h2>5. Drepturile Dumneavoastră</h2>
            <p>Aveți dreptul să:</p>
            <ul>
              <li>Accesați datele personale</li>
              <li>Rectificați informațiile incorecte</li>
              <li>Ștergeți datele (în anumite condiții)</li>
              <li>Vă opuneți prelucrării</li>
            </ul>
          </div>
        `,
        metaTitle: 'Politica de Confidențialitate - Site Comerț Live',
        metaDescription: 'Politica noastră de confidențialitate și protecția datelor personale',
        isPublished: true,
        template: 'default',
        createdById: adminUser.id
      },
      {
        slug: 'terms',
        title: 'Termeni și Condiții',
        content: `
          <div class="terms-section">
            <h1>Termeni și Condiții</h1>
            <p><em>Ultima actualizare: ${new Date().toLocaleDateString('ro-RO')}</em></p>
            
            <h2>1. Acceptarea Termenilor</h2>
            <p>Prin utilizarea acestui site, acceptați termenii și condițiile de mai jos.</p>
            
            <h2>2. Produse și Servicii</h2>
            <ul>
              <li>Toate produsele sunt prezentate cu informații corecte</li>
              <li>Prețurile pot fi modificate fără notificare prealabilă</li>
              <li>Disponibilitatea produselor este limitată</li>
            </ul>
            
            <h2>3. Comenzi și Plăți</h2>
            <ul>
              <li>Comenzile sunt procesate în ordinea primirii</li>
              <li>Plățile se fac prin metodele disponibile pe site</li>
              <li>Facturile sunt emise conform legislației în vigoare</li>
            </ul>
            
            <h2>4. Livrare</h2>
            <ul>
              <li>Livrarea se face în termenele specificate</li>
              <li>Costurile de livrare sunt afișate la checkout</li>
              <li>Livrarea gratuită pentru comenzi peste ${defaultConfigs.find(c => c.key === 'free_delivery_threshold')?.value} RON</li>
            </ul>
            
            <h2>5. Returnări</h2>
            <p>Produsele pot fi returnate în termen de 14 zile de la livrare, în condiții specifice.</p>
            
            <h2>6. Limitarea Răspunderii</h2>
            <p>Răspunderea noastră este limitată la valoarea produselor achiziționate.</p>
          </div>
        `,
        metaTitle: 'Termeni și Condiții - Site Comerț Live',
        metaDescription: 'Termenii și condițiile de utilizare a platformei noastre',
        isPublished: true,
        template: 'default',
        createdById: adminUser.id
      }
    ];

    // Check existing pages
    const existingPages = await prisma.page.findMany({
      select: { slug: true }
    });
    const existingSlugs = existingPages.map(p => p.slug);

    // Create only new pages
    const newPages = defaultPages.filter(page => !existingSlugs.includes(page.slug));
    
    if (newPages.length > 0) {
      for (const page of newPages) {
        await prisma.page.create({
          data: page
        });
      }
      console.log(`✅ Created ${newPages.length} new pages`);
    } else {
      console.log('✅ All default pages already exist');
    }

    // Initialize default delivery location
    console.log('🚚 Initializing default delivery location...');
    
    const existingLocations = await prisma.deliveryLocation.findMany();
    
    if (existingLocations.length === 0) {
      await prisma.deliveryLocation.create({
        data: {
          name: 'Locația Principală',
          address: 'Strada Exemplu, Nr. 123',
          city: 'București',
          postalCode: '010101',
          country: 'România',
          coordinates: JSON.stringify({ lat: 44.4268, lng: 26.1025 }),
          phone: '+40 123 456 789',
          email: 'contact@site.ro',
          isActive: true,
          deliveryRadius: 50,
          deliveryFee: 15,
          freeDeliveryThreshold: 100,
          workingHours: JSON.stringify({
            monday: { start: '09:00', end: '18:00', isOpen: true },
            tuesday: { start: '09:00', end: '18:00', isOpen: true },
            wednesday: { start: '09:00', end: '18:00', isOpen: true },
            thursday: { start: '09:00', end: '18:00', isOpen: true },
            friday: { start: '09:00', end: '18:00', isOpen: true },
            saturday: { start: '10:00', end: '16:00', isOpen: true },
            sunday: { start: '10:00', end: '14:00', isOpen: false }
          }),
          specialInstructions: 'Ne găsiți la adresa de mai sus. Vă rugăm să sunați când ajungeți pentru a vă întâmpina.',
          contactPerson: 'Echipa de Livrare',
          isMainLocation: true
        }
      });
      console.log('✅ Created default delivery location');
    } else {
      console.log('✅ Delivery locations already exist');
    }

    console.log('🎉 System initialization completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`- Site configurations: ${existingConfigs.length + newConfigs.length} total`);
    console.log(`- Pages: ${existingPages.length + newPages.length} total`);
    console.log(`- Delivery locations: ${existingLocations.length > 0 ? existingLocations.length : 1} total`);
    console.log('');
    console.log('🔐 Admin credentials (if created):');
    console.log('Email: admin@site.ro');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Error initializing system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeSystem()
  .then(() => {
    console.log('✅ Initialization script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Initialization script failed:', error);
    process.exit(1);
  });