import { AuthService } from '../auth.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  })),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: any;

  beforeEach(() => {
    authService = new AuthService();
    prisma = new PrismaClient();
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await authService.register(
        'test@example.com',
        'password123',
        'Test User'
      );

      expect(result.email).toBe('test@example.com');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

      await expect(
        authService.register('test@example.com', 'password123', 'Test User')
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should return token and user on successful login', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$10$...',
        role: 'user',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock bcrypt compare
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error on invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });
  });
});
