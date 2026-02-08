import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TestCardService {
  // DOAR ADMINII pot crea carduri de test
  async createTestCard(adminId: string, cardData: {
    cardNumber: string;
    cardHolder: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    cardType: string;
    balance?: number;
  }) {
    // Verifică dacă utilizatorul este admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Doar administratorii pot crea carduri de test');
    }

    // Verifică dacă cardul există deja
    const existingCard = await prisma.testCard.findUnique({
      where: { cardNumber: cardData.cardNumber }
    });

    if (existingCard) {
      throw new Error('Un card cu acest număr există deja');
    }

    return await prisma.testCard.create({
      data: {
        ...cardData,
        balance: cardData.balance || 1000,
        createdBy: adminId,
      }
    });
  }

  // DOAR ADMINII pot obține toate cardurile de test
  async getAllTestCards(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Doar administratorii pot vizualiza cardurile de test');
    }

    return await prisma.testCard.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  // Validează un card de test pentru plată (DOAR pentru procesarea plăților)
  async validateTestCard(cardNumber: string, cvv: string, expiryMonth: number, expiryYear: number) {
    const card = await prisma.testCard.findUnique({
      where: { cardNumber }
    });

    if (!card) {
      return { valid: false, error: 'Card inexistent' };
    }

    if (!card.isActive) {
      return { valid: false, error: 'Card dezactivat' };
    }

    if (card.cvv !== cvv) {
      return { valid: false, error: 'CVV incorect' };
    }

    if (card.expiryYear < new Date().getFullYear() || 
        (card.expiryYear === new Date().getFullYear() && card.expiryMonth < new Date().getMonth() + 1)) {
      return { valid: false, error: 'Card expirat' };
    }

    return { valid: true, card };
  }

  // Procesează plata cu card de test
  async processTestCardPayment(userId: string, orderId: string, cardData: {
    cardNumber: string;
    cvv: string;
    expiryMonth: number;
    expiryYear: number;
    amount: number;
  }) {
    const validation = await this.validateTestCard(
      cardData.cardNumber,
      cardData.cvv,
      cardData.expiryMonth,
      cardData.expiryYear
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const card = validation.card!;

    if (card.balance < cardData.amount) {
      throw new Error('Fonduri insuficiente pe card');
    }

    // Scade suma din balanța cardului
    await prisma.testCard.update({
      where: { id: card.id },
      data: { balance: card.balance - cardData.amount }
    });

    // Creează tranzacția
    const transaction = await prisma.cardTransaction.create({
      data: {
        userId,
        testCardId: card.id,
        orderId,
        amount: cardData.amount,
        type: 'PAYMENT',
        status: 'COMPLETED',
        cardLast4: card.cardNumber.slice(-4),
        cardType: card.cardType,
        description: `Plată comandă #${orderId.slice(0, 8)}`
      }
    });

    return { success: true, transaction };
  }

  // Returnează banii în card la anularea comenzii
  async refundTestCardPayment(orderId: string) {
    const transaction = await prisma.cardTransaction.findUnique({
      where: { orderId },
      include: { testCard: true }
    });

    if (!transaction || !transaction.testCard) {
      throw new Error('Tranzacția nu a fost găsită');
    }

    if (transaction.status !== 'COMPLETED') {
      throw new Error('Tranzacția nu poate fi returnată');
    }

    // Returnează suma în card
    await prisma.testCard.update({
      where: { id: transaction.testCard.id },
      data: { balance: transaction.testCard.balance + transaction.amount }
    });

    // Marchează tranzacția ca returnată
    await prisma.cardTransaction.update({
      where: { id: transaction.id },
      data: { 
        status: 'REFUNDED',
        description: `${transaction.description} - RETURNAT`
      }
    });

    return { success: true, refundedAmount: transaction.amount };
  }

  // DOAR ADMINII pot actualiza carduri de test
  async updateTestCard(adminId: string, cardId: string, updateData: {
    cardHolder?: string;
    balance?: number;
    isActive?: boolean;
  }) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Doar administratorii pot modifica cardurile de test');
    }

    return await prisma.testCard.update({
      where: { id: cardId },
      data: updateData
    });
  }

  // DOAR ADMINII pot șterge carduri de test
  async deleteTestCard(adminId: string, cardId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Doar administratorii pot șterge cardurile de test');
    }

    return await prisma.testCard.delete({
      where: { id: cardId }
    });
  }

  // DOAR ADMINII pot genera carduri de test predefinite
  async generateDefaultTestCards(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Doar administratorii pot genera carduri de test');
    }

    const defaultCards = [
      {
        cardNumber: '4111111111111111',
        cardHolder: 'TEST USER VISA',
        expiryMonth: 12,
        expiryYear: 2028,
        cvv: '123',
        cardType: 'VISA',
        balance: 5000
      },
      {
        cardNumber: '5555555555554444',
        cardHolder: 'TEST USER MASTERCARD',
        expiryMonth: 6,
        expiryYear: 2027,
        cvv: '456',
        cardType: 'MASTERCARD',
        balance: 3000
      },
      {
        cardNumber: '378282246310005',
        cardHolder: 'TEST USER AMEX',
        expiryMonth: 9,
        expiryYear: 2026,
        cvv: '1234',
        cardType: 'AMEX',
        balance: 10000
      }
    ];

    const createdCards = [];
    for (const cardData of defaultCards) {
      try {
        const card = await this.createTestCard(adminId, cardData);
        createdCards.push(card);
      } catch (error) {
        // Ignoră erorile pentru cardurile care există deja
        console.log(`Card ${cardData.cardNumber} already exists`);
      }
    }

    return createdCards;
  }

  // Obține cardurile de test disponibile pentru utilizatori (fără informații sensibile)
  async getAvailableTestCards() {
    const cards = await prisma.testCard.findMany({
      where: { isActive: true },
      select: {
        id: true,
        cardType: true,
        cardHolder: true,
        // Nu returnăm informații sensibile
      }
    });

    return cards;
  }

  // Salvează un card de test pentru utilizator (doar referința)
  async saveTestCardForUser(userId: string, testCardId: string) {
    // Verifică dacă cardul de test există și este activ
    const testCard = await prisma.testCard.findUnique({
      where: { id: testCardId }
    });

    if (!testCard || !testCard.isActive) {
      throw new Error('Cardul de test nu este disponibil');
    }

    // Salvează doar ultimele 4 cifre pentru utilizator
    const savedCard = await prisma.savedCard.create({
      data: {
        userId,
        cardNumber: testCard.cardNumber.slice(-4),
        cardHolder: testCard.cardHolder,
        expiryMonth: testCard.expiryMonth,
        expiryYear: testCard.expiryYear,
        cardType: testCard.cardType,
        isDefault: false
      }
    });

    return savedCard;
  }
}