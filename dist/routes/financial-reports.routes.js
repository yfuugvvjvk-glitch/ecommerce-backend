"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financialReportsRoutes = financialReportsRoutes;
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const financial_report_service_1 = require("../services/financial-report.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function financialReportsRoutes(fastify) {
    // GET /api/admin/financial-reports - Get financial reports
    fastify.get('/admin/financial-reports', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware],
    }, async (request, reply) => {
        try {
            const { period } = request.query;
            const data = await financial_report_service_1.financialReportService.getFinancialReport({ period: period || 'month' });
            reply.send(data);
        }
        catch (error) {
            reply.code(500).send({ error: error.message });
        }
    });
    // POST /api/admin/transactions - Create manual transaction
    fastify.post('/admin/transactions', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware],
    }, async (request, reply) => {
        try {
            console.log('📝 Creating transaction with body:', request.body);
            const { name, amount, type, category, description, date, paymentMethod, isRecurring, recurringPeriod } = request.body;
            const user = request.user;
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
        }
        catch (error) {
            console.error('❌ Error creating transaction:', error);
            reply.code(500).send({ error: error.message });
        }
    });
    // GET /api/admin/transactions - Get transactions
    fastify.get('/admin/transactions', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware],
    }, async (request, reply) => {
        try {
            const { startDate, endDate, type, category } = request.query;
            const where = {};
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
        }
        catch (error) {
            reply.code(500).send({ error: error.message });
        }
    });
    // PUT /api/admin/transactions/:id - Update transaction
    fastify.put('/admin/transactions/:id', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware],
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { name, amount, type, category, description, date, paymentMethod, isRecurring, recurringPeriod } = request.body;
            const updateData = {};
            if (name !== undefined)
                updateData.name = name;
            if (amount !== undefined && type !== undefined) {
                updateData.amount = type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount);
            }
            if (type !== undefined)
                updateData.type = type;
            if (category !== undefined)
                updateData.category = category;
            if (description !== undefined)
                updateData.description = description;
            if (date !== undefined)
                updateData.date = new Date(date);
            if (paymentMethod !== undefined)
                updateData.paymentMethod = paymentMethod;
            if (isRecurring !== undefined)
                updateData.isRecurring = isRecurring;
            if (recurringPeriod !== undefined)
                updateData.recurringPeriod = recurringPeriod;
            const transaction = await prisma.transaction.update({
                where: { id },
                data: updateData
            });
            reply.send(transaction);
        }
        catch (error) {
            reply.code(500).send({ error: error.message });
        }
    });
    // DELETE /api/admin/transactions/:id - Delete transaction
    fastify.delete('/admin/transactions/:id', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware],
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            await prisma.transaction.delete({
                where: { id }
            });
            reply.send({ success: true });
        }
        catch (error) {
            reply.code(500).send({ error: error.message });
        }
    });
}
