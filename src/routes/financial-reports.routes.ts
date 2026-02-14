import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { financialReportService } from '../services/financial-report.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function financialReportsRoutes(fastify: FastifyInstance) {
  // GET /api/admin/financial-reports - Get financial reports
  fastify.get(
    '/admin/financial-reports',
    {
      preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        const { period } = request.query as { period?: 'week' | 'month' | 'year' };
        const data = await financialReportService.getFinancialReport({ period: period || 'month' });
        reply.send(data);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // POST /api/admin/transactions - Create manual transaction
  fastify.post(
    '/admin/transactions',
    {
      preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        console.log('📝 Creating transaction with body:', request.body);
        
        const { name, amount, type, category, description, date, paymentMethod, isRecurring, recurringPeriod } = request.body as {
          name: string;
          amount: number;
          type: 'INCOME' | 'EXPENSE';
          category: string;
          description?: string;
          date?: string;
          paymentMethod?: string;
          isRecurring?: boolean;
          recurringPeriod?: string;
        };

        const user = (request as any).user;
        console.log('👤 User from request:', user);
        
        if (!user || !user.userId) {
          console.error('❌ No user ID found in request');
          return reply.code(401).send({ error: 'User not authenticated' });
        }

        const transaction = await prisma.transaction.create({
          data: {
            name,
            amount: type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount),
            type,
            category,
            description,
            date: date ? new Date(date) : new Date(),
            paymentMethod,
            isRecurring: isRecurring || false,
            recurringPeriod,
            createdById: user.userId // Changed from user.id to user.userId
          }
        });

        console.log('✅ Transaction created:', transaction.id);
        reply.send(transaction);
      } catch (error: any) {
        console.error('❌ Error creating transaction:', error);
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // GET /api/admin/transactions - Get transactions
  fastify.get(
    '/admin/transactions',
    {
      preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        const { startDate, endDate, type, category } = request.query as {
          startDate?: string;
          endDate?: string;
          type?: string;
          category?: string;
        };

        const where: any = {};

        if (startDate && endDate) {
          where.date = {
            gte: new Date(startDate),
            lte: new Date(endDate)
          };
        }

        if (type) {
          where.type = type;
        }

        if (category) {
          where.category = category;
        }

        const transactions = await prisma.transaction.findMany({
          where,
          orderBy: {
            date: 'desc'
          }
        });

        reply.send(transactions);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // PUT /api/admin/transactions/:id - Update transaction
  fastify.put(
    '/admin/transactions/:id',
    {
      preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { name, amount, type, category, description, date, paymentMethod, isRecurring, recurringPeriod } = request.body as {
          name?: string;
          amount?: number;
          type?: 'INCOME' | 'EXPENSE';
          category?: string;
          description?: string;
          date?: string;
          paymentMethod?: string;
          isRecurring?: boolean;
          recurringPeriod?: string;
        };

        const updateData: any = {};

        if (name !== undefined) updateData.name = name;
        if (amount !== undefined && type !== undefined) {
          updateData.amount = type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount);
        }
        if (type !== undefined) updateData.type = type;
        if (category !== undefined) updateData.category = category;
        if (description !== undefined) updateData.description = description;
        if (date !== undefined) updateData.date = new Date(date);
        if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
        if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
        if (recurringPeriod !== undefined) updateData.recurringPeriod = recurringPeriod;

        const transaction = await prisma.transaction.update({
          where: { id },
          data: updateData
        });

        reply.send(transaction);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // DELETE /api/admin/transactions/:id - Delete transaction
  fastify.delete(
    '/admin/transactions/:id',
    {
      preHandler: [authMiddleware, adminMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        await prisma.transaction.delete({
          where: { id }
        });

        reply.send({ success: true });
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );
}
