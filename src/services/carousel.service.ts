import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CarouselItemData {
  type: 'product' | 'media' | 'custom';
  position?: number; // Opțional - dacă nu e specificat, se alege automat
  productId?: string;
  mediaId?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  textStyle?: any; // JSON object with styling
  customTitle?: string; // Custom title for products in carousel
  customDescription?: string; // Custom description for products in carousel
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface AvailablePosition {
  position: number;
  isAvailable: boolean;
  currentItem?: {
    id: string;
    type: string;
    title?: string;
  };
}

class CarouselService {
  // Obține toate pozițiile disponibile (infinite)
  async getAvailablePositions(): Promise<AvailablePosition[]> {
    const existingItems = await prisma.carouselItem.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        position: true,
        type: true,
        title: true,
        customTitle: true,
        product: {
          select: {
            title: true
          }
        },
        media: {
          select: {
            title: true,
            originalName: true
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });

    const positions: AvailablePosition[] = [];
    
    // Găsește cea mai mare poziție existentă
    const maxPosition = existingItems.length > 0 
      ? Math.max(...existingItems.map(item => item.position))
      : 0;
    
    // Creează lista de poziții până la maxPosition + 5 (pentru a avea întotdeauna poziții libere)
    for (let i = 1; i <= maxPosition + 5; i++) {
      const existingItem = existingItems.find(item => item.position === i);
      
      if (existingItem) {
        let title = existingItem.customTitle || existingItem.title;
        if (!title && existingItem.type === 'product' && existingItem.product) {
          title = existingItem.product.title;
        } else if (!title && existingItem.type === 'media' && existingItem.media) {
          title = existingItem.media.title || existingItem.media.originalName;
        }

        positions.push({
          position: i,
          isAvailable: false,
          currentItem: {
            id: existingItem.id,
            type: existingItem.type,
            title: title || undefined
          }
        });
      } else {
        positions.push({
          position: i,
          isAvailable: true
        });
      }
    }

    return positions;
  }

  // Găsește următoarea poziție disponibilă
  async getNextAvailablePosition(): Promise<number> {
    const existingItems = await prisma.carouselItem.findMany({
      where: {
        isActive: true
      },
      select: {
        position: true
      },
      orderBy: {
        position: 'asc'
      }
    });

    if (existingItems.length === 0) {
      return 1;
    }

    // Găsește prima gaură în secvență
    for (let i = 1; i <= existingItems.length + 1; i++) {
      if (!existingItems.find(item => item.position === i)) {
        return i;
      }
    }

    // Dacă nu există găuri, returnează următoarea poziție
    return existingItems.length + 1;
  }

  // Obține toate item-urile din carousel
  async getAllCarouselItems(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };

    const items = await prisma.carouselItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            oldPrice: true,
            image: true,
            stock: true,
            rating: true
          }
        },
        media: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            title: true,
            description: true,
            altText: true,
            width: true,
            height: true,
            mimeType: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });

    return items;
  }

  // Obține un item specific
  async getCarouselItemById(id: string) {
    const item = await prisma.carouselItem.findUnique({
      where: { id },
      include: {
        product: true,
        media: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!item) {
      throw new Error('Carousel item not found');
    }

    return item;
  }

  // Verifică dacă o poziție este disponibilă
  async isPositionAvailable(position: number, excludeId?: string): Promise<boolean> {
    const existingItem = await prisma.carouselItem.findFirst({
      where: {
        position,
        isActive: true,
        ...(excludeId && { id: { not: excludeId } })
      }
    });

    return !existingItem;
  }

  // Creează un nou item în carousel
  async createCarouselItem(data: CarouselItemData, userId: string) {
    // Dacă nu e specificată poziția, găsește automat următoarea disponibilă
    let position = data.position;
    if (!position) {
      position = await this.getNextAvailablePosition();
    } else {
      // Verifică dacă poziția specificată este disponibilă
      const isAvailable = await this.isPositionAvailable(position);
      if (!isAvailable) {
        throw new Error(`Position ${position} is already occupied. Please choose another position.`);
      }
    }

    // Validări specifice tipului
    if (data.type === 'product' && !data.productId) {
      throw new Error('Product ID is required for product type');
    }

    if (data.type === 'media' && !data.mediaId) {
      throw new Error('Media ID is required for media type');
    }

    if (data.type === 'custom' && (!data.title || !data.imageUrl)) {
      throw new Error('Title and image URL are required for custom type');
    }

    // Verifică dacă produsul/media există
    if (data.productId) {
      const product = await prisma.dataItem.findUnique({
        where: { id: data.productId }
      });
      if (!product) {
        throw new Error('Product not found');
      }
    }

    if (data.mediaId) {
      const media = await prisma.media.findUnique({
        where: { id: data.mediaId }
      });
      if (!media) {
        throw new Error('Media not found');
      }
    }

    const carouselItem = await prisma.carouselItem.create({
      data: {
        type: data.type,
        position: position,
        productId: data.productId,
        mediaId: data.mediaId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
        textStyle: data.textStyle,
        customTitle: data.customTitle,
        customDescription: data.customDescription,
        isActive: data.isActive !== undefined ? data.isActive : true,
        startDate: data.startDate,
        endDate: data.endDate,
        createdById: userId
      },
      include: {
        product: true,
        media: true
      }
    });

    return carouselItem;
  }

  // Actualizează un item din carousel
  async updateCarouselItem(id: string, data: Partial<CarouselItemData>) {
    const existingItem = await prisma.carouselItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      throw new Error('Carousel item not found');
    }

    // Dacă se schimbă poziția, verifică disponibilitatea
    if (data.position && data.position !== existingItem.position) {
      const isAvailable = await this.isPositionAvailable(data.position, id);
      if (!isAvailable) {
        throw new Error(`Position ${data.position} is already occupied. Please choose another position.`);
      }
    }

    const updatedItem = await prisma.carouselItem.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.position && { position: data.position }),
        ...(data.productId !== undefined && { productId: data.productId }),
        ...(data.mediaId !== undefined && { mediaId: data.mediaId }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl }),
        ...(data.textStyle !== undefined && { textStyle: data.textStyle }),
        ...(data.customTitle !== undefined && { customTitle: data.customTitle }),
        ...(data.customDescription !== undefined && { customDescription: data.customDescription }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate })
      },
      include: {
        product: true,
        media: true
      }
    });

    return updatedItem;
  }

  // Șterge un item din carousel
  async deleteCarouselItem(id: string) {
    const item = await prisma.carouselItem.findUnique({
      where: { id }
    });

    if (!item) {
      throw new Error('Carousel item not found');
    }

    await prisma.carouselItem.delete({
      where: { id }
    });

    return { success: true, message: 'Carousel item deleted successfully' };
  }

  // Schimbă poziția unui item (swap cu alt item)
  async swapPositions(itemId1: string, itemId2: string) {
    const item1 = await prisma.carouselItem.findUnique({
      where: { id: itemId1 }
    });

    const item2 = await prisma.carouselItem.findUnique({
      where: { id: itemId2 }
    });

    if (!item1 || !item2) {
      throw new Error('One or both carousel items not found');
    }

    // Swap pozițiile folosind o tranzacție
    await prisma.$transaction([
      prisma.carouselItem.update({
        where: { id: itemId1 },
        data: { position: item2.position }
      }),
      prisma.carouselItem.update({
        where: { id: itemId2 },
        data: { position: item1.position }
      })
    ]);

    return { success: true, message: 'Positions swapped successfully' };
  }

  // Mută un item la o nouă poziție (reordonează automat)
  async moveToPosition(itemId: string, newPosition: number) {
    const item = await prisma.carouselItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Carousel item not found');
    }

    const oldPosition = item.position;

    if (oldPosition === newPosition) {
      return item;
    }

    // Verifică dacă noua poziție este ocupată
    const targetItem = await prisma.carouselItem.findFirst({
      where: {
        position: newPosition,
        isActive: true,
        id: { not: itemId }
      }
    });

    if (targetItem) {
      // Swap cu item-ul de pe poziția țintă
      await this.swapPositions(itemId, targetItem.id);
    } else {
      // Doar actualizează poziția
      await prisma.carouselItem.update({
        where: { id: itemId },
        data: { position: newPosition }
      });
    }

    return await this.getCarouselItemById(itemId);
  }

  // Obține item-urile active pentru afișare publică
  async getActiveCarouselItems() {
    const now = new Date();

    const items = await prisma.carouselItem.findMany({
      where: {
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: now } },
              { endDate: { gte: now } }
            ]
          },
          {
            AND: [
              { startDate: null },
              { endDate: null }
            ]
          },
          {
            AND: [
              { startDate: { lte: now } },
              { endDate: null }
            ]
          },
          {
            AND: [
              { startDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            oldPrice: true,
            image: true,
            stock: true,
            rating: true,
            status: true
          }
        },
        media: {
          select: {
            id: true,
            url: true,
            title: true,
            description: true,
            altText: true,
            width: true,
            height: true
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });

    // Filtrează produsele care nu sunt publicate
    return items.filter(item => {
      if (item.type === 'product' && item.product) {
        return item.product.status === 'published';
      }
      return true;
    });
  }

  // Obține statistici despre carousel
  async getCarouselStats() {
    const totalItems = await prisma.carouselItem.count();
    const activeItems = await prisma.carouselItem.count({
      where: { isActive: true }
    });

    const itemsByType = await prisma.carouselItem.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });

    const positions = await this.getAvailablePositions();
    const availablePositions = positions.filter(p => p.isAvailable).length;
    const occupiedPositions = positions.filter(p => !p.isAvailable).length;

    return {
      totalItems,
      activeItems,
      inactiveItems: totalItems - activeItems,
      itemsByType: itemsByType.map(item => ({
        type: item.type,
        count: item._count.id
      })),
      availablePositions,
      occupiedPositions,
      nextAvailablePosition: await this.getNextAvailablePosition()
    };
  }
}

export const carouselService = new CarouselService();
