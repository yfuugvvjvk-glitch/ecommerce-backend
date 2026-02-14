import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware pentru a bloca utilizatorii guest de la accesarea chat-ului
 */
export async function chatAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Verifică dacă utilizatorul este autentificat (ar trebui să fie deja verificat de authMiddleware)
  if (!request.user) {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  // Blochează utilizatorii guest
  if (request.user.role === 'guest') {
    return reply.code(403).send({ 
      error: 'Chat access denied',
      message: 'Conturile vizitator (guest) nu au acces la funcționalitatea de chat. Vă rugăm să vă creați un cont complet pentru a utiliza chat-ul.'
    });
  }
}
