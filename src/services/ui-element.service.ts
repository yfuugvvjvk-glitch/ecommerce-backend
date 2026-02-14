import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UIElementData {
  type: string;
  label: string;
  icon?: string;
  position?: string;
  page?: string[];
  order?: number;
  size?: string;
  color?: string;
  isVisible?: boolean;
  action?: string;
  settings?: string;
  createdById: string;
}

export interface UIElementUpdateData {
  type?: string;
  label?: string;
  icon?: string;
  position?: string;
  page?: string[];
  order?: number;
  size?: string;
  color?: string;
  isVisible?: boolean;
  action?: string;
  settings?: string;
}

class UIElementService {
  // Obține toate elementele UI
  async getAllElements() {
    return await prisma.uIElement.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  // Obține elementele UI vizibile
  async getVisibleElements() {
    return await prisma.uIElement.findMany({
      where: { isVisible: true },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  // Obține un element UI după ID
  async getElementById(id: string) {
    return await prisma.uIElement.findUnique({
      where: { id }
    });
  }

  // Creează un element UI nou
  async createElement(data: UIElementData) {
    return await prisma.uIElement.create({
      data: {
        type: data.type,
        label: data.label,
        icon: data.icon,
        position: data.position || 'floating',
        page: data.page || ['all'],
        order: data.order || 0,
        size: data.size || 'medium',
        color: data.color || '#10B981',
        isVisible: data.isVisible !== undefined ? data.isVisible : true,
        action: data.action,
        settings: data.settings,
        createdById: data.createdById
      }
    });
  }

  // Actualizează un element UI
  async updateElement(id: string, data: UIElementUpdateData) {
    return await prisma.uIElement.update({
      where: { id },
      data
    });
  }

  // Șterge un element UI
  async deleteElement(id: string) {
    return await prisma.uIElement.delete({
      where: { id }
    });
  }

  // Toggle vizibilitate
  async toggleVisibility(id: string) {
    const element = await this.getElementById(id);
    if (!element) {
      throw new Error('UI Element not found');
    }

    return await prisma.uIElement.update({
      where: { id },
      data: { isVisible: !element.isVisible }
    });
  }

  // Reordonează elementele
  async reorderElements(elementIds: string[]) {
    const updates = elementIds.map((id, index) =>
      prisma.uIElement.update({
        where: { id },
        data: { order: index }
      })
    );

    await prisma.$transaction(updates);
    return { success: true, message: 'Elements reordered successfully' };
  }

  // Obține elementele pentru o pagină specifică
  async getElementsByPage(page: string) {
    return await prisma.uIElement.findMany({
      where: {
        isVisible: true,
        OR: [
          { page: { has: 'all' } },
          { page: { has: page } }
        ]
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }
}

export const uiElementService = new UIElementService();
