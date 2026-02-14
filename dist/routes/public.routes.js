"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicRoutes = publicRoutes;
const page_service_1 = require("../services/page.service");
const delivery_location_service_1 = require("../services/delivery-location.service");
const site_config_service_1 = require("../services/site-config.service");
async function publicRoutes(fastify) {
    // === PAGINI PUBLICE ===
    // Obține toate paginile publicate
    fastify.get('/pages', async (request, reply) => {
        try {
            const pages = await page_service_1.pageService.getPublishedPages();
            reply.send(pages);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține o pagină după slug
    fastify.get('/pages/:slug', async (request, reply) => {
        try {
            const { slug } = request.params;
            // Verifică dacă există serviciul de pagini
            if (!page_service_1.pageService || typeof page_service_1.pageService.getPageBySlug !== 'function') {
                // Returnează un răspuns implicit pentru pagini care nu există încă
                return reply.code(404).send({
                    error: 'Page not found',
                    message: 'Page service not available or page does not exist'
                });
            }
            const page = await page_service_1.pageService.getPageBySlug(slug);
            if (!page || !page.isPublished) {
                return reply.code(404).send({ error: 'Page not found' });
            }
            reply.send(page);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Returnează 404 în loc de 500 pentru pagini care nu există
            reply.code(404).send({ error: 'Page not found', message: errorMessage });
        }
    });
    // === LOCAȚII DE LIVRARE PUBLICE ===
    // Obține locațiile active pentru clienți
    fastify.get('/delivery-locations', async (request, reply) => {
        try {
            const locations = await delivery_location_service_1.deliveryLocationService.getActiveLocations();
            // Returnează doar informațiile necesare pentru clienți
            const publicLocations = locations.map(location => ({
                id: location.id,
                name: location.name,
                address: location.address,
                city: location.city,
                phone: location.phone,
                email: location.email,
                deliveryFee: location.deliveryFee,
                deliveryRadius: location.deliveryRadius, // ADĂUGAT pentru validarea razei
                freeDeliveryThreshold: location.freeDeliveryThreshold,
                workingHours: location.workingHours ? JSON.parse(location.workingHours) : null,
                specialInstructions: location.specialInstructions,
                isMainLocation: location.isMainLocation,
                coordinates: location.coordinates // ADĂUGAT pentru calculul distanței
            }));
            reply.send(publicLocations);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține locațiile deschise astăzi
    fastify.get('/delivery-locations/open-today', async (request, reply) => {
        try {
            const locations = await delivery_location_service_1.deliveryLocationService.getLocationsOpenToday();
            const publicLocations = locations.map(location => ({
                id: location.id,
                name: location.name,
                address: location.address,
                city: location.city,
                phone: location.phone,
                email: location.email,
                deliveryFee: location.deliveryFee,
                freeDeliveryThreshold: location.freeDeliveryThreshold,
                workingHours: location.workingHours ? JSON.parse(location.workingHours) : null,
                specialInstructions: location.specialInstructions,
                isMainLocation: location.isMainLocation
            }));
            reply.send(publicLocations);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Calculează costul de livrare pentru o locație
    fastify.post('/delivery-locations/:locationId/calculate-fee', async (request, reply) => {
        try {
            const { locationId } = request.params;
            const { orderTotal } = request.body;
            if (!orderTotal || orderTotal <= 0) {
                return reply.code(400).send({ error: 'Valid order total is required' });
            }
            const feeInfo = await delivery_location_service_1.deliveryLocationService.calculateDeliveryFee(locationId, orderTotal);
            reply.send(feeInfo);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Verifică raza de livrare
    fastify.post('/delivery-locations/:locationId/check-radius', async (request, reply) => {
        try {
            const { locationId } = request.params;
            const { coordinates } = request.body;
            if (!coordinates || !coordinates.lat || !coordinates.lng) {
                return reply.code(400).send({ error: 'Valid coordinates are required' });
            }
            const radiusInfo = await delivery_location_service_1.deliveryLocationService.checkDeliveryRadius(locationId, coordinates);
            reply.send(radiusInfo);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // === CONFIGURAȚII PUBLICE ===
    // Obține configurațiile publice pentru frontend
    fastify.get('/site-config', async (request, reply) => {
        try {
            const { keys } = request.query;
            if (keys) {
                // Dacă sunt specificate chei, returnează doar acele configurații
                const keyArray = keys.split(',').map(k => k.trim());
                const configs = await site_config_service_1.siteConfigService.getPublicConfigs();
                const filteredConfigs = {};
                keyArray.forEach(key => {
                    if (configs[key] !== undefined) {
                        filteredConfigs[key] = configs[key];
                    }
                });
                return reply.send(filteredConfigs);
            }
            // Altfel, returnează toate configurațiile publice
            const configs = await site_config_service_1.siteConfigService.getPublicConfigs();
            reply.send(configs);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === METODE DE LIVRARE PUBLICE ===
    // Obține metodele de livrare active
    fastify.get('/delivery-methods', async (request, reply) => {
        try {
            const prisma = require('@prisma/client');
            const db = new prisma.PrismaClient();
            const methods = await db.deliverySettings.findMany({
                where: { isActive: true },
                orderBy: { name: 'asc' }
            });
            await db.$disconnect();
            reply.send(methods);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === METODE DE PLATĂ PUBLICE ===
    // Obține metodele de plată active
    fastify.get('/payment-methods', async (request, reply) => {
        try {
            const prisma = require('@prisma/client');
            const db = new prisma.PrismaClient();
            const methods = await db.paymentMethod.findMany({
                where: { isActive: true },
                orderBy: { name: 'asc' }
            });
            await db.$disconnect();
            reply.send(methods);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține o configurație publică specifică
    fastify.get('/site-config/:key', async (request, reply) => {
        try {
            const { key } = request.params;
            const config = await site_config_service_1.siteConfigService.getConfig(key);
            if (!config || !config.isPublic) {
                return reply.code(404).send({ error: 'Configuration not found or not public' });
            }
            reply.send({ key: config.key, value: config.value });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === BANNER ANUNȚURI ===
    // Obține banner-ul activ pentru afișare publică
    fastify.get('/announcement-banner', async (request, reply) => {
        try {
            const config = await site_config_service_1.siteConfigService.getConfig('announcement_banner');
            // Returnează null dacă configurația nu există
            if (!config) {
                return reply.send({ success: true, data: null });
            }
            const bannerConfig = config.value;
            // Returnează null dacă banner-ul este inactiv
            if (!bannerConfig.isActive) {
                return reply.send({ success: true, data: null });
            }
            // Returnează null dacă atât titlul cât și descrierea sunt goale
            const hasTitle = bannerConfig.title && bannerConfig.title.trim().length > 0;
            const hasDescription = bannerConfig.description && bannerConfig.description.trim().length > 0;
            if (!hasTitle && !hasDescription) {
                return reply.send({ success: true, data: null });
            }
            // Returnează configurația completă
            reply.send({ success: true, data: bannerConfig });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ success: false, error: errorMessage });
        }
    });
    // === INFORMAȚII GENERALE ===
    // Obține informațiile de contact și program
    fastify.get('/contact-info', async (request, reply) => {
        try {
            const configs = await site_config_service_1.siteConfigService.getPublicConfigs();
            const contactInfo = {
                siteName: configs.site_name || 'Site Comerț Live',
                description: configs.site_description || 'Platforma de comerț electronic',
                email: configs.contact_email || 'contact@site.ro',
                phone: configs.contact_phone || '+40 123 456 789',
                address: configs.company_address || 'Strada Exemplu, Nr. 123, București',
                coordinates: configs.company_coordinates || { lat: 44.4268, lng: 26.1025 },
                businessHours: configs.business_hours || {
                    monday: '09:00 - 18:00',
                    tuesday: '09:00 - 18:00',
                    wednesday: '09:00 - 18:00',
                    thursday: '09:00 - 18:00',
                    friday: '09:00 - 18:00',
                    saturday: '10:00 - 16:00',
                    sunday: 'Închis'
                },
                socialMedia: configs.social_media || {},
                currency: configs.currency || 'RON',
                minOrderValue: configs.min_order_value || 50,
                freeDeliveryThreshold: configs.free_delivery_threshold || 100
            };
            reply.send(contactInfo);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Verifică dacă site-ul este în modul de mentenanță
    fastify.get('/maintenance-status', async (request, reply) => {
        try {
            const maintenanceConfig = await site_config_service_1.siteConfigService.getConfig('maintenance_mode');
            const allowRegistrationsConfig = await site_config_service_1.siteConfigService.getConfig('allow_registrations');
            reply.send({
                maintenanceMode: maintenanceConfig?.value || false,
                allowRegistrations: allowRegistrationsConfig?.value || true,
                message: maintenanceConfig?.value ? 'Site-ul este în mentenanță. Vă rugăm să reveniți mai târziu.' : null
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Verifică dacă comenzile sunt blocate
    fastify.get('/order-blocking-status', async (request, reply) => {
        try {
            const config = await site_config_service_1.siteConfigService.getConfig('block_rules');
            const rules = config && config.value ? JSON.parse(config.value) : [];
            // Filtrează doar regulile active
            const activeRules = rules.filter((rule) => rule.isActive);
            // Verifică dacă există reguli care blochează toate comenzile
            const blockingRule = activeRules.find((rule) => {
                if (rule.blockNewOrders) {
                    // Dacă există blockUntil, verifică dacă suntem încă în perioada de blocare
                    if (rule.blockUntil) {
                        const blockUntilDate = new Date(rule.blockUntil);
                        const now = new Date();
                        return now < blockUntilDate;
                    }
                    // Dacă nu există blockUntil, blocare permanentă
                    return true;
                }
                return false;
            });
            if (blockingRule) {
                return reply.send({
                    blocked: true,
                    reason: blockingRule.blockReason || 'Comenzile sunt temporar blocate',
                    blockUntil: blockingRule.blockUntil || null,
                    ruleId: blockingRule.id,
                    ruleName: blockingRule.name
                });
            }
            // Nu există blocare activă
            reply.send({
                blocked: false,
                reason: null,
                blockUntil: null
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === PROGRAME DE LIVRARE PUBLICE ===
    // Obține programele de livrare active (pentru verificare checkout)
    fastify.get('/delivery-schedules', async (request, reply) => {
        try {
            const config = await site_config_service_1.siteConfigService.getConfig('delivery_schedules');
            if (config && config.value) {
                const schedules = JSON.parse(config.value);
                // Returnează doar programele active
                const activeSchedules = schedules.filter((s) => s.isActive);
                reply.send(activeSchedules);
            }
            else {
                // Returnează array gol dacă nu există configurație
                reply.send([]);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error loading delivery schedules:', error);
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === REGULI DE BLOCARE PUBLICE ===
    // Obține regulile de blocare active (pentru verificare checkout)
    fastify.get('/block-rules', async (request, reply) => {
        try {
            const config = await site_config_service_1.siteConfigService.getConfig('block_rules');
            if (config && config.value) {
                const rules = JSON.parse(config.value);
                // Returnează doar regulile active
                const activeRules = rules.filter((r) => r.isActive);
                reply.send(activeRules);
            }
            else {
                // Returnează array gol dacă nu există configurație
                reply.send([]);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error loading block rules:', error);
            reply.code(500).send({ error: errorMessage });
        }
    });
}
