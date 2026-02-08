import { FastifyInstance } from 'fastify';
import { pageService } from '../services/page.service';
import { deliveryLocationService } from '../services/delivery-location.service';
import { siteConfigService } from '../services/site-config.service';

export async function publicRoutes(fastify: FastifyInstance) {
  // === PAGINI PUBLICE ===

  // Obține toate paginile publicate
  fastify.get('/pages', async (request, reply) => {
    try {
      const pages = await pageService.getPublishedPages();
      reply.send(pages);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține o pagină după slug
  fastify.get('/pages/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as any;
      
      // Verifică dacă există serviciul de pagini
      if (!pageService || typeof pageService.getPageBySlug !== 'function') {
        // Returnează un răspuns implicit pentru pagini care nu există încă
        return reply.code(404).send({ 
          error: 'Page not found',
          message: 'Page service not available or page does not exist'
        });
      }
      
      const page = await pageService.getPageBySlug(slug);
      
      if (!page || !page.isPublished) {
        return reply.code(404).send({ error: 'Page not found' });
      }
      
      reply.send(page);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Returnează 404 în loc de 500 pentru pagini care nu există
      reply.code(404).send({ error: 'Page not found', message: errorMessage });
    }
  });

  // === LOCAȚII DE LIVRARE PUBLICE ===

  // Obține locațiile active pentru clienți
  fastify.get('/delivery-locations', async (request, reply) => {
    try {
      const locations = await deliveryLocationService.getActiveLocations();
      
      // Returnează doar informațiile necesare pentru clienți
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține locațiile deschise astăzi
  fastify.get('/delivery-locations/open-today', async (request, reply) => {
    try {
      const locations = await deliveryLocationService.getLocationsOpenToday();
      
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Calculează costul de livrare pentru o locație
  fastify.post('/delivery-locations/:locationId/calculate-fee', async (request, reply) => {
    try {
      const { locationId } = request.params as any;
      const { orderTotal } = request.body as any;
      
      if (!orderTotal || orderTotal <= 0) {
        return reply.code(400).send({ error: 'Valid order total is required' });
      }
      
      const feeInfo = await deliveryLocationService.calculateDeliveryFee(locationId, orderTotal);
      reply.send(feeInfo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Verifică raza de livrare
  fastify.post('/delivery-locations/:locationId/check-radius', async (request, reply) => {
    try {
      const { locationId } = request.params as any;
      const { coordinates } = request.body as any;
      
      if (!coordinates || !coordinates.lat || !coordinates.lng) {
        return reply.code(400).send({ error: 'Valid coordinates are required' });
      }
      
      const radiusInfo = await deliveryLocationService.checkDeliveryRadius(locationId, coordinates);
      reply.send(radiusInfo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // === CONFIGURAȚII PUBLICE ===

  // Obține configurațiile publice pentru frontend
  fastify.get('/site-config', async (request, reply) => {
    try {
      const { keys } = request.query as { keys?: string };
      
      if (keys) {
        // Dacă sunt specificate chei, returnează doar acele configurații
        const keyArray = keys.split(',').map(k => k.trim());
        const configs = await siteConfigService.getPublicConfigs();
        
        const filteredConfigs: Record<string, any> = {};
        keyArray.forEach(key => {
          if (configs[key] !== undefined) {
            filteredConfigs[key] = configs[key];
          }
        });
        
        return reply.send(filteredConfigs);
      }
      
      // Altfel, returnează toate configurațiile publice
      const configs = await siteConfigService.getPublicConfigs();
      reply.send(configs);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține o configurație publică specifică
  fastify.get('/site-config/:key', async (request, reply) => {
    try {
      const { key } = request.params as any;
      const config = await siteConfigService.getConfig(key);
      
      if (!config || !config.isPublic) {
        return reply.code(404).send({ error: 'Configuration not found or not public' });
      }
      
      reply.send({ key: config.key, value: config.value });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // === INFORMAȚII GENERALE ===

  // Obține informațiile de contact și program
  fastify.get('/contact-info', async (request, reply) => {
    try {
      const configs = await siteConfigService.getPublicConfigs();
      
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Verifică dacă site-ul este în modul de mentenanță
  fastify.get('/maintenance-status', async (request, reply) => {
    try {
      const maintenanceConfig = await siteConfigService.getConfig('maintenance_mode');
      const allowRegistrationsConfig = await siteConfigService.getConfig('allow_registrations');
      
      reply.send({
        maintenanceMode: maintenanceConfig?.value || false,
        allowRegistrations: allowRegistrationsConfig?.value || true,
        message: maintenanceConfig?.value ? 'Site-ul este în mentenanță. Vă rugăm să reveniți mai târziu.' : null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });
}