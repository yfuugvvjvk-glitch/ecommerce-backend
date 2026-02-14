"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currencyRoutes = currencyRoutes;
const currency_service_1 = require("../services/currency.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
async function currencyRoutes(fastify) {
    // Obține toate monedele (public)
    fastify.get('/currencies', async (request, reply) => {
        try {
            const currencies = await currency_service_1.currencyService.getAllCurrencies();
            return reply.send({ currencies });
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    // Obține moneda de bază (public)
    fastify.get('/currencies/base', async (request, reply) => {
        try {
            const baseCurrency = await currency_service_1.currencyService.getBaseCurrency();
            return reply.send({ currency: baseCurrency });
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    // Obține curs de schimb (public)
    fastify.get('/currencies/rate', async (request, reply) => {
        try {
            const { from, to } = request.query;
            if (!from || !to) {
                return reply.status(400).send({ error: 'Parametrii from și to sunt obligatorii' });
            }
            const rate = await currency_service_1.currencyService.getExchangeRate(from, to);
            return reply.send({ rate });
        }
        catch (error) {
            return reply.status(404).send({ error: error.message });
        }
    });
    // Convertește o sumă (public)
    fastify.get('/currencies/convert', async (request, reply) => {
        try {
            const { amount, from, to } = request.query;
            if (!amount || !from || !to) {
                return reply.status(400).send({ error: 'Parametrii amount, from și to sunt obligatorii' });
            }
            const convertedAmount = await currency_service_1.currencyService.convertAmount(parseFloat(amount), from, to);
            return reply.send({
                original: { amount: parseFloat(amount), currency: from },
                converted: { amount: convertedAmount, currency: to },
            });
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    // Obține toate cursurile de schimb (public)
    fastify.get('/currencies/rates/all', async (request, reply) => {
        try {
            const rates = await currency_service_1.currencyService.getAllExchangeRates();
            return reply.send({ rates });
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    // Obține istoric cursuri (public)
    fastify.get('/currencies/history', async (request, reply) => {
        try {
            const { from, to, days } = request.query;
            if (!from || !to) {
                return reply.status(400).send({ error: 'Parametrii from și to sunt obligatorii' });
            }
            const history = await currency_service_1.currencyService.getExchangeRateHistory(from, to, days ? parseInt(days) : 30);
            return reply.send({ history });
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    // === RUTE ADMIN ===
    // Creează monedă nouă (admin)
    fastify.post('/admin/currencies', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const currency = await currency_service_1.currencyService.createCurrency(request.body);
            return reply.status(201).send({ currency });
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
    // Actualizează monedă (admin)
    fastify.put('/admin/currencies/:id', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const currency = await currency_service_1.currencyService.updateCurrency(request.params.id, request.body);
            return reply.send({ currency });
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
    // Șterge monedă (admin)
    fastify.delete('/admin/currencies/:id', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            await currency_service_1.currencyService.deleteCurrency(request.params.id);
            return reply.send({ message: 'Moneda a fost ștearsă cu succes' });
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
    // Setează moneda de bază (admin)
    fastify.post('/admin/currencies/set-base', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const currency = await currency_service_1.currencyService.setBaseCurrency(request.body.currencyId);
            return reply.send({ currency });
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
    // Actualizează curs de schimb manual (admin)
    fastify.post('/admin/currencies/rates', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const rate = await currency_service_1.currencyService.upsertExchangeRate({
                ...request.body,
                source: 'manual',
            });
            return reply.send({ rate });
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
    // Actualizează cursuri de la BNR (admin)
    fastify.post('/admin/currencies/update-bnr', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const result = await currency_service_1.currencyService.updateRatesFromBNR();
            return reply.send(result);
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    // Actualizează cursuri de la API extern (admin)
    fastify.post('/admin/currencies/update-api', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const result = await currency_service_1.currencyService.updateRatesFromAPI(request.body.apiKey);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
}
