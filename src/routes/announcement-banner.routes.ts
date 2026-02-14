import { FastifyInstance } from 'fastify';
import { siteConfigService } from '../services/site-config.service';

export async function announcementBannerRoutes(fastify: FastifyInstance) {
  // Obține banner-ul activ pentru afișare publică
  fastify.get('/announcement-banner', async (request, reply) => {
    try {
      const config = await siteConfigService.getConfig('announcement_banner');
      
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ success: false, error: errorMessage });
    }
  });
}
