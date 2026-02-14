import { PrismaClient } from '@prisma/client';
import { realtimeService } from './realtime.service';

const prisma = new PrismaClient();

export class DeliveryLocationService {
  // Obține toate locațiile de livrare
  async getAllLocations() {
    return await prisma.deliveryLocation.findMany({
      include: {
        deliveryMethod: true
      },
      orderBy: [
        { isMainLocation: 'desc' },
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  // Obține locațiile active
  async getActiveLocations() {
    return await prisma.deliveryLocation.findMany({
      where: { isActive: true },
      include: {
        deliveryMethod: true
      },
      orderBy: [
        { isMainLocation: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  // Obține o locație după ID
  async getLocationById(id: string) {
    return await prisma.deliveryLocation.findUnique({
      where: { id },
      include: {
        deliveryMethod: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });
  }

  // Creează o locație nouă
  async createLocation(data: {
    name: string;
    address: string;
    street?: string; // ADĂUGAT
    streetNumber?: string; // ADĂUGAT
    city: string;
    county?: string; // ADĂUGAT
    postalCode?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
    phone?: string;
    email?: string;
    deliveryRadius?: number;
    deliveryFee?: number;
    freeDeliveryThreshold?: number;
    workingHours?: any;
    specialInstructions?: string;
    contactPerson?: string;
    isMainLocation?: boolean;
  }) {
    const location = await prisma.deliveryLocation.create({
      data: {
        ...data,
        coordinates: data.coordinates ? JSON.stringify(data.coordinates) : null,
        workingHours: data.workingHours ? JSON.stringify(data.workingHours) : null,
        country: data.country || 'România'
      }
    });

    // Broadcast real-time update
    if (realtimeService) {
      realtimeService.broadcastContentUpdate({
        type: 'delivery_location_created',
        locationId: location.id,
        name: location.name,
        timestamp: new Date()
      });
    }

    return location;
  }

  // Actualizează o locație
  async updateLocation(id: string, data: {
    name?: string;
    address?: string;
    street?: string; // ADĂUGAT
    streetNumber?: string; // ADĂUGAT
    city?: string;
    county?: string; // ADĂUGAT
    postalCode?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
    phone?: string;
    email?: string;
    isActive?: boolean;
    deliveryRadius?: number;
    deliveryFee?: number;
    freeDeliveryThreshold?: number;
    workingHours?: any;
    specialInstructions?: string;
    contactPerson?: string;
    isMainLocation?: boolean;
  }) {
    const updateData: any = { ...data };
    
    if (data.coordinates) {
      updateData.coordinates = JSON.stringify(data.coordinates);
    }
    
    if (data.workingHours) {
      updateData.workingHours = JSON.stringify(data.workingHours);
    }

    const location = await prisma.deliveryLocation.update({
      where: { id },
      data: updateData
    });

    // Broadcast real-time update
    if (realtimeService) {
      realtimeService.broadcastContentUpdate({
        type: 'delivery_location_updated',
        locationId: location.id,
        name: location.name,
        timestamp: new Date()
      });
    }

    return location;
  }

  // Șterge o locație
  async deleteLocation(id: string) {
    const location = await prisma.deliveryLocation.findUnique({
      where: { id },
      select: { name: true }
    });

    // Verifică dacă locația are comenzi asociate
    const orderCount = await prisma.order.count({
      where: { deliveryLocationId: id }
    });

    if (orderCount > 0) {
      throw new Error(`Cannot delete location. It has ${orderCount} associated orders.`);
    }

    await prisma.deliveryLocation.delete({
      where: { id }
    });

    // Broadcast real-time update
    if (realtimeService && location) {
      realtimeService.broadcastContentUpdate({
        type: 'delivery_location_deleted',
        locationId: id,
        name: location.name,
        timestamp: new Date()
      });
    }

    return { success: true };
  }

  // Setează locația principală
  async setMainLocation(id: string) {
    await prisma.$transaction([
      // Resetează toate locațiile ca non-principale
      prisma.deliveryLocation.updateMany({
        data: { isMainLocation: false }
      }),
      // Setează locația specificată ca principală
      prisma.deliveryLocation.update({
        where: { id },
        data: { isMainLocation: true }
      })
    ]);

    // Broadcast real-time update
    if (realtimeService) {
      realtimeService.broadcastContentUpdate({
        type: 'main_location_changed',
        locationId: id,
        timestamp: new Date()
      });
    }

    return { success: true };
  }

  // Calculează costul de livrare pentru o locație și sumă
  async calculateDeliveryFee(locationId: string, orderTotal: number) {
    const location = await prisma.deliveryLocation.findUnique({
      where: { id: locationId }
    });

    if (!location || !location.isActive) {
      throw new Error('Delivery location not found or inactive');
    }

    // Verifică pragul pentru livrare gratuită
    if (location.freeDeliveryThreshold && orderTotal >= location.freeDeliveryThreshold) {
      return {
        fee: 0,
        isFree: true,
        threshold: location.freeDeliveryThreshold
      };
    }

    return {
      fee: location.deliveryFee,
      isFree: false,
      threshold: location.freeDeliveryThreshold
    };
  }

  // Verifică dacă o adresă este în raza de livrare
  async checkDeliveryRadius(locationId: string, customerCoordinates: { lat: number; lng: number }) {
    const location = await prisma.deliveryLocation.findUnique({
      where: { id: locationId }
    });

    if (!location || !location.coordinates || !location.deliveryRadius) {
      return { inRange: true, distance: null }; // Dacă nu sunt setate coordonate, acceptă
    }

    const locationCoords = JSON.parse(location.coordinates);
    const distance = this.calculateDistance(
      locationCoords.lat,
      locationCoords.lng,
      customerCoordinates.lat,
      customerCoordinates.lng
    );

    return {
      inRange: distance <= location.deliveryRadius,
      distance,
      maxRadius: location.deliveryRadius
    };
  }

  // Calculează distanța între două puncte (formula Haversine)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raza Pământului în km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Obține statistici pentru o locație
  async getLocationStats(locationId: string) {
    const [
      totalOrders,
      totalRevenue,
      monthlyOrders,
      monthlyRevenue,
      averageOrderValue
    ] = await Promise.all([
      prisma.order.count({
        where: { deliveryLocationId: locationId }
      }),
      prisma.order.aggregate({
        where: { 
          deliveryLocationId: locationId,
          status: 'DELIVERED'
        },
        _sum: { total: true }
      }),
      prisma.order.count({
        where: {
          deliveryLocationId: locationId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.order.aggregate({
        where: {
          deliveryLocationId: locationId,
          status: 'DELIVERED',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { total: true }
      }),
      prisma.order.aggregate({
        where: {
          deliveryLocationId: locationId,
          status: 'DELIVERED'
        },
        _avg: { total: true }
      })
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      monthlyOrders,
      monthlyRevenue: monthlyRevenue._sum.total || 0,
      averageOrderValue: averageOrderValue._avg.total || 0
    };
  }

  // Obține locațiile cu programul de lucru pentru astăzi
  async getLocationsOpenToday() {
    const today = new Date().getDay(); // 0 = Duminică, 1 = Luni, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today];

    const locations = await this.getActiveLocations();
    
    return locations.filter(location => {
      if (!location.workingHours) return true; // Dacă nu sunt setate ore, consideră deschis
      
      try {
        const hours = JSON.parse(location.workingHours);
        return hours[todayName]?.isOpen !== false;
      } catch {
        return true; // Dacă nu poate parsa JSON-ul, consideră deschis
      }
    });
  }
}

export const deliveryLocationService = new DeliveryLocationService();