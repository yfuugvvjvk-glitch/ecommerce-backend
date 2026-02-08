import { PrismaClient } from '@prisma/client';
import { realtimeService } from './realtime.service';

const prisma = new PrismaClient();

export class SiteConfigService {
  // Obține toate configurațiile
  async getAllConfigs() {
    return await prisma.siteConfig.findMany({
      orderBy: { key: 'asc' }
    });
  }

  // Obține configurațiile publice (pentru frontend)
  async getPublicConfigs() {
    const configs = await prisma.siteConfig.findMany({
      where: { isPublic: true },
      select: { key: true, value: true, type: true }
    });

    // Convertește într-un obiect pentru ușurința folosirii
    const configObject: any = {};
    configs.forEach(config => {
      configObject[config.key] = this.parseConfigValue(config.value, config.type);
    });

    return configObject;
  }

  // Obține o configurație specifică
  async getConfig(key: string) {
    const config = await prisma.siteConfig.findUnique({
      where: { key }
    });

    if (!config) return null;

    return {
      ...config,
      value: this.parseConfigValue(config.value, config.type)
    };
  }

  // Setează o configurație
  async setConfig(key: string, value: any, options: {
    type?: string;
    description?: string;
    isPublic?: boolean;
    updatedById?: string;
  } = {}) {
    const stringValue = this.stringifyConfigValue(value, options.type || 'text');

    const config = await prisma.siteConfig.upsert({
      where: { key },
      update: {
        value: stringValue,
        type: options.type || 'text',
        description: options.description,
        isPublic: options.isPublic,
        updatedById: options.updatedById,
        updatedAt: new Date()
      },
      create: {
        key,
        value: stringValue,
        type: options.type || 'text',
        description: options.description,
        isPublic: options.isPublic || false,
        updatedById: options.updatedById
      }
    });

    // Broadcast real-time update
    if (realtimeService) {
      realtimeService.broadcastContentUpdate({
        type: 'config_updated',
        key,
        value: this.parseConfigValue(config.value, config.type),
        isPublic: config.isPublic,
        timestamp: new Date()
      });
    }

    return {
      ...config,
      value: this.parseConfigValue(config.value, config.type)
    };
  }

  // Șterge o configurație
  async deleteConfig(key: string) {
    await prisma.siteConfig.delete({
      where: { key }
    });

    // Broadcast real-time update
    if (realtimeService) {
      realtimeService.broadcastContentUpdate({
        type: 'config_deleted',
        key,
        timestamp: new Date()
      });
    }

    return { success: true };
  }

  // Setează configurații în masă
  async setBulkConfigs(configs: Array<{
    key: string;
    value: any;
    type?: string;
    description?: string;
    isPublic?: boolean;
  }>, updatedById?: string) {
    const operations = configs.map(config => 
      prisma.siteConfig.upsert({
        where: { key: config.key },
        update: {
          value: this.stringifyConfigValue(config.value, config.type || 'text'),
          type: config.type || 'text',
          description: config.description,
          isPublic: config.isPublic,
          updatedById,
          updatedAt: new Date()
        },
        create: {
          key: config.key,
          value: this.stringifyConfigValue(config.value, config.type || 'text'),
          type: config.type || 'text',
          description: config.description,
          isPublic: config.isPublic || false,
          updatedById
        }
      })
    );

    const results = await prisma.$transaction(operations);

    // Broadcast real-time update
    if (realtimeService) {
      realtimeService.broadcastContentUpdate({
        type: 'configs_bulk_updated',
        keys: configs.map(c => c.key),
        timestamp: new Date()
      });
    }

    return results.map(config => ({
      ...config,
      value: this.parseConfigValue(config.value, config.type)
    }));
  }

  // Inițializează configurațiile implicite
  async initializeDefaultConfigs() {
    const defaultConfigs = [
      {
        key: 'site_name',
        value: 'Site Comerț Live',
        type: 'text',
        description: 'Numele site-ului',
        isPublic: true
      },
      {
        key: 'site_description',
        value: 'Platforma de comerț electronic cu funcționalități avansate',
        type: 'text',
        description: 'Descrierea site-ului',
        isPublic: true
      },
      {
        key: 'contact_email',
        value: 'contact@site.ro',
        type: 'text',
        description: 'Email-ul de contact principal',
        isPublic: true
      },
      {
        key: 'contact_phone',
        value: '+40 123 456 789',
        type: 'text',
        description: 'Telefonul de contact principal',
        isPublic: true
      },
      {
        key: 'business_hours',
        value: {
          monday: '09:00 - 18:00',
          tuesday: '09:00 - 18:00',
          wednesday: '09:00 - 18:00',
          thursday: '09:00 - 18:00',
          friday: '09:00 - 18:00',
          saturday: '10:00 - 16:00',
          sunday: 'Închis'
        },
        type: 'json',
        description: 'Programul de lucru',
        isPublic: true
      },
      {
        key: 'company_address',
        value: 'Strada Exemplu, Nr. 123, București, România',
        type: 'text',
        description: 'Adresa companiei',
        isPublic: true
      },
      {
        key: 'company_coordinates',
        value: { lat: 44.4268, lng: 26.1025 },
        type: 'json',
        description: 'Coordonatele companiei pentru hartă',
        isPublic: true
      },
      {
        key: 'currency',
        value: 'RON',
        type: 'text',
        description: 'Moneda folosită',
        isPublic: true
      },
      {
        key: 'tax_rate',
        value: 19,
        type: 'number',
        description: 'Rata TVA (%)',
        isPublic: false
      },
      {
        key: 'min_order_value',
        value: 50,
        type: 'number',
        description: 'Valoarea minimă a comenzii',
        isPublic: true
      },
      {
        key: 'free_delivery_threshold',
        value: 100,
        type: 'number',
        description: 'Pragul pentru livrare gratuită',
        isPublic: true
      },
      {
        key: 'social_media',
        value: {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: ''
        },
        type: 'json',
        description: 'Link-uri rețele sociale',
        isPublic: true
      },
      {
        key: 'maintenance_mode',
        value: false,
        type: 'boolean',
        description: 'Modul de mentenanță',
        isPublic: false
      },
      {
        key: 'allow_registrations',
        value: true,
        type: 'boolean',
        description: 'Permite înregistrări noi',
        isPublic: false
      }
    ];

    const existingConfigs = await prisma.siteConfig.findMany({
      select: { key: true }
    });
    const existingKeys = existingConfigs.map(c => c.key);

    // Creează doar configurațiile care nu există
    const newConfigs = defaultConfigs.filter(config => !existingKeys.includes(config.key));
    
    if (newConfigs.length > 0) {
      await this.setBulkConfigs(newConfigs);
    }

    return { initialized: newConfigs.length, existing: existingKeys.length };
  }

  // Parsează valoarea configurației în funcție de tip
  private parseConfigValue(value: string, type: string): any {
    switch (type) {
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      default:
        return value;
    }
  }

  // Convertește valoarea în string pentru stocare
  private stringifyConfigValue(value: any, type: string): string {
    switch (type) {
      case 'json':
        return JSON.stringify(value);
      case 'boolean':
        return value ? 'true' : 'false';
      default:
        return String(value);
    }
  }
}

export const siteConfigService = new SiteConfigService();