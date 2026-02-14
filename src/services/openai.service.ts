import OpenAI from 'openai';
import { prisma } from '../utils/prisma';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
}

// Simple in-memory cache with TTL
class Cache<T> {
  private cache = new Map<string, { data: T; expiry: number }>();

  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      data: value,
      expiry: Date.now() + ttlMs,
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

class OpenAIService {
  private client: OpenAI | null = null;
  private recommendationsCache = new Cache<any[]>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    // Check if API key is valid (not a placeholder)
    if (apiKey && apiKey.startsWith('sk-') && !apiKey.includes('your-openai-api-key')) {
      this.client = new OpenAI({
        apiKey,
      });
      console.log('✅ OpenAI API initialized successfully');
    } else {
      console.warn('⚠️ OpenAI API key not configured. Using fallback AI responses.');
    }
  }

  private isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * Generate AI-powered product recommendations
   */
  async generateProductRecommendations(
    productId: string,
    userId?: string
  ): Promise<any[]> {
    if (!this.isEnabled()) {
      return this.getFallbackRecommendations(productId);
    }

    // Check cache first
    const cacheKey = `recommendations:${productId}:${userId || 'guest'}`;
    const cached = this.recommendationsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get the product details
      const product = await prisma.dataItem.findUnique({
        where: { id: productId },
        include: { category: true },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Get user's purchase history if available
      let userContext = '';
      if (userId) {
        const userOrders = await prisma.order.findMany({
          where: { userId },
          include: {
            orderItems: {
              include: {
                dataItem: true,
              },
            },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        });

        const purchasedCategories = userOrders
          .flatMap((order: any) =>
            order.orderItems.map((item: any) => item.dataItem.category?.name)
          )
          .filter(Boolean);

        if (purchasedCategories.length > 0) {
          userContext = `User has previously purchased products in categories: ${[...new Set(purchasedCategories)].join(', ')}.`;
        }
      }

      // Create prompt for OpenAI
      const prompt = `You are a product recommendation expert for an e-commerce store.

Current Product:
- Title: ${product.title}
- Category: ${product.category?.name || 'General'}
- Description: ${product.description}

${userContext}

Based on this product and user context, recommend 5 similar or complementary products that would interest the customer. 
Return ONLY a JSON array of product suggestions with this exact format:
[
  {
    "title": "Product Name",
    "category": "Category",
    "reason": "Brief reason why this complements the current product"
  }
]

Focus on products that are either similar or would work well together with the current product.`;

      const completion = await this.client!.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful e-commerce product recommendation assistant. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || '[]';
      
      // Parse the JSON response
      let recommendations: any[];
      try {
        recommendations = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText);
        return this.getFallbackRecommendations(productId);
      }

      // Try to match recommendations with actual products in database
      const matchedProducts = await this.matchRecommendationsToProducts(
        recommendations,
        product.category?.name || ''
      );

      // Cache the results
      this.recommendationsCache.set(cacheKey, matchedProducts, this.CACHE_TTL);

      return matchedProducts;
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return this.getFallbackRecommendations(productId);
    }
  }

  /**
   * Match AI recommendations to actual products in database
   */
  private async matchRecommendationsToProducts(
    recommendations: any[],
    currentCategory?: string
  ): Promise<any[]> {
    const results = [];

    for (const rec of recommendations.slice(0, 5)) {
      // Try to find a product that matches the recommendation
      const matchedProduct = await prisma.dataItem.findFirst({
        where: {
          OR: [
            { title: { contains: rec.title, mode: 'insensitive' } },
            { category: { name: { equals: rec.category, mode: 'insensitive' } } },
            { category: { name: { equals: currentCategory, mode: 'insensitive' } } },
          ],
          status: 'published',
        },
        include: { category: true },
        take: 1,
      });

      if (matchedProduct) {
        results.push({
          ...matchedProduct,
          aiReason: rec.reason,
        });
      }
    }

    return results;
  }

  /**
   * Fallback recommendations using simple rule-based logic
   */
  private async getFallbackRecommendations(productId: string): Promise<any[]> {
    try {
      const product = await prisma.dataItem.findUnique({
        where: { id: productId },
        include: { category: true },
      });

      if (!product) return [];

      // Get products from same category
      const recommendations = await prisma.dataItem.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: productId },
          status: 'published',
        },
        include: { category: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      return recommendations;
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  /**
   * Generate product description using AI
   */
  async generateProductDescription(
    title: string,
    category: string
  ): Promise<string> {
    if (!this.isEnabled()) {
      return `${title} - A quality product in the ${category} category.`;
    }

    try {
      const prompt = `Generate a compelling product description for an e-commerce store.

Product Title: ${title}
Category: ${category}

Create a description that:
1. Highlights key features and benefits
2. Is engaging and persuasive
3. Is 2-3 paragraphs long
4. Uses professional but friendly tone
5. Includes relevant keywords for SEO

Return only the description text, no additional formatting or labels.`;

      const completion = await this.client!.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert e-commerce copywriter who creates compelling product descriptions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 300,
      });

      return completion.choices[0]?.message?.content || `${title} - A quality product in the ${category} category.`;
    } catch (error) {
      console.error('Error generating product description:', error);
      return `${title} - A quality product in the ${category} category.`;
    }
  }

  /**
   * Fallback chat responses (when OpenAI is not available)
   */
  private async getFallbackResponse(userMessage: string): Promise<string> {
    const message = userMessage.toLowerCase();

    // Program magazin
    if (message.includes('program') || message.includes('orar') || message.includes('deschis') || message.includes('închis')) {
      return `📅 **Program magazin:**

**Magazin fizic:**
- Luni - Vineri: 9:00 - 18:00
- Sâmbătă: 10:00 - 14:00
- Duminică: Închis

**Magazin online:**
- Non-stop (24/7)

Adresă: Str. Gari nr. 69, Galați, România`;
    }

    // Contact
    if (message.includes('contact') || message.includes('telefon') || message.includes('email') || message.includes('suna')) {
      return `📞 **Informații de contact:**

📧 Email: crys.cristi@yahoo.com
📱 Telefon: 0753615742
📍 Adresă: Str. Gari nr. 69, Galați, România, Cod poștal: 08001

Suntem disponibili în programul magazinului fizic sau ne poți scrie oricând!`;
    }

    // Livrare - cu date LIVE
    if (message.includes('livrare') || message.includes('livrez') || message.includes('transport') || message.includes('curier')) {
      try {
        const deliveryMethods = await prisma.deliverySettings.findMany({
          where: { isActive: true },
        });

        if (deliveryMethods.length > 0) {
          let response = `🚚 **Informații despre livrare:**\n\n`;
          
          deliveryMethods.forEach((method: any) => {
            if (method.type === 'pickup') {
              response += `📍 **${method.name}**\n`;
              if (method.deliveryTimeHours) {
                response += `   ⏱️ Disponibil în: ${method.deliveryTimeHours} ore\n`;
              }
              response += `   💰 Cost: GRATUIT\n`;
            } else {
              response += `🚚 **${method.name}**\n`;
              if (method.deliveryTimeHours) {
                response += `   ⏱️ Timp livrare: ${method.deliveryTimeHours} ore\n`;
              }
              if (method.deliveryTimeDays) {
                response += `   📅 Timp livrare: ${method.deliveryTimeDays} zile\n`;
              }
              if (method.cost !== undefined && method.cost !== null) {
                response += `   💰 Cost: ${method.cost} RON\n`;
              }
              if (method.description) {
                response += `   📝 ${method.description}\n`;
              }
            }
            response += '\n';
          });

          // Adaugă locații de livrare
          const locations = await prisma.deliveryLocation.findMany({
            where: { isActive: true },
            take: 3,
          });

          if (locations.length > 0) {
            response += `📍 **Zone de livrare:**\n`;
            locations.forEach((loc: any) => {
              response += `   • ${loc.city}`;
              if (loc.isMainLocation) {
                response += ` (Sediu principal)`;
              }
              response += '\n';
            });
          }

          response += `\n✅ Vei primi un cod de tracking pentru a urmări comanda.`;
          return response;
        }
      } catch (error) {
        console.error('Error fetching delivery info:', error);
      }

      // Fallback dacă nu se pot lua datele
      return `🚚 **Informații despre livrare:**

📦 Verifică metodele de livrare disponibile în coș
⚡ Livrăm rapid în zona Galați

Pentru detalii exacte despre livrare, contactează-ne:
📧 crys.cristi@yahoo.com
📱 0753615742`;
    }

    // Plată - cu date LIVE
    if (message.includes('plat') || message.includes('card') || message.includes('cash') || message.includes('ramburs')) {
      try {
        const paymentMethods = await prisma.paymentMethod.findMany({
          where: { isActive: true },
        });

        if (paymentMethods.length > 0) {
          let response = `💳 **Metode de plată acceptate:**\n\n`;
          
          paymentMethods.forEach((method: any) => {
            response += `✅ ${method.name}`;
            if (method.description) {
              response += ` - ${method.description}`;
            }
            response += '\n';
          });

          response += `\nToate plățile sunt securizate și procesate în siguranță.`;
          return response;
        }
      } catch (error) {
        console.error('Error fetching payment info:', error);
      }

      // Fallback
      return `💳 **Metode de plată acceptate:**

✅ Card bancar (online)
✅ Numerar la livrare

Toate plățile sunt securizate și procesate în siguranță.`;
    }

    // Returnări
    if (message.includes('retur') || message.includes('schimb') || message.includes('garantie') || message.includes('defect')) {
      return `🔄 **Politica de returnare:**

✅ Ai **30 de zile** pentru a returna produsele
✅ Produsele trebuie să fie în **stare originală**
✅ Returnarea este **GRATUITĂ**
✅ Banii se returnează în **5-7 zile lucrătoare**

Pentru returnări, contactează-ne la: crys.cristi@yahoo.com sau 0753615742`;
    }

    // Vouchere și Oferte - cu date LIVE
    if (message.includes('voucher') || message.includes('reducere') || message.includes('discount') || message.includes('ofert') || message.includes('promoție')) {
      try {
        const [activeOffers, activeVouchers] = await Promise.all([
          prisma.offer.findMany({
            where: { active: true, validUntil: { gte: new Date() } },
            take: 3,
          }),
          prisma.voucher.findMany({
            where: { isActive: true },
            take: 3,
          }),
        ]);

        let response = `🎁 **Oferte și Vouchere active:**\n\n`;

        if (activeOffers.length > 0) {
          response += `✨ **Oferte speciale:**\n`;
          activeOffers.forEach(offer => {
            const validDate = new Date(offer.validUntil).toLocaleDateString('ro-RO');
            response += `• ${offer.title} - ${offer.discount}% reducere (până la ${validDate})\n`;
          });
          response += '\n';
        }

        if (activeVouchers.length > 0) {
          response += `🎟️ **Vouchere disponibile:**\n`;
          activeVouchers.forEach(v => {
            const discount = v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : `${v.discountValue} RON`;
            response += `• Cod: **${v.code}** - ${discount} reducere\n`;
          });
          response += '\n';
        }

        if (activeOffers.length === 0 && activeVouchers.length === 0) {
          response += `Momentan nu avem oferte active, dar verifică des - adăugăm oferte noi constant!\n\n`;
        }

        return response + `💡 Poți solicita vouchere personalizate contactându-ne!`;
      } catch (error) {
        return `🎁 **Vouchere și oferte:**\n\n✨ Avem oferte speciale active permanent!\n🎟️ Poți solicita vouchere personalizate\n💰 Reduceri de până la 50% la produse selectate\n\nVerifică secțiunea "Oferte Speciale" sau "Vouchere" din meniu!`;
      }
    }

    // Comandă - cu statistici LIVE
    if (message.includes('comand') || message.includes('cumpăr') || message.includes('coș') || message.includes('checkout')) {
      try {
        const totalOrders = await prisma.order.count();
        const recentOrders = await prisma.order.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        });

        return `🛒 **Cum plasez o comandă:**

1️⃣ Adaugă produsele în coș
2️⃣ Mergi la coș și verifică produsele
3️⃣ Apasă "Finalizează comanda"
4️⃣ Completează datele de livrare
5️⃣ Alege metoda de plată
6️⃣ Confirmă comanda

✅ Vei primi un email de confirmare imediat!

📊 **Statistici:** ${totalOrders} comenzi procesate cu succes, ${recentOrders} în ultima săptămână!`;
      } catch (error) {
        return `🛒 **Cum plasez o comandă:**\n\n1️⃣ Adaugă produsele în coș\n2️⃣ Mergi la coș și verifică produsele\n3️⃣ Apasă "Finalizează comanda"\n4️⃣ Completează datele de livrare\n5️⃣ Alege metoda de plată\n6️⃣ Confirmă comanda\n\nVei primi un email de confirmare imediat!`;
      }
    }

    // Cont
    if (message.includes('cont') || message.includes('profil') || message.includes('înregistr') || message.includes('parola')) {
      return `👤 **Contul tău:**

Pentru a crea un cont:
1. Apasă pe "Înregistrare" din meniu
2. Completează datele
3. Verifică emailul

**Beneficii cont:**
✅ Istoric comenzi
✅ Salvare adrese
✅ Vouchere personalizate
✅ Produse favorite`;
    }

    // Produse - cu date LIVE din baza de date
    if (message.includes('produs') || message.includes('catalog') || message.includes('categor') || message.includes('stoc')) {
      try {
        const [totalProducts, categories, topProducts] = await Promise.all([
          prisma.dataItem.count({ where: { status: 'published' } }),
          prisma.category.findMany({ take: 5 }),
          prisma.dataItem.findMany({
            where: { status: 'published', stock: { gt: 0 } },
            take: 3,
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        let response = `📦 **Catalogul nostru:**\n\nAvem **${totalProducts} produse** disponibile!\n\n`;
        
        if (categories.length > 0) {
          response += `📂 **Categorii:**\n`;
          categories.forEach(cat => response += `• ${cat.icon} ${cat.name}\n`);
          response += '\n';
        }

        if (topProducts.length > 0) {
          response += `⭐ **Produse noi:**\n`;
          topProducts.forEach(p => response += `• ${p.title} - ${p.price.toFixed(2)} RON\n`);
        }

        return response + '\n🔍 Caută produse pe site sau contactează-ne pentru recomandări!';
      } catch (error) {
        return `📦 **Despre produse:**\n\nAvem o gamă variată de produse în mai multe categorii!\n\n🔍 Poți căuta produse folosind bara de căutare\n📂 Filtrează după categorii\n⭐ Vezi produsele favorite\n🏷️ Verifică ofertele speciale`;
      }
    }

    // Locație
    if (message.includes('unde') || message.includes('adres') || message.includes('locație') || message.includes('magazin fizic')) {
      return `📍 **Locația magazinului:**

**Adresă:** Str. Gari nr. 69, Galați, România
**Cod poștal:** 08001

Poți vizita magazinul fizic în programul:
- Luni - Vineri: 9:00 - 18:00
- Sâmbătă: 10:00 - 14:00
- Duminică: Închis`;
    }

    // Salut / Bună
    if (message.includes('bună') || message.includes('salut') || message.includes('hey') || message.includes('hello')) {
      return `👋 Bună! Sunt asistentul virtual al magazinului.

Cu ce te pot ajuta astăzi?

Pot să-ți ofer informații despre:
📦 Produse și comenzi
🚚 Livrare și transport
💳 Metode de plată
🔄 Returnări
🎁 Vouchere și oferte
📞 Contact și program`;
    }

    // Mulțumesc
    if (message.includes('mulțum') || message.includes('mersi') || message.includes('thanks')) {
      return `Cu plăcere! 😊 Dacă mai ai nevoie de ajutor, sunt aici!

Pentru asistență suplimentară:
📧 crys.cristi@yahoo.com
📱 0753615742`;
    }

    // Status comandă
    if (message.includes('status') || message.includes('comanda mea') || message.includes('unde este') || message.includes('tracking')) {
      return `📦 **Status comandă:**

Pentru a verifica statusul comenzii tale:
1️⃣ Intră în cont pe site
2️⃣ Mergi la **Istoric Comenzi** (/order-history)
3️⃣ Vezi toate comenzile și statusul lor în timp real

Statusuri posibile:
✅ **Confirmată** - Comanda a fost primită
📦 **În pregătire** - Pregătim produsele
🚚 **În livrare** - Comanda este pe drum (vei primi cod tracking)
✅ **Livrată** - Comanda a ajuns la destinație

Pentru detalii suplimentare:
📧 crys.cristi@yahoo.com
📱 0753615742`;
    }

    // Pagini și navigare
    if (message.includes('pagina') || message.includes('unde găsesc') || message.includes('unde pot') || message.includes('secțiune')) {
      return `📄 **Pagini disponibile pe site:**

🏠 **Pagina principală** (/) - Produse featured, oferte
🛍️ **Magazin** (/shop) - Toate produsele
📂 **Categorii** - Produse organizate pe categorii
🎁 **Oferte** (/offers) - Oferte speciale active
🎟️ **Vouchere** (/vouchers) - Vouchere disponibile
📞 **Contact** (/contact) - Informații de contact și hartă
ℹ️ **Despre noi** (/about) - Informații despre fermă
📜 **Istoric comenzi** (/order-history) - Comenzile tale
👤 **Profil** (/profile) - Setări cont

💡 Toate informațiile de contact le găsești și în **footer-ul paginii**!`;
    }

    // Traduceri
    if (message.includes('limba') || message.includes('engleză') || message.includes('română') || message.includes('traducere') || message.includes('language')) {
      return `🌐 **Traduceri și limbi:**

Site-ul nostru este disponibil în:
🇷🇴 **Română** (limba principală)
🇬🇧 **Engleză** (English)

Pentru a schimba limba:
1️⃣ Caută butonul de limbă în header (sus, dreapta)
2️⃣ Selectează limba dorită
3️⃣ Toate textele se vor traduce automat

✅ Produsele, categoriile și paginile sunt traduse complet!`;
    }

    // Carousel
    if (message.includes('carousel') || message.includes('carusel') || message.includes('slider') || message.includes('featured')) {
      return `🎠 **Despre Carousel:**

Carousel-ul (slider-ul) de pe pagina principală afișează:
⭐ **Produse featured** - Selectate de admin
🔥 **Produse populare** - Cele mai vândute
🎁 **Oferte speciale** - Reduceri active
🆕 **Produse noi** - Adăugate recent

Produsele din carousel sunt actualizate regulat de echipa noastră pentru a-ți oferi cele mai bune recomandări!

💡 Apasă pe orice produs din carousel pentru detalii complete.`;
    }

    // Schimb valutar
    if (message.includes('valută') || message.includes('monedă') || message.includes('euro') || message.includes('dolar') || message.includes('currency')) {
      return `💱 **Schimb valutar:**

Site-ul nostru suportă multiple monede:
💰 **RON** (Lei români) - moneda principală
💶 **EUR** (Euro)
💵 **USD** (Dolari americani)
...și altele

**Cum funcționează:**
✅ Cursul valutar se actualizează **automat** zilnic
✅ Prețurile se convertesc în timp real
✅ Poți selecta moneda dorită din header
✅ Plata se face în moneda selectată

💡 Cursurile sunt actualizate de la surse oficiale pentru acuratețe maximă!`;
    }

    // Ferma / Locație
    if (message.includes('fermă') || message.includes('ferma') || message.includes('unde sunteți') || message.includes('locație') || message.includes('adresă')) {
      try {
        const mainLocation = await prisma.deliveryLocation.findFirst({
          where: { isMainLocation: true },
        });

        if (mainLocation) {
          return `🏡 **Despre ferma noastră:**

📍 **Locație:**
${mainLocation.name || 'Ferma noastră'}
${mainLocation.address}
${mainLocation.city}, ${mainLocation.county || 'Județul Galați'}

📞 **Contact:**
📧 Email: crys.cristi@yahoo.com
📱 Telefon: 0753615742

🕐 **Program vizite:**
Luni - Vineri: 9:00 - 18:00
Sâmbătă: 10:00 - 14:00
Duminică: Închis

💡 Poți ridica comenzile personal de la fermă sau poți vizita pentru a vedea produsele!

🗺️ Vezi locația exactă pe pagina **/contact**`;
        }
      } catch (error) {
        // Continue to default
      }

      return `🏡 **Despre ferma noastră:**

📍 **Locație:** Str. Gari nr. 69, Galați, România
📧 **Email:** crys.cristi@yahoo.com
📱 **Telefon:** 0753615742

🕐 **Program:**
Luni - Vineri: 9:00 - 18:00
Sâmbătă: 10:00 - 14:00
Duminică: Închis

💡 Vezi locația exactă pe pagina **/contact**`;
    }

    // Căutare produse specifice
    try {
      const searchTerms = message.split(' ').filter(word => word.length > 3);
      if (searchTerms.length > 0) {
        const products = await prisma.dataItem.findMany({
          where: {
            status: 'published',
            OR: searchTerms.map(term => ({
              title: { contains: term, mode: 'insensitive' as any },
            })),
          },
          take: 3,
        });

        if (products.length > 0) {
          let response = `🔍 **Am găsit produse care te-ar putea interesa:**\n\n`;
          products.forEach((p: any) => {
            response += `📦 **${p.title}**\n`;
            
            // Price with unit
            let priceInfo = `   💰 Preț: ${p.price.toFixed(2)} RON`;
            if (p.unitType && p.unitType !== 'piece') {
              priceInfo += `/${p.unitName || p.unitType}`;
            }
            response += priceInfo + '\n';
            
            // Discount
            if (p.oldPrice && p.oldPrice > p.price) {
              const discount = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
              response += `   🏷️ Reducere: ${discount}% (era ${p.oldPrice.toFixed(2)} RON)\n`;
            }
            
            // Stock based on display mode
            if (p.stockDisplayMode === 'visible' && p.stock > 0) {
              response += `   ✅ În stoc (${p.stock} ${p.unitName || 'buc'})\n`;
            } else if (p.stockDisplayMode === 'status_only') {
              response += p.stock > 0 ? `   ✅ În stoc\n` : `   ❌ Stoc epuizat\n`;
            } else if (p.stockDisplayMode !== 'hidden' && p.stock === 0) {
              response += `   ❌ Stoc epuizat\n`;
            }
            // If hidden, don't show stock at all
            
            // Quantity info
            if (p.minQuantity && p.minQuantity > 1) {
              response += `   📏 Cantitate minimă: ${p.minQuantity} ${p.unitName || 'buc'}\n`;
            }
            
            response += '\n';
          });
          return response + `💡 Caută pe site pentru mai multe detalii sau contactează-ne!`;
        }
      }
    } catch (error) {
      // Continue to default response
    }

    // Răspuns implicit
    return `Îmi pare rău, nu am înțeles exact întrebarea. 🤔

Pot să te ajut cu informații despre:
📦 **Produse** - catalog, stoc, categorii
🚚 **Livrare** - timpi, costuri, tracking
💳 **Plată** - metode acceptate
🔄 **Returnări** - politica de returnare
🎁 **Oferte** - vouchere și reduceri
📞 **Contact** - program, telefon, email
📄 **Pagini** - unde găsești informații
🌐 **Traduceri** - limbi disponibile
📦 **Status comandă** - urmărire comenzi

💡 **Informații de contact le găsești și pe pagina /contact și în footer!**

Sau contactează-ne direct:
📧 crys.cristi@yahoo.com
📱 0753615742`;
  }

  /**
   * Get comprehensive real-time platform data for AI context
   */
  private async getPlatformContext(): Promise<string> {
    try {
      const [
        totalProducts,
        totalOrders,
        recentOrders,
        categories,
        activeOffers,
        activeVouchers,
        topProducts,
        deliveryMethods,
        paymentMethods,
        deliveryLocations,
        siteConfig,
        pages,
        giftRules,
      ] = await Promise.all([
        prisma.dataItem.count({ where: { status: 'published' } }),
        prisma.order.count(),
        prisma.order.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.category.findMany({ 
          take: 20,
          include: {
            subcategories: true,
          }
        }),
        prisma.offer.findMany({
          where: { active: true, validUntil: { gte: new Date() } },
          take: 10,
        }),
        prisma.voucher.findMany({
          where: { isActive: true },
          take: 10,
        }),
        prisma.dataItem.findMany({
          where: { status: 'published', stock: { gt: 0 } },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { category: true },
        }),
        prisma.deliverySettings.findMany({
          where: { isActive: true },
        }),
        prisma.paymentMethod.findMany({
          where: { isActive: true },
        }),
        prisma.deliveryLocation.findMany({
          where: { isActive: true },
          take: 10,
        }),
        prisma.siteConfig.findMany(),
        prisma.page.findMany({
          where: { isPublished: true },
          select: { slug: true, title: true, metaDescription: true },
        }),
        prisma.giftRule.findMany({
          where: { isActive: true },
          take: 5,
        }),
      ]);

      let context = `\n\n=== DATE LIVE DIN PLATFORMĂ ===\n\n`;
      
      // Statistici generale
      context += `📊 STATISTICI:\n`;
      context += `- Total produse disponibile: ${totalProducts}\n`;
      context += `- Total comenzi procesate: ${totalOrders}\n`;
      context += `- Comenzi în ultima săptămână: ${recentOrders}\n\n`;

      // Configurație site
      if (siteConfig.length > 0) {
        context += `⚙️ CONFIGURAȚIE SITE:\n`;
        siteConfig.forEach((config: any) => {
          if (config.key && config.value) {
            context += `- ${config.key}: ${config.value}\n`;
          }
        });
        context += '\n';
      }

      // Pagini disponibile
      if (pages.length > 0) {
        context += `📄 PAGINI DISPONIBILE:\n`;
        pages.forEach((page: any) => {
          context += `- /${page.slug} - ${page.title}`;
          if (page.metaDescription) {
            context += ` (${page.metaDescription})`;
          }
          context += '\n';
        });
        context += '\n';
      }

      // Categorii și subcategorii
      if (categories.length > 0) {
        context += `📂 CATEGORII ȘI SUBCATEGORII:\n`;
        categories.forEach((cat: any) => {
          context += `- ${cat.icon} ${cat.name}`;
          if (cat.subcategories && cat.subcategories.length > 0) {
            context += ` (Subcategorii: ${cat.subcategories.map((sub: any) => sub.name).join(', ')})`;
          }
          context += '\n';
        });
        context += '\n';
      }

      // Produse
      if (topProducts.length > 0) {
        context += `🛍️ PRODUSE DISPONIBILE (exemple):\n`;
        topProducts.forEach((p: any) => {
          // Stock display logic
          let stockInfo = '';
          if (p.stockDisplayMode === 'visible' && p.stock > 0) {
            stockInfo = `În stoc (${p.stock} ${p.unitName || 'buc'})`;
          } else if (p.stockDisplayMode === 'status_only') {
            stockInfo = p.stock > 0 ? 'În stoc' : 'Stoc epuizat';
          } else if (p.stockDisplayMode === 'hidden') {
            stockInfo = ''; // Nu afișa nimic despre stoc
          } else if (p.stock === 0) {
            stockInfo = 'Stoc epuizat';
          }

          // Unit and price info
          let priceInfo = `${p.price.toFixed(2)} RON`;
          if (p.unitType && p.unitType !== 'piece') {
            priceInfo += `/${p.unitName || p.unitType}`;
          }
          if (p.priceType === 'per_unit') {
            priceInfo += ` (preț per ${p.unitName || 'unitate'})`;
          }

          context += `- ${p.title}: ${priceInfo}`;
          
          if (p.oldPrice && p.oldPrice > p.price) {
            const discount = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
            context += ` (reducere ${discount}%, era ${p.oldPrice.toFixed(2)} RON)`;
          }
          
          if (stockInfo) {
            context += ` - ${stockInfo}`;
          }
          
          if (p.category) {
            context += ` - Categorie: ${p.category.name}`;
          }
          
          // Quantity info
          if (p.minQuantity && p.minQuantity > 1) {
            context += ` - Cantitate minimă: ${p.minQuantity} ${p.unitName || 'buc'}`;
          }
          if (p.maxQuantity) {
            context += ` - Cantitate maximă: ${p.maxQuantity} ${p.unitName || 'buc'}`;
          }
          
          context += '\n';
        });
        context += '\n';
      }

      // Metode de livrare
      if (deliveryMethods.length > 0) {
        context += `🚚 METODE DE LIVRARE:\n`;
        deliveryMethods.forEach((method: any) => {
          context += `- ${method.name}`;
          if (method.type === 'pickup') {
            context += ` (Ridicare personală)`;
          } else {
            context += ` (Curier)`;
          }
          if (method.deliveryTimeHours) {
            context += ` - ${method.deliveryTimeHours} ore`;
          }
          if (method.deliveryTimeDays) {
            context += ` - ${method.deliveryTimeDays} zile`;
          }
          if (method.cost !== undefined && method.cost !== null) {
            context += ` - Cost: ${method.cost} RON`;
          }
          if (method.description) {
            context += ` - ${method.description}`;
          }
          context += '\n';
        });
        context += '\n';
      }

      // Metode de plată
      if (paymentMethods.length > 0) {
        context += `💳 METODE DE PLATĂ:\n`;
        paymentMethods.forEach((method: any) => {
          context += `- ${method.name}`;
          if (method.description) {
            context += ` - ${method.description}`;
          }
          context += '\n';
        });
        context += '\n';
      }

      // Locații de livrare
      if (deliveryLocations.length > 0) {
        context += `📍 LOCAȚII/ZONE DE LIVRARE:\n`;
        deliveryLocations.forEach((loc: any) => {
          context += `- ${loc.name || loc.address}, ${loc.city}`;
          if (loc.isMainLocation) {
            context += ` (Sediu principal/Fermă)`;
          }
          context += '\n';
        });
        context += '\n';
      }

      // Oferte active
      if (activeOffers.length > 0) {
        context += `🎁 OFERTE ACTIVE:\n`;
        activeOffers.forEach((offer: any) => {
          const validDate = new Date(offer.validUntil).toLocaleDateString('ro-RO');
          context += `- ${offer.title}: ${offer.discount}% reducere (până la ${validDate})`;
          if (offer.description) {
            context += ` - ${offer.description}`;
          }
          context += '\n';
        });
        context += '\n';
      }

      // Vouchere active
      if (activeVouchers.length > 0) {
        context += `🎟️ VOUCHERE ACTIVE:\n`;
        activeVouchers.forEach((v: any) => {
          const discount = v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : `${v.discountValue} RON`;
          context += `- Cod: ${v.code} - ${discount} reducere`;
          if (v.description) {
            context += ` - ${v.description}`;
          }
          if (v.minOrderValue) {
            context += ` (Comandă minimă: ${v.minOrderValue} RON)`;
          }
          if (v.maxUses) {
            context += ` (Utilizări: ${v.usedCount || 0}/${v.maxUses})`;
          }
          context += '\n';
        });
        context += '\n';
      }

      // Reguli cadouri
      if (giftRules.length > 0) {
        context += `🎁 PRODUSE CADOU (Reguli active):\n`;
        giftRules.forEach((rule: any) => {
          context += `- ${rule.name}`;
          if (rule.minOrderValue) {
            context += ` - La comenzi peste ${rule.minOrderValue} RON`;
          }
          if (rule.description) {
            context += ` - ${rule.description}`;
          }
          context += '\n';
        });
        context += '\n';
      }

      context += `\n=== SFATURI PENTRU RĂSPUNSURI ===\n`;
      context += `- Când utilizatorul întreabă despre CONTACT, menționează că informațiile sunt disponibile și pe pagina /contact\n`;
      context += `- Când întreabă despre PRODUSE, sugerează să viziteze /shop sau categoriile specifice\n`;
      context += `- Pentru COMENZI, explică procesul și menționează că pot vedea istoricul în /order-history\n`;
      context += `- Pentru VOUCHERE, explică cum se aplică și menționează pagina /vouchers\n`;
      context += `- Pentru LIVRARE, folosește datele LIVE de mai sus\n`;
      context += `- Pentru BLOCARE COMENZI, explică motivul și când se va ridica blocarea\n`;
      context += `- Menționează că site-ul are TRADUCERI (română/engleză) disponibile\n`;
      context += `- Carousel-ul afișează produse featured/recomandate\n`;
      context += `- Schimbul valutar se actualizează automat pentru prețuri\n`;

      return context;
    } catch (error) {
      console.error('Error getting platform context:', error);
      return '';
    }
  }

  /**
   * Chat completion for AI assistant
   */
  async chatCompletion(messages: ChatMessage[]): Promise<string> {
    if (!this.isEnabled()) {
      // Use fallback responses when OpenAI is not available
      const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
      if (lastUserMessage) {
        return await this.getFallbackResponse(lastUserMessage.content);
      }
      return 'Bună! Cu ce te pot ajuta astăzi? 😊';
    }

    try {
      // Get real-time platform data
      const platformContext = await this.getPlatformContext();

      // Add system message with comprehensive instructions
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `Ești un asistent virtual EXPERT pentru magazinul online Full Stack E-Commerce App. Răspunde ÎNTOTDEAUNA în limba română.

📍 INFORMAȚII CONTACT:
- Nume: Full Stack E-Commerce Shop
- Locație/Fermă: Str. Gari nr. 69, Galați, România, Cod poștal: 08001
- Email: crys.cristi@yahoo.com
- Telefon: 0753615742
- Program magazin fizic: Luni-Vineri 9:00-18:00, Sâmbătă 10:00-14:00, Duminică închis
- Magazin online: Non-stop (24/7)

${platformContext}

🎯 REGULI CRITICE:
1. Folosește DOAR datele LIVE de mai sus - NU inventa informații!
2. Când vorbești despre LIVRARE, PLATĂ, PRODUSE, OFERTE, VOUCHERE - citează datele LIVE
3. Când utilizatorul întreabă despre CONTACT, menționează că informațiile sunt disponibile și pe pagina /contact și în footer
4. Pentru COMENZI, explică procesul și menționează /order-history pentru istoric
5. Pentru VOUCHERE, explică cum se aplică și menționează /vouchers
6. Pentru PRODUSE, sugerează /shop sau categoriile specifice
7. Dacă există BLOCĂRI COMENZI active, explică motivul și când se ridică
8. Site-ul are TRADUCERI (română/engleză) - menționează dacă e relevant
9. Carousel-ul afișează produse featured/recomandate selectate de admin
10. Schimbul valutar se actualizează automat - prețurile se afișează în moneda selectată

📦 DESPRE PRODUSE:
- Explică categoriile și subcategoriile disponibile
- Menționează stocul DOAR dacă stockDisplayMode = "visible" (afișează cantitatea exactă)
- Dacă stockDisplayMode = "status_only", spune doar "În stoc" sau "Stoc epuizat"
- Dacă stockDisplayMode = "hidden", NU menționa NIMIC despre stoc
- Explică unitățile de măsură (kg, litru, bucată, gram, ml)
- Menționează prețul per unitate (ex: "15 RON/kg", "8 RON/litru")
- Explică cantitatea minimă/maximă de comandă dacă există
- Sugerează produse similare din aceeași categorie
- Explică reducerile active (preț vechi vs nou, procent reducere)

🎁 DESPRE CADOURI ȘI VOUCHERE:
- Explică regulile de cadouri (la ce sumă se primesc)
- Cum se generează și se folosesc voucherele
- Coduri active și condiții de utilizare

🚚 DESPRE LIVRARE:
- Folosește DOAR datele LIVE despre metode și timpi
- Explică zonele de livrare disponibile
- Menționează tracking-ul comenzilor

🚫 DESPRE BLOCĂRI:
- Dacă există blocări active, explică clar motivul
- Menționează când se va ridica blocarea
- Sugerează alternative (ex: ridicare personală)

💡 STIL DE RĂSPUNS:
- Fii prietenos, profesional și concis
- Folosește emoji-uri pentru claritate
- Structurează răspunsurile cu bullet points
- Menționează paginile relevante din site
- Dacă nu știi ceva specific, sugerează contactarea echipei

❌ NU FACE:
- NU inventa informații despre timpi de livrare, prețuri sau produse
- NU da informații vechi - folosește doar datele LIVE
- NU ignora blocările active de comenzi
- NU uita să menționezi paginile relevante din site`,
      };

      const allMessages = messages[0]?.role === 'system' 
        ? messages 
        : [systemMessage, ...messages];

      const completion = await this.client!.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: allMessages as any,
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || 'Îmi pare rău, nu am putut genera un răspuns. Te rog încearcă din nou.';
    } catch (error) {
      console.error('Error in chat completion:', error);
      throw new Error('Failed to get AI response. Please try again.');
    }
  }

  /**
   * Moderate content using OpenAI moderation API
   */
  async moderateContent(text: string): Promise<ModerationResult> {
    if (!this.isEnabled()) {
      return { flagged: false, categories: {} };
    }

    try {
      const moderation = await this.client!.moderations.create({
        input: text,
      });

      const result = moderation.results[0];
      
      return {
        flagged: result.flagged,
        categories: result.categories as unknown as Record<string, boolean>,
      };
    } catch (error) {
      console.error('Error moderating content:', error);
      // Fail open - don't block content if moderation fails
      return { flagged: false, categories: {} };
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
