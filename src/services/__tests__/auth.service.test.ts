import { AuthService } from '../auth.service';

// Mock the entire auth utils module
jest.mock('../../utils/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashedPassword'),
  comparePassword: jest.fn().mockResolvedValue(true),
  generateToken: jest.fn().mockReturnValue('mockToken'),
  verifyToken: jest.fn().mockReturnValue({ userId: '1', email: 'test@example.com', role: 'user' }),
}));

// Mock Prisma with factory functions
jest.mock('@prisma/client', () => {
  const mockUserFindUnique = jest.fn();
  const mockUserCreate = jest.fn();
  
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findUnique: mockUserFindUnique,
        create: mockUserCreate,
      },
    })),
    __mockUserFindUnique: mockUserFindUnique,
    __mockUserCreate: mockUserCreate,
  };
});

// Import the mocked functions
const { __mockUserFindUnique: mockUserFindUnique, __mockUserCreate: mockUserCreate } = jest.requireMock('@prisma/client');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'user',
        phone: null,
        address: null,
        avatar: null,
        locale: 'ro',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserFindUnique.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(mockUser);

      const result = await authService.register(
        'test@example.com',
        'password123',
        'Test User'
      );

      expect(result.email).toBe('test@example.com');
      expect(mockUserCreate).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      mockUserFindUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

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
        password: '$2b$10$hashedPassword',
        role: 'user',
        phone: null,
        address: null,
        avatar: null,
        locale: 'ro',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserFindUnique.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mockToken');
    });

    it('should throw error on invalid credentials', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });
  });
});
