import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      role?: string;
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      userId: string;
      email: string;
      role?: string;
    };
  }
}
