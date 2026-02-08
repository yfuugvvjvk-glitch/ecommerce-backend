"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceSimpleRoutes = invoiceSimpleRoutes;
const invoice_simple_service_1 = require("../services/invoice-simple.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const invoiceService = new invoice_simple_service_1.InvoiceSimpleService();
async function invoiceSimpleRoutes(fastify) {
    // User: Obține factura pentru comandă
    fastify.get('/order/:orderId', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { orderId } = request.params;
            const userId = request.user.userId;
            const invoice = await invoiceService.getInvoiceForOrder(orderId, userId);
            reply.send(invoice);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // User: Obține HTML pentru print (GET și POST pentru compatibilitate)
    fastify.get('/order/:orderId/print', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { orderId } = request.params;
            const userId = request.user.userId;
            const invoice = await invoiceService.getInvoiceForOrder(orderId, userId);
            const html = invoiceService.generateInvoiceHTML(invoice);
            reply.type('text/html').send(html);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // POST version pentru admin (cu token în body)
    fastify.post('/order/:orderId/print', async (request, reply) => {
        try {
            const { orderId } = request.params;
            // Obține token-ul din body (suportă atât JSON cât și form-urlencoded)
            const token = request.body?.token;
            if (!token) {
                return reply.code(401).send({ error: 'No token provided' });
            }
            // Verifică token-ul manual
            try {
                const decoded = request.server.jwt.verify(token);
                // Verifică dacă utilizatorul există și obține rolul
                const user = await prisma.user.findUnique({
                    where: { id: decoded.userId },
                    select: { id: true, role: true }
                });
                if (!user) {
                    return reply.code(401).send({ error: 'User not found' });
                }
                let invoice;
                if (user.role === 'admin') {
                    // Admin poate vedea orice factură
                    invoice = await invoiceService.getInvoiceForOrderAdmin(orderId);
                }
                else {
                    // Utilizator normal poate vedea doar propriile facturi
                    invoice = await invoiceService.getInvoiceForOrder(orderId, decoded.userId);
                }
                const html = invoiceService.generateInvoiceHTML(invoice);
                reply.type('text/html').send(html);
            }
            catch (jwtError) {
                return reply.code(401).send({ error: 'Invalid token' });
            }
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // User: Obține toate facturile utilizatorului
    fastify.get('/my-invoices', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const invoices = await invoiceService.getUserInvoices(userId);
            reply.send(invoices);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get invoices' });
        }
    });
    // Admin: Obține toate facturile
    fastify.get('/admin/all', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { page = 1, limit = 20 } = request.query;
            const result = await invoiceService.getAllInvoices(parseInt(page), parseInt(limit));
            reply.send(result);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get invoices' });
        }
    });
    // Admin: Generează factură pentru comandă
    fastify.post('/admin/generate/:orderId', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { orderId } = request.params;
            const invoice = await invoiceService.generateInvoiceForOrder(orderId);
            reply.send(invoice);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Admin: Generează facturi pentru toate comenzile care nu au facturi
    fastify.post('/admin/generate-missing', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const result = await invoiceService.generateMissingInvoices();
            reply.send(result);
        }
        catch (error) {
            reply.code(500).send({ error: error.message });
        }
    });
    // Admin: Duplică factură
    fastify.post('/admin/duplicate/:orderId', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { orderId } = request.params;
            const invoice = await invoiceService.duplicateInvoice(orderId);
            reply.send(invoice);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Admin: Șterge factură
    fastify.delete('/admin/delete/:orderId', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { orderId } = request.params;
            await invoiceService.deleteInvoice(orderId);
            reply.send({ message: 'Factură ștearsă cu succes' });
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
}
