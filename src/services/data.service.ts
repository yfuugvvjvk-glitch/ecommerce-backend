import { PrismaClient, DataItem } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

const prisma = new PrismaClient();

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

export class DataService {
  async findAll(
    userId: string,
    userRole: string,
    filters: FilterOptions
  ): Promise<PaginatedResult<DataItem>> {
    const page = filters.page || 1;
    const limit = filters.limit || 100; // Increased from 20 to 100
    const skip = (page - 1) * limit;

    // For regular users, show only published products
    // For admins, show all products (or filter by userId if needed)
    const where: any = userRole === 'admin' ? {} : { status: 'published' };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.categoryId = filters.category;
    }

    if (filters.status && userRole === 'admin') {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      prisma.dataItem.findMany({
        where,
        skip,
        take: limit,
        include: { 
          category: true,
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dataItem.count({ where }),
    ]);

    // Calculate average rating and review count for each product
    const dataWithRatings = data.map((item: any) => {
      const reviews = item.reviews || [];
      const reviewCount = reviews.length;
      const averageRating = reviewCount > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
        : 0;
      
      // Remove reviews array and add calculated fields
      const { reviews: _, ...itemWithoutReviews } = item;
      return {
        ...itemWithoutReviews,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviewCount,
      };
    });

    return {
      data: dataWithRatings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, userId: string, userRole?: string): Promise<any> {
    // For regular users, only show published products
    // For admins, show all products
    const where: any = { id };
    if (userRole !== 'admin') {
      where.status = 'published';
    }
    
    const item = await prisma.dataItem.findFirst({
      where,
      include: { 
        category: true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    if (!item) return null;

    // Calculate average rating and review count
    const reviews = (item as any).reviews || [];
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
      : 0;
    
    // Remove reviews array and add calculated fields
    const { reviews: _, ...itemWithoutReviews } = item as any;
    return {
      ...itemWithoutReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount,
    };
  }

  async create(
    data: {
      title: string;
      description?: string;
      content: string;
      price: number;
      oldPrice?: number;
      stock: number;
      image: string;
      categoryId: string;
      status?: string;
    },
    userId: string
  ): Promise<DataItem> {
    return prisma.dataItem.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      content?: string;
      price?: number;
      oldPrice?: number;
      stock?: number;
      image?: string;
      categoryId?: string;
      status?: string;
    },
    userId: string
  ): Promise<DataItem> {
    // Check ownership - verify the item belongs to the user
    const existing = await prisma.dataItem.findFirst({
      where: { id, userId },
    });
    
    if (!existing) {
      throw new NotFoundError('DataItem');
    }

    return prisma.dataItem.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // Check ownership - verify the item belongs to the user
    const existing = await prisma.dataItem.findFirst({
      where: { id, userId },
    });
    
    if (!existing) {
      throw new NotFoundError('DataItem');
    }

    await prisma.dataItem.delete({
      where: { id },
    });
  }
}
