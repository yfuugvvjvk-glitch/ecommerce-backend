import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ChatService {
  // Creează o cameră de chat directă între doi utilizatori
  async createDirectChat(userId1: string, userId2: string) {
    try {
      // Verifică dacă există deja o cameră directă între acești utilizatori
      const existingRoom = await prisma.chatRoom.findFirst({
        where: {
          type: 'DIRECT',
          members: {
            every: {
              userId: { in: [userId1, userId2] }
            }
          }
        },
        include: {
          members: true
        }
      });

      if (existingRoom && existingRoom.members.length === 2) {
        return existingRoom;
      }

      // Creează o nouă cameră directă
      const chatRoom = await prisma.chatRoom.create({
        data: {
          type: 'DIRECT',
          createdById: userId1,
          members: {
            create: [
              { userId: userId1, role: 'MEMBER' },
              { userId: userId2, role: 'MEMBER' }
            ]
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  role: true
                }
              }
            }
          }
        }
      });

      return chatRoom;
    } catch (error) {
      console.error('Error creating direct chat:', error);
      throw new Error('Failed to create direct chat');
    }
  }

  // Creează o cameră de chat de grup
  async createGroupChat(creatorId: string, name: string, description?: string, memberIds: string[] = []) {
    try {
      const allMemberIds = [creatorId, ...memberIds.filter(id => id !== creatorId)];

      const chatRoom = await prisma.chatRoom.create({
        data: {
          name,
          description,
          type: 'GROUP',
          createdById: creatorId,
          members: {
            create: [
              { userId: creatorId, role: 'ADMIN' },
              ...memberIds.filter(id => id !== creatorId).map(userId => ({
                userId,
                role: 'MEMBER'
              }))
            ]
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  role: true
                }
              }
            }
          }
        }
      });

      return chatRoom;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw new Error('Failed to create group chat');
    }
  }

  // Creează o cameră de support cu administratorul
  async createSupportChat(userId: string) {
    try {
      // Găsește un administrator
      const admin = await prisma.user.findFirst({
        where: { role: 'admin' }
      });

      if (!admin) {
        throw new Error('No admin available for support');
      }

      // Verifică dacă există deja o cameră de support pentru acest utilizator
      const existingSupport = await prisma.chatRoom.findFirst({
        where: {
          type: 'SUPPORT',
          members: {
            some: { userId }
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  role: true
                }
              }
            }
          }
        }
      });

      if (existingSupport) {
        return existingSupport;
      }

      // Creează o nouă cameră de support
      const supportRoom = await prisma.chatRoom.create({
        data: {
          name: `Support - ${userId.substring(0, 8)}`,
          type: 'SUPPORT',
          createdById: userId,
          members: {
            create: [
              { userId, role: 'MEMBER' },
              { userId: admin.id, role: 'ADMIN' }
            ]
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  role: true
                }
              }
            }
          }
        }
      });

      return supportRoom;
    } catch (error) {
      console.error('Error creating support chat:', error);
      throw new Error('Failed to create support chat');
    }
  }

  // Obține toate camerele de chat ale unui utilizator
  async getUserChatRooms(userId: string) {
    try {
      const chatRooms = await prisma.chatRoom.findMany({
        where: {
          members: {
            some: {
              userId,
              isActive: true
            }
          },
          isActive: true
        },
        include: {
          members: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  role: true
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          },
          _count: {
            select: {
              messages: {
                where: {
                  readBy: {
                    none: {
                      userId
                    }
                  },
                  senderId: { not: userId }
                }
              }
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      return chatRooms.map(room => ({
        ...room,
        unreadCount: room._count.messages,
        lastMessage: room.messages[0] || null
      }));
    } catch (error) {
      console.error('Error getting user chat rooms:', error);
      throw new Error('Failed to get chat rooms');
    }
  }

  // Trimite un mesaj
  async sendMessage(chatRoomId: string, senderId: string, content: string, type: string = 'TEXT', fileUrl?: string, fileName?: string) {
    try {
      // Verifică dacă utilizatorul este membru al camerei
      const membership = await prisma.chatRoomMember.findFirst({
        where: {
          chatRoomId,
          userId: senderId,
          isActive: true
        }
      });

      if (!membership) {
        throw new Error('User is not a member of this chat room');
      }

      const message = await prisma.chatMessage.create({
        data: {
          chatRoomId,
          senderId,
          content,
          type,
          fileUrl,
          fileName
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true
            }
          }
        }
      });

      // Actualizează timestamp-ul camerei
      await prisma.chatRoom.update({
        where: { id: chatRoomId },
        data: { updatedAt: new Date() }
      });

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Obține mesajele unei camere
  async getChatMessages(chatRoomId: string, userId: string, page: number = 1, limit: number = 50) {
    try {
      // Verifică dacă utilizatorul este membru al camerei
      const membership = await prisma.chatRoomMember.findFirst({
        where: {
          chatRoomId,
          userId,
          isActive: true
        }
      });

      if (!membership) {
        throw new Error('User is not a member of this chat room');
      }

      const messages = await prisma.chatMessage.findMany({
        where: {
          chatRoomId,
          isDeleted: false
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true
            }
          },
          readBy: {
            where: { userId },
            select: { readAt: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      return messages.reverse(); // Returnează în ordine cronologică
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw new Error('Failed to get messages');
    }
  }

  // Marchează mesajele ca citite
  async markMessagesAsRead(chatRoomId: string, userId: string, messageIds?: string[]) {
    try {
      const whereClause: any = {
        chatRoomId,
        senderId: { not: userId },
        readBy: {
          none: { userId }
        }
      };

      if (messageIds && messageIds.length > 0) {
        whereClause.id = { in: messageIds };
      }

      const unreadMessages = await prisma.chatMessage.findMany({
        where: whereClause,
        select: { id: true }
      });

      if (unreadMessages.length > 0) {
        await prisma.chatMessageRead.createMany({
          data: unreadMessages.map(msg => ({
            messageId: msg.id,
            userId
          })),
          skipDuplicates: true
        });
      }

      return { markedCount: unreadMessages.length };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }

  // Adaugă membri într-un grup
  async addMembersToGroup(chatRoomId: string, adminId: string, memberIds: string[]) {
    try {
      // Verifică dacă utilizatorul este admin al grupului
      const adminMembership = await prisma.chatRoomMember.findFirst({
        where: {
          chatRoomId,
          userId: adminId,
          role: { in: ['ADMIN', 'MODERATOR'] },
          isActive: true
        }
      });

      if (!adminMembership) {
        throw new Error('User is not authorized to add members');
      }

      // Verifică că este un grup
      const chatRoom = await prisma.chatRoom.findUnique({
        where: { id: chatRoomId }
      });

      if (!chatRoom || chatRoom.type !== 'GROUP') {
        throw new Error('Can only add members to group chats');
      }

      // Adaugă membrii noi
      const newMembers = await prisma.chatRoomMember.createMany({
        data: memberIds.map(userId => ({
          chatRoomId,
          userId,
          role: 'MEMBER'
        })),
        skipDuplicates: true
      });

      return newMembers;
    } catch (error) {
      console.error('Error adding members to group:', error);
      throw new Error('Failed to add members to group');
    }
  }

  // Părăsește un grup
  async leaveGroup(chatRoomId: string, userId: string) {
    try {
      const membership = await prisma.chatRoomMember.findFirst({
        where: {
          chatRoomId,
          userId,
          isActive: true
        }
      });

      if (!membership) {
        throw new Error('User is not a member of this group');
      }

      await prisma.chatRoomMember.update({
        where: { id: membership.id },
        data: {
          isActive: false,
          leftAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error leaving group:', error);
      throw new Error('Failed to leave group');
    }
  }

  // Obține utilizatorii disponibili pentru chat
  async getAvailableUsers(userId: string) {
    try {
      // Obține toți utilizatorii disponibili (mai puțin utilizatorul curent)
      const availableUsers = await prisma.user.findMany({
        where: {
          id: { not: userId }
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true
        },
        orderBy: { name: 'asc' }
      });

      return availableUsers;
    } catch (error) {
      console.error('Error getting available users:', error);
      throw new Error('Failed to get available users');
    }
  }

  // Obține utilizatorii fără chat direct existent (pentru funcționalitatea originală)
  async getNewChatUsers(userId: string) {
    try {
      // Obține ID-urile utilizatorilor cu care are deja chat direct
      const existingDirectChats = await prisma.chatRoom.findMany({
        where: {
          type: 'DIRECT',
          members: {
            some: { userId }
          }
        },
        include: {
          members: {
            where: { userId: { not: userId } },
            select: { userId: true }
          }
        }
      });

      const existingChatUserIds = existingDirectChats.flatMap(chat => 
        chat.members.map(member => member.userId)
      );

      // Obține utilizatorii fără chat direct existent
      const newChatUsers = await prisma.user.findMany({
        where: {
          id: { 
            not: userId,
            notIn: existingChatUserIds
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true
        },
        orderBy: { name: 'asc' }
      });

      return newChatUsers;
    } catch (error) {
      console.error('Error getting new chat users:', error);
      throw new Error('Failed to get new chat users');
    }
  }

  // Editează un mesaj
  async editMessage(messageId: string, userId: string, newContent: string) {
    try {
      // Verifică dacă mesajul există și aparține utilizatorului
      const message = await prisma.chatMessage.findFirst({
        where: {
          id: messageId,
          senderId: userId,
          isDeleted: false
        }
      });

      if (!message) {
        throw new Error('Message not found or you are not authorized to edit it');
      }

      // Actualizează mesajul
      const updatedMessage = await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          content: newContent,
          isEdited: true,
          editedAt: new Date()
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true
            }
          }
        }
      });

      return updatedMessage;
    } catch (error) {
      console.error('Error editing message:', error);
      throw new Error('Failed to edit message');
    }
  }

  // Șterge un mesaj
  async deleteMessage(messageId: string, userId: string) {
    try {
      // Verifică dacă mesajul există și aparține utilizatorului
      const message = await prisma.chatMessage.findFirst({
        where: {
          id: messageId,
          senderId: userId,
          isDeleted: false
        }
      });

      if (!message) {
        throw new Error('Message not found or you are not authorized to delete it');
      }

      // Marchează mesajul ca șters
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      return { success: true, messageId };
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  // Șterge o conversație completă
  async deleteConversation(chatRoomId: string, userId: string) {
    try {
      // Verifică dacă utilizatorul este membru al camerei
      const membership = await prisma.chatRoomMember.findFirst({
        where: {
          chatRoomId,
          userId
        },
        include: {
          chatRoom: {
            include: {
              members: true
            }
          }
        }
      });

      if (!membership) {
        throw new Error('You are not a member of this chat room');
      }

      const chatRoom = membership.chatRoom;

      // Pentru chat-uri directe, permite ștergerea
      if (chatRoom.type === 'DIRECT') {
        // Șterge toate mesajele
        await prisma.chatMessage.updateMany({
          where: { chatRoomId },
          data: {
            isDeleted: true,
            deletedAt: new Date()
          }
        });

        // Șterge membrii
        await prisma.chatRoomMember.deleteMany({
          where: { chatRoomId }
        });

        // Șterge camera
        await prisma.chatRoom.delete({
          where: { id: chatRoomId }
        });

        return { success: true, message: 'Direct chat deleted successfully' };
      }

      // Pentru grupuri, doar administratorul poate șterge
      if (chatRoom.type === 'GROUP') {
        if (membership.role !== 'ADMIN' && chatRoom.createdById !== userId) {
          throw new Error('Only group administrators can delete the group');
        }

        // Șterge toate mesajele
        await prisma.chatMessage.updateMany({
          where: { chatRoomId },
          data: {
            isDeleted: true,
            deletedAt: new Date()
          }
        });

        // Șterge membrii
        await prisma.chatRoomMember.deleteMany({
          where: { chatRoomId }
        });

        // Șterge camera
        await prisma.chatRoom.delete({
          where: { id: chatRoomId }
        });

        return { success: true, message: 'Group chat deleted successfully' };
      }

      // Pentru chat-uri de support, nu permite ștergerea
      if (chatRoom.type === 'SUPPORT') {
        throw new Error('Support chats cannot be deleted');
      }

      throw new Error('Invalid chat room type');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete conversation');
    }
  }
}

export const chatService = new ChatService();