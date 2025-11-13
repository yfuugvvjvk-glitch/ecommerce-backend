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

    // Livrare
    if (message.includes('livrare') || message.includes('livrez') || message.includes('transport') || message.includes('curier')) {
      return `🚚 **Informații despre livrare:**

📦 **Livrare standard:** 2-3 zile lucrătoare
⚡ **Livrare express:** 24 ore

Livrăm în toată România prin curier rapid. Vei primi un cod de tracking pentru a urmări comanda.`;
    }

    // Plată
    if (message.includes('plat') || message.includes('card') || message.includes('cash') || message.includes('ramburs')) {
      return `💳 **Metode de plată acceptate:**

✅ Card bancar (online)
✅ Transfer bancar
✅ Ramburs la livrare (cash sau card la curier)

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
          products.forEach(p => {
            const stock = p.stock > 0 ? `✅ În stoc (${p.stock} buc)` : '❌ Stoc epuizat';
            response += `📦 **${p.title}**\n`;
            response += `   💰 Preț: ${p.price.toFixed(2)} RON\n`;
            if (p.oldPrice && p.oldPrice > p.price) {
              const discount = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
              response += `   🏷️ Reducere: ${discount}% (era ${p.oldPrice.toFixed(2)} RON)\n`;
            }
            response += `   ${stock}\n\n`;
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

Sau contactează-ne direct:
📧 crys.cristi@yahoo.com
📱 0753615742`;
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
      // Add system message if not present
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `Ești un asistent virtual pentru magazinul online Full Stack E-Commerce App. Răspunde ÎNTOTDEAUNA în limba română.

INFORMAȚII DESPRE MAGAZIN:
- Nume: Full Stack E-Commerce Shop
- Locație: Str. Gari nr. 69, Galați, România, Cod poștal: 08001
- Email: crys.cristi@yahoo.com
- Telefon: 0753615742
- Program magazin fizic: Luni-Vineri 9:00-18:00, Sâmbătă 10:00-14:00, Duminică închis
- Magazin online: Non-stop

POLITICI:
- Livrare: 2-3 zile lucrătoare (standard), 24h (express)
- Metode de plată: Card, transfer bancar, ramburs
- Returnări: 30 de zile pentru produse în stare originală
- Vouchere și oferte speciale disponibile

AJUTĂ CLIENȚII CU:
- Informații despre produse și recomandări
- Status comenzi și livrare
- Returnări și rambursări
- Întrebări generale despre cumpărături
- Vouchere și oferte speciale
- Informații de contact

Fii prietenos, profesional și concis. Răspunde în română. Dacă nu știi ceva specific, sugerează contactarea echipei de suport.`,
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

      return completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
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
