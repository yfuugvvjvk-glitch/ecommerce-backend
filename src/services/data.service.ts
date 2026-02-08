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
    userId: string | null,
    userRole: string,
    filters: FilterOptions
  ): Promise<PaginatedResult<DataItem>> {
    const page = filters.page || 1;
    const limit = filters.limit || 100; // Increased from 20 to 100
    const skip = (page - 1) * limit;

    // For regular users and guests, show only published products
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
    
    console.log('Sample product carousel fields:', data[0] ? {
      id: data[0].id,
      title: data[0].title,
      showInCarousel: data[0].showInCarousel,
      carouselOrder: data[0].carouselOrder
    } : 'No products');

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
        // Parse availableQuantities from JSON if it exists
        availableQuantities: item.availableQuantities ? 
          (typeof item.availableQuantities === 'string' ? 
            JSON.parse(item.availableQuantities) : 
            item.availableQuantities) : 
          [1]
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

  async findById(id: string, userId: string | null, userRole?: string): Promise<any> {
    // For regular users and guests, only show published products
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
      // Parse availableQuantities from JSON if it exists
      availableQuantities: (item as any).availableQuantities ? 
        (typeof (item as any).availableQuantities === 'string' ? 
          JSON.parse((item as any).availableQuantities) : 
          (item as any).availableQuantities) : 
        [1]
    };
  }

  async create(
    data: {
      title: string;
      description?: string;
      content: string;
      price: number;
      oldPrice?: number | null;
      stock: number;
      image: string;
      categoryId: string;
      status?: string;
      // Advanced product fields
      isPerishable?: boolean;
      expirationDate?: string | null;
      productionDate?: string | null;
      requiresAdvanceOrder?: boolean;
      advanceOrderDays?: number;
      deliveryTimeHours?: number | null;
      deliveryTimeDays?: number | null;
      isActive?: boolean;
      unitType?: string;
      unitName?: string;
      priceType?: string;
      minQuantity?: number;
      quantityStep?: number;
      allowFractional?: boolean;
      availableQuantities?: number[];
      showInCarousel?: boolean;
      carouselOrder?: number;
    },
    userId: string
  ): Promise<DataItem> {
    return prisma.dataItem.create({
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        price: data.price,
        oldPrice: data.oldPrice,
        stock: data.stock,
        image: data.image,
        categoryId: data.categoryId,
        status: data.status || 'published',
        userId,
        // Convert date strings to Date objects if provided - use correct field names from schema
        expiryDate: data.expirationDate ? new Date(data.expirationDate) : null,
        productionDate: data.productionDate ? new Date(data.productionDate) : null,
        // Inițializează câmpurile de stoc pentru inventar
        availableStock: data.stock,
        reservedStock: 0,
        totalSold: 0,
        totalOrdered: 0,
        lowStockAlert: Math.max(1, Math.floor(data.stock * 0.1)), // 10% din stoc ca alertă
        isInStock: data.stock > 0,
        trackInventory: true,
        lastRestockDate: new Date(),
        // Set default values for advanced fields
        isPerishable: data.isPerishable || false,
        requiresAdvanceOrder: data.requiresAdvanceOrder || false,
        advanceOrderDays: data.advanceOrderDays || 0,
        deliveryTimeHours: data.deliveryTimeHours || null,
        deliveryTimeDays: data.deliveryTimeDays || null,
        unitType: data.unitType || 'piece',
        unitName: data.unitName || 'bucată',
        priceType: data.priceType || 'per_unit',
        minQuantity: data.minQuantity || 1,
        quantityStep: data.quantityStep || 1,
        allowFractional: false, // Întotdeauna false pentru cantități fixe
        showInCarousel: data.showInCarousel || false,
        carouselOrder: data.carouselOrder || 0,
        // Salvează cantitățile disponibile ca JSON
        availableQuantities: data.availableQuantities ? JSON.stringify(data.availableQuantities) : JSON.stringify([1])
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
      oldPrice?: number | null;
      stock?: number;
      image?: string;
      categoryId?: string;
      status?: string;
      // Carousel settings
      showInCarousel?: boolean;
      carouselOrder?: number;
      // Advanced fields
      isPerishable?: boolean;
      expirationDate?: string | null;
      productionDate?: string | null;
      requiresAdvanceOrder?: boolean;
      advanceOrderDays?: number;
      deliveryTimeHours?: number | null;
      deliveryTimeDays?: number | null;
      isActive?: boolean;
      unitType?: string;
      unitName?: string;
      priceType?: string;
      availableQuantities?: number[];
      allowFractional?: boolean;
      minQuantity?: number;
      quantityStep?: number;
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

    // Prepare update data - remove undefined values
    const updateData: any = {};
    
    // Copy only defined values and map to correct schema fields
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.oldPrice !== undefined) updateData.oldPrice = data.oldPrice;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.showInCarousel !== undefined) updateData.showInCarousel = data.showInCarousel;
    if (data.carouselOrder !== undefined) updateData.carouselOrder = data.carouselOrder;
    if (data.isPerishable !== undefined) updateData.isPerishable = data.isPerishable;
    if (data.requiresAdvanceOrder !== undefined) updateData.requiresAdvanceOrder = data.requiresAdvanceOrder;
    if (data.advanceOrderDays !== undefined) updateData.advanceOrderDays = data.advanceOrderDays;
    if (data.deliveryTimeHours !== undefined) updateData.deliveryTimeHours = data.deliveryTimeHours;
    if (data.deliveryTimeDays !== undefined) updateData.deliveryTimeDays = data.deliveryTimeDays;
    if (data.unitType !== undefined) updateData.unitType = data.unitType;
    if (data.unitName !== undefined) updateData.unitName = data.unitName;
    if (data.priceType !== undefined) updateData.priceType = data.priceType;
    if (data.allowFractional !== undefined) updateData.allowFractional = data.allowFractional;
    if (data.minQuantity !== undefined) updateData.minQuantity = data.minQuantity;
    if (data.quantityStep !== undefined) updateData.quantityStep = data.quantityStep;
    
    // Convert date strings to Date objects if provided
    if (data.expirationDate !== undefined) {
      updateData.expiryDate = data.expirationDate ? new Date(data.expirationDate) : null;
    }
    if (data.productionDate !== undefined) {
      updateData.productionDate = data.productionDate ? new Date(data.productionDate) : null;
    }
    
    // Convert availableQuantities array to JSON string if provided
    if (data.availableQuantities !== undefined) {
      updateData.availableQuantities = JSON.stringify(data.availableQuantities);
    }
    
    // Dacă se actualizează stocul, actualizează și availableStock
    if (data.stock !== undefined) {
      updateData.availableStock = data.stock - (existing.reservedStock || 0);
      updateData.isInStock = data.stock > 0;
      if (data.stock > existing.stock) {
        updateData.lastRestockDate = new Date();
      }
    }

    return await prisma.dataItem.update({
      where: { id },
      data: updateData,
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
