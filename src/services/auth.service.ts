import { PrismaClient, User } from '@prisma/client';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
} from '../utils/auth';

const prisma = new PrismaClient();

export class AuthService {
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'user',
      },
    });

    return user;
  }

  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: Omit<User, 'password'> }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }

  async verifyToken(token: string): Promise<User> {
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
