import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserCardService {
  // Obține cardurile salvate ale utilizatorului
  async getUserCards(userId: string) {
    try {
      const savedCards = await prisma.savedCard.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      const fictiveCards = await prisma.fictiveCard.findMany({
        where: { isActive: true },
        select: {
          id: true,
          cardNumber: true,
          cardHolder: true,
          expiryMonth: true,
          expiryYear: true,
          balance: true,
          cardType: true
        }
      });

      return {
        savedCards: savedCards.map(card => ({
          ...card,
          cardNumber: `****-****-****-${card.cardNumber}` // Afișează doar ultimele 4 cifre
        })),
        fictiveCards: fictiveCards.map(card => ({
          ...card,
          cardNumber: `****-****-****-${card.cardNumber.slice(-4)}`,
          isFictive: true
        }))
      };
    } catch (error) {
      console.error('Error fetching user cards:', error);
      throw new Error('Failed to fetch cards');
    }
  }

  // Adaugă un card real (salvează doar ultimele 4 cifre)
  async addRealCard(userId: string, cardData: {
    cardNumber: string;
    cardHolder: string;
    expiryMonth: number;
    expiryYear: number;
    cardType: string;
  }) {
    try {
      // Validare card number (basic)
      if (!/^\d{16}$/.test(cardData.cardNumber.replace(/\s/g, ''))) {
        throw new Error('Invalid card number format');
      }

      // Salvează doar ultimele 4 cifre pentru securitate
      const last4Digits = cardData.cardNumber.slice(-4);

      // Verifică dacă cardul există deja
      const existingCard = await prisma.savedCard.findFirst({
        where: {
          userId,
          cardNumber: last4Digits,
          cardHolder: cardData.cardHolder
        }
      });

      if (existingCard) {
        throw new Error('Card already exists');
      }

      // Dacă este primul card, îl face default
      const cardCount = await prisma.savedCard.count({ where: { userId } });
      const isDefault = cardCount === 0;

      const newCard = await prisma.savedCard.create({
        data: {
          userId,
          cardNumber: last4Digits,
          cardHolder: cardData.cardHolder,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          cardType: cardData.cardType,
          isDefault
        }
      });

      return {
        ...newCard,
        cardNumber: `****-****-****-${newCard.cardNumber}`
      };
    } catch (error) {
      console.error('Error adding real card:', error);
      throw error;
    }
  }

  // Șterge un card salvat
  async deleteCard(userId: string, cardId: string) {
    try {
      const card = await prisma.savedCard.findFirst({
        where: { id: cardId, userId }
      });

      if (!card) {
        throw new Error('Card not found');
      }

      await prisma.savedCard.delete({
        where: { id: cardId }
      });

      // Dacă era cardul default, face alt card default
      if (card.isDefault) {
        const nextCard = await prisma.savedCard.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' }
        });

        if (nextCard) {
          await prisma.savedCard.update({
            where: { id: nextCard.id },
            data: { isDefault: true }
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting card:', error);
      throw error;
    }
  }

  // Setează un card ca default
  async setDefaultCard(userId: string, cardId: string) {
    try {
      // Verifică dacă cardul aparține utilizatorului
      const card = await prisma.savedCard.findFirst({
        where: { id: cardId, userId }
      });

      if (!card) {
        throw new Error('Card not found');
      }

      // Elimină default de pe toate cardurile
      await prisma.savedCard.updateMany({
        where: { userId },
        data: { isDefault: false }
      });

      // Setează noul card ca default
      await prisma.savedCard.update({
        where: { id: cardId },
        data: { isDefault: true }
      });

      return { success: true };
    } catch (error) {
      console.error('Error setting default card:', error);
      throw error;
    }
  }

  // Procesează plata cu un card
  async processPayment(userId: string, paymentData: {
    cardId?: string;
    cardNumber?: string;
    amount: number;
    orderId: string;
    cardType: 'real' | 'fictive';
  }) {
    try {
      if (paymentData.cardType === 'fictive') {
        // Procesează plata cu card fictiv
        const fictiveCard = await prisma.fictiveCard.findUnique({
          where: { id: paymentData.cardId }
        });

        if (!fictiveCard) {
          throw new Error('Fictive card not found');
        }

        if (fictiveCard.balance < paymentData.amount) {
          throw new Error('Insufficient funds');
        }

        // Scade suma din balanță
        await prisma.fictiveCard.update({
          where: { id: paymentData.cardId },
          data: { balance: fictiveCard.balance - paymentData.amount }
        });

        // Înregistrează tranzacția
        await prisma.cardTransaction.create({
          data: {
            userId,
            fictiveCardId: paymentData.cardId,
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            type: 'PAYMENT',
            status: 'COMPLETED',
            cardLast4: fictiveCard.cardNumber.slice(-4),
            cardType: fictiveCard.cardType,
            description: `Payment for order ${paymentData.orderId}`
          }
        });

        return {
          success: true,
          message: 'Payment processed successfully',
          remainingBalance: fictiveCard.balance - paymentData.amount
        };
      } else {
        // Pentru carduri reale, simulează verificarea fondurilor
        const savedCard = await prisma.savedCard.findFirst({
          where: { id: paymentData.cardId, userId }
        });

        if (!savedCard) {
          throw new Error('Card not found');
        }

        // Simulează verificarea fondurilor (în realitate ar fi prin API-ul băncii)
        const hasEnoughFunds = Math.random() > 0.1; // 90% șanse de succes

        if (!hasEnoughFunds) {
          throw new Error('Insufficient funds');
        }

        // Înregistrează tranzacția
        await prisma.cardTransaction.create({
          data: {
            userId,
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            type: 'PAYMENT',
            status: 'COMPLETED',
            cardLast4: savedCard.cardNumber,
            cardType: savedCard.cardType,
            description: `Payment for order ${paymentData.orderId}`
          }
        });

        return {
          success: true,
          message: 'Payment processed successfully (real card)',
          cardLast4: savedCard.cardNumber
        };
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  // Restituie suma pe card (pentru comenzi anulate)
  async refundPayment(userId: string, orderId: string) {
    try {
      const transaction = await prisma.cardTransaction.findFirst({
        where: {
          orderId,
          type: 'PAYMENT',
          status: 'COMPLETED'
        },
        include: {
          fictiveCard: true
        }
      });

      if (!transaction) {
        throw new Error('Original payment not found');
      }

      if (transaction.fictiveCardId) {
        // Restituie pe cardul fictiv
        await prisma.fictiveCard.update({
          where: { id: transaction.fictiveCardId },
          data: {
            balance: {
              increment: transaction.amount
            }
          }
        });
      }

      // Înregistrează tranzacția de rambursare
      await prisma.cardTransaction.create({
        data: {
          userId,
          fictiveCardId: transaction.fictiveCardId,
          orderId,
          amount: transaction.amount,
          type: 'REFUND',
          status: 'COMPLETED',
          cardLast4: transaction.cardLast4,
          cardType: transaction.cardType,
          description: `Refund for order ${orderId}`
        }
      });

      return {
        success: true,
        message: 'Refund processed successfully',
        amount: transaction.amount
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Obține istoricul tranzacțiilor
  async getTransactionHistory(userId: string) {
    try {
      const transactions = await prisma.cardTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return transactions;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw new Error('Failed to fetch transaction history');
    }
  }
}

export const userCardService = new UserCardService();