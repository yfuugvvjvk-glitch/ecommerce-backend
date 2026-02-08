import { Server as SocketIOServer } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

declare module 'socket.io' {
  interface Socket {
    userId: string;
    userEmail: string;
    userRole: string;
  }
}