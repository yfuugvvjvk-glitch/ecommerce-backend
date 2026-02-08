import { FastifyInstance } from 'fastify';
import { currencyService } from '../services/currency.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

export async function currencyRoutes(fastify: FastifyInstance) {
  // Obține toate monedele (public)
  fastify.get('/currencies', async (request, reply) => {
    try {
      const currencies = await currencyService.getAllCurrencies();
      return reply.send({ currencies });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Obține moneda de bază (public)
  fastify.get('/currencies/base', async (request, reply) => {
    try {
      const baseCurrency = await currencyService.getBaseCurrency();
      return reply.send({ currency: baseCurrency });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Obține curs de schimb (public)
  fastify.get<{
    Querystring: { from: string; to: string };
  }>('/currencies/rate', async (request, reply) => {
    try {
      const { from, to } = request.query;
      
      if (!from || !to) {
        return reply.status(400).send({ error: 'Parametrii from și to sunt obligatorii' });
      }

      const rate = await currencyService.getExchangeRate(from, to);
      return reply.send({ rate });
    } catch (error: any) {
      return reply.status(404).send({ error: error.message });
    }
  });

  // Convertește o sumă (public)
  fastify.get<{
    Querystring: { amount: string; from: string; to: string };
  }>('/currencies/convert', async (request, reply) => {
    try {
      const { amount, from, to } = request.query;
      
      if (!amount || !from || !to) {
        return reply.status(400).send({ error: 'Parametrii amount, from și to sunt obligatorii' });
      }

      const convertedAmount = await currencyService.convertAmount(
        parseFloat(amount),
        from,
        to
      );

      return reply.send({
        original: { amount: parseFloat(amount), currency: from },
        converted: { amount: convertedAmount, currency: to },
      });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Obține toate cursurile de schimb (public)
  fastify.get('/currencies/rates/all', async (request, reply) => {
    try {
      const rates = await currencyService.getAllExchangeRates();
      return reply.send({ rates });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Obține istoric cursuri (public)
  fastify.get<{
    Querystring: { from: string; to: string; days?: string };
  }>('/currencies/history', async (request, reply) => {
    try {
      const { from, to, days } = request.query;
      
      if (!from || !to) {
        return reply.status(400).send({ error: 'Parametrii from și to sunt obligatorii' });
      }

      const history = await currencyService.getExchangeRateHistory(
        from,
        to,
        days ? parseInt(days) : 30
      );

      return reply.send({ history });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // === RUTE ADMIN ===

  // Creează monedă nouă (admin)
  fastify.post<{
    Body: {
      code: string;
      name: string;
      symbol: string;
      isBase?: boolean;
      isActive?: boolean;
      position?: 'before' | 'after';
      decimals?: number;
    };
  }>(
    '/admin/currencies',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        const currency = await currencyService.createCurrency(request.body);
        return reply.status(201).send({ currency });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Actualizează monedă (admin)
  fastify.put<{
    Params: { id: string };
    Body: {
      code?: string;
      name?: string;
      symbol?: string;
      isBase?: boolean;
      isActive?: boolean;
      position?: 'before' | 'after';
      decimals?: number;
    };
  }>(
    '/admin/currencies/:id',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        const currency = await currencyService.updateCurrency(
          request.params.id,
          request.body
        );
        return reply.send({ currency });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Șterge monedă (admin)
  fastify.delete<{
    Params: { id: string };
  }>(
    '/admin/currencies/:id',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        await currencyService.deleteCurrency(request.params.id);
        return reply.send({ message: 'Moneda a fost ștearsă cu succes' });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Setează moneda de bază (admin)
  fastify.post<{
    Body: { currencyId: string };
  }>(
    '/admin/currencies/set-base',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        const currency = await currencyService.setBaseCurrency(request.body.currencyId);
        return reply.send({ currency });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Actualizează curs de schimb manual (admin)
  fastify.post<{
    Body: {
      fromCurrencyCode: string;
      toCurrencyCode: string;
      rate: number;
    };
  }>(
    '/admin/currencies/rates',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        const rate = await currencyService.upsertExchangeRate({
          ...request.body,
          source: 'manual',
        });
        return reply.send({ rate });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Actualizează cursuri de la BNR (admin)
  fastify.post(
    '/admin/currencies/update-bnr',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        const result = await currencyService.updateRatesFromBNR();
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // Actualizează cursuri de la API extern (admin)
  fastify.post<{
    Body: { apiKey?: string };
  }>(
    '/admin/currencies/update-api',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        const result = await currencyService.updateRatesFromAPI(request.body.apiKey);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    }
  );
}
