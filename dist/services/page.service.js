"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageService = exports.PageService = void 0;
const client_1 = require("@prisma/client");
const realtime_service_1 = require("./realtime.service");
const prisma = new client_1.PrismaClient();
class PageService {
    // Obține toate paginile
    async getAllPages() {
        return await prisma.page.findMany({
            include: {
                sections: {
                    where: { isVisible: true },
                    orderBy: { position: 'asc' }
                },
                createdBy: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }
    // Obține o pagină după slug
    async getPageBySlug(slug) {
        return await prisma.page.findUnique({
            where: { slug },
            include: {
                sections: {
                    where: { isVisible: true },
                    orderBy: { position: 'asc' }
                },
                createdBy: {
                    select: { name: true, email: true }
                }
            }
        });
    }
    // Obține o pagină după ID
    async getPageById(id) {
        return await prisma.page.findUnique({
            where: { id },
            include: {
                sections: {
                    orderBy: { position: 'asc' }
                },
                createdBy: {
                    select: { name: true, email: true }
                }
            }
        });
    }
    // Creează o pagină nouă
    async createPage(data) {
        const page = await prisma.page.create({
            data,
            include: {
                sections: true,
                createdBy: {
                    select: { name: true, email: true }
                }
            }
        });
        // Broadcast real-time update
        if (realtime_service_1.realtimeService) {
            realtime_service_1.realtimeService.broadcastContentUpdate({
                type: 'page_created',
                pageId: page.id,
                slug: page.slug,
                title: page.title,
                timestamp: new Date()
            });
        }
        return page;
    }
    // Actualizează o pagină
    async updatePage(id, data) {
        const page = await prisma.page.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            },
            include: {
                sections: {
                    orderBy: { position: 'asc' }
                },
                createdBy: {
                    select: { name: true, email: true }
                }
            }
        });
        // Broadcast real-time update
        if (realtime_service_1.realtimeService) {
            realtime_service_1.realtimeService.broadcastContentUpdate({
                type: 'page_updated',
                pageId: page.id,
                slug: page.slug,
                title: page.title,
                timestamp: new Date()
            });
        }
        return page;
    }
    // Șterge o pagină
    async deletePage(id) {
        const page = await prisma.page.findUnique({
            where: { id },
            select: { slug: true, title: true }
        });
        await prisma.page.delete({
            where: { id }
        });
        // Broadcast real-time update
        if (realtime_service_1.realtimeService && page) {
            realtime_service_1.realtimeService.broadcastContentUpdate({
                type: 'page_deleted',
                pageId: id,
                slug: page.slug,
                title: page.title,
                timestamp: new Date()
            });
        }
        return { success: true };
    }
    // Gestionare secțiuni pagină
    async addPageSection(pageId, data) {
        // Dacă nu e specificată poziția, pune la sfârșit
        if (!data.position) {
            const lastSection = await prisma.pageSection.findFirst({
                where: { pageId },
                orderBy: { position: 'desc' }
            });
            data.position = (lastSection?.position || 0) + 1;
        }
        const section = await prisma.pageSection.create({
            data: {
                ...data,
                pageId,
                settings: data.settings ? JSON.stringify(data.settings) : null
            }
        });
        // Broadcast real-time update
        if (realtime_service_1.realtimeService) {
            realtime_service_1.realtimeService.broadcastContentUpdate({
                type: 'section_added',
                pageId,
                sectionId: section.id,
                timestamp: new Date()
            });
        }
        return section;
    }
    async updatePageSection(sectionId, data) {
        const section = await prisma.pageSection.update({
            where: { id: sectionId },
            data: {
                ...data,
                settings: data.settings ? JSON.stringify(data.settings) : undefined
            }
        });
        // Broadcast real-time update
        if (realtime_service_1.realtimeService) {
            realtime_service_1.realtimeService.broadcastContentUpdate({
                type: 'section_updated',
                pageId: section.pageId,
                sectionId: section.id,
                timestamp: new Date()
            });
        }
        return section;
    }
    async deletePageSection(sectionId) {
        const section = await prisma.pageSection.findUnique({
            where: { id: sectionId },
            select: { pageId: true }
        });
        await prisma.pageSection.delete({
            where: { id: sectionId }
        });
        // Broadcast real-time update
        if (realtime_service_1.realtimeService && section) {
            realtime_service_1.realtimeService.broadcastContentUpdate({
                type: 'section_deleted',
                pageId: section.pageId,
                sectionId,
                timestamp: new Date()
            });
        }
        return { success: true };
    }
    // Reordonează secțiunile unei pagini
    async reorderPageSections(pageId, sectionIds) {
        const updates = sectionIds.map((sectionId, index) => prisma.pageSection.update({
            where: { id: sectionId },
            data: { position: index }
        }));
        await prisma.$transaction(updates);
        // Broadcast real-time update
        if (realtime_service_1.realtimeService) {
            realtime_service_1.realtimeService.broadcastContentUpdate({
                type: 'sections_reordered',
                pageId,
                timestamp: new Date()
            });
        }
        return { success: true };
    }
    // Publică/depublică o pagină
    async togglePagePublication(id) {
        const currentPage = await prisma.page.findUnique({
            where: { id },
            select: { isPublished: true }
        });
        if (!currentPage) {
            throw new Error('Page not found');
        }
        const page = await prisma.page.update({
            where: { id },
            data: { isPublished: !currentPage.isPublished },
            include: {
                sections: true,
                createdBy: {
                    select: { name: true, email: true }
                }
            }
        });
        // Broadcast real-time update
        if (realtime_service_1.realtimeService) {
            realtime_service_1.realtimeService.broadcastContentUpdate({
                type: 'page_publication_toggled',
                pageId: page.id,
                slug: page.slug,
                isPublished: page.isPublished,
                timestamp: new Date()
            });
        }
        return page;
    }
    // Obține paginile publicate pentru frontend
    async getPublishedPages() {
        return await prisma.page.findMany({
            where: { isPublished: true },
            include: {
                sections: {
                    where: { isVisible: true },
                    orderBy: { position: 'asc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }
}
exports.PageService = PageService;
exports.pageService = new PageService();
