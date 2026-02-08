import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PaymentService {
  // Generează carduri fictive pentru testare
  async generateFictiveCards() {
    const cards = [
      {
        cardNumber: '4111111111111111',
        cardHolder: 'JOHN DOE',
        expiryMonth: 12,
        expiryYear: 2028,
        cvv: '123',
        balance: 2500.0,
        cardType: 'VISA',
      },
      {
        cardNumber: '5555555555554444',
        cardHolder: 'JANE SMITH',
        expiryMonth: 6,
        expiryYear: 2027,
        cvv: '456',
        balance: 1800.0,
        cardType: 'MASTERCARD',
      },
      {
        cardNumber: '4000000000000002',
        cardHolder: 'TEST USER',
        expiryMonth: 3,
        expiryYear: 2029,
        cvv: '789',
        balance: 500.0,
        cardType: 'VISA',
      },
      {
        cardNumber: '5105105105105100',
        cardHolder: 'DEMO ACCOUNT',
        expiryMonth: 9,
        expiryYear: 2026,
        cvv: '321',
        balance: 3000.0,
        cardType: 'MASTERCARD',
      },
    ];

    for (const card of cards) {
      await prisma.fictiveCard.upsert({
        where: { cardNumber: card.cardNumber },
        update: card,
        create: card,
      });
    }

    return cards;
  }

  // Validează datele cardului
  validateCard(cardNumber: string, expiryMonth: number, expiryYear: number, cvv: string) {
    // Validare număr card (Luhn algorithm simplificat)
    if (!/^\d{16}$/.test(cardNumber)) {
      throw new Error('Numărul cardului trebuie să aibă 16 cifre');
    }

    // Validare dată expirare
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      throw new Error('Cardul a expirat');
    }

    // Validare CVV
    if (!/^\d{3,4}$/.test(cvv)) {
      throw new Error('CVV invalid');
    }

    return true;
  }

  // Procesează plata
  async processPayment(
    userId: string,
    orderId: string,
    amount: number,
    cardData: {
      cardNumber: string;
      cardHolder: string;
      expiryMonth: number;
      expiryYear: number;
      cvv: string;
    }
  ) {
    // Validează datele cardului
    this.validateCard(cardData.cardNumber, cardData.expiryMonth, cardData.expiryYear, cardData.cvv);

    // Găsește cardul fictiv
    const fictiveCard = await prisma.fictiveCard.findUnique({
      where: { cardNumber: cardData.cardNumber },
    });

    if (!fictiveCard) {
      throw new Error('Card invalid sau nerecunoscut');
    }

    if (!fictiveCard.isActive) {
      throw new Error('Cardul este blocat');
    }

    // Verifică CVV
    if (fictiveCard.cvv !== cardData.cvv) {
      throw new Error('CVV incorect');
    }

    // Verifică soldul
    if (fictiveCard.balance < amount) {
      throw new Error(`Sold insuficient. Disponibil: ${fictiveCard.balance.toFixed(2)} RON`);
    }

    // Procesează tranzacția
    const transaction = await prisma.$transaction(async (tx) => {
      // Scade suma din card
      await tx.fictiveCard.update({
        where: { id: fictiveCard.id },
        data: { balance: { decrement: amount } },
      });

      // Creează tranzacția
      const cardTransaction = await tx.cardTransaction.create({
        data: {
          userId,
          fictiveCardId: fictiveCard.id,
          orderId,
          amount,
          type: 'PAYMENT',
          status: 'COMPLETED',
          description: `Plată comandă #${orderId.slice(0, 8)}`,
        },
      });

      return cardTransaction;
    });

    return {
      success: true,
      transactionId: transaction.id,
      remainingBalance: fictiveCard.balance - amount,
      message: 'Plata a fost procesată cu succes',
    };
  }

  // Returnează banii (refund)
  async refundPayment(orderId: string, reason: string = 'Comandă anulată') {
    const originalTransaction = await prisma.cardTransaction.findUnique({
      where: { orderId },
      include: { fictiveCard: true },
    });

    if (!originalTransaction) {
      throw new Error('Nu s-a găsit tranzacția originală');
    }

    if (originalTransaction.type !== 'PAYMENT') {
      throw new Error('Tranzacția nu poate fi returnată');
    }

    // Verifică dacă nu s-a făcut deja refund
    const existingRefund = await prisma.cardTransaction.findFirst({
      where: {
        orderId,
        type: 'REFUND',
      },
    });

    if (existingRefund) {
      throw new Error('Refund-ul a fost deja procesat');
    }

    // Procesează refund-ul
    const refund = await prisma.$transaction(async (tx) => {
      // Adaugă suma înapoi în card
      if (originalTransaction.fictiveCard) {
        await tx.fictiveCard.update({
          where: { id: originalTransaction.fictiveCard.id },
          data: { balance: { increment: originalTransaction.amount } },
        });
      }

      // Creează tranzacția de refund
      const refundTransaction = await tx.cardTransaction.create({
        data: {
          userId: originalTransaction.userId,
          fictiveCardId: originalTransaction.fictiveCardId,
          orderId,
          amount: originalTransaction.amount,
          type: 'REFUND',
          status: 'COMPLETED',
          description: reason,
        },
      });

      return refundTransaction;
    });

    return {
      success: true,
      refundId: refund.id,
      amount: originalTransaction.amount,
      message: 'Refund-ul a fost procesat cu succes',
    };
  }

  // Salvează cardul pentru utilizator
  async saveCard(
    userId: string,
    cardData: {
      cardNumber: string;
      cardHolder: string;
      expiryMonth: number;
      expiryYear: number;
    }
  ) {
    // Salvează doar ultimele 4 cifre pentru securitate
    const lastFourDigits = cardData.cardNumber.slice(-4);
    const cardType = cardData.cardNumber.startsWith('4') ? 'VISA' : 'MASTERCARD';

    const savedCard = await prisma.savedCard.create({
      data: {
        userId,
        cardNumber: `****-****-****-${lastFourDigits}`,
        cardHolder: cardData.cardHolder,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        cardType,
      },
    });

    return savedCard;
  }

  // Obține cardurile salvate ale utilizatorului
  async getSavedCards(userId: string) {
    return await prisma.savedCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obține istoricul tranzacțiilor
  async getTransactionHistory(userId: string) {
    return await prisma.cardTransaction.findMany({
      where: { userId },
      include: {
        fictiveCard: {
          select: {
            cardNumber: true,
            cardType: true,
          },
        },
        order: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obține toate cardurile fictive (pentru admin)
  async getAllFictiveCards() {
    return await prisma.fictiveCard.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}