// src/services/notification-service.ts
'use server';

import * as path from 'path';
import type { User } from '@/types/user-types';
import { getAllUsers } from './data-access/user-data';
import { readDb, writeDb } from '@/lib/database-utils';

export interface Notification {
    id: string;
    userId: string; 
    projectId?: string; 
    message: string;
    timestamp: string; 
    isRead: boolean;
}

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
const NOTIFICATION_LIMIT = 300; 

async function findUsersByRole(role: string): Promise<User[]> {
    const allUsers = await getAllUsers();
    const usersInRole = allUsers.filter(user => user.role === role);
    return usersInRole;
}

export async function notifyUsersByRole(roleOrRoles: string | string[], message: string, projectId?: string): Promise<void> {
    const rolesToNotify = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    
    if (rolesToNotify.length === 0 || rolesToNotify.every(r => !r)) {
        return;
    }

    let notifications = await readDb<Notification[]>(DB_PATH, []);
    const now = new Date().toISOString();
    let notificationsAdded = 0;

    for (const role of rolesToNotify) {
        if (!role) continue;

        const targetUsers = await findUsersByRole(role);
        if (targetUsers.length === 0) {
            continue;
        }

        targetUsers.forEach(user => {
            const newNotification: Notification = {
                id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${user.id.slice(-3)}`,
                userId: user.id,
                projectId: projectId,
                message: message,
                timestamp: now,
                isRead: false,
            };
            notifications.push(newNotification);
            notificationsAdded++;
        });
    }
    
    if (notificationsAdded > 0) {
        notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (notifications.length > NOTIFICATION_LIMIT) {
          notifications = notifications.slice(0, NOTIFICATION_LIMIT);
        }

        await writeDb(DB_PATH, notifications);
    }
}

export async function notifyUserById(userId: string, message: string, projectId?: string): Promise<void> {
    if (!userId) {
        return;
    }

    const notifications = await readDb<Notification[]>(DB_PATH, []);
    const now = new Date().toISOString();

    const newNotification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: userId,
        projectId: projectId,
        message: message,
        timestamp: now,
        isRead: false,
    };
    notifications.push(newNotification);
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    await writeDb(DB_PATH, notifications);
}

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
    const allNotifications = await readDb<Notification[]>(DB_PATH, []);
    const userNotifications = allNotifications.filter(n => n.userId === userId);
    userNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return userNotifications;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const notifications = await readDb<Notification[]>(DB_PATH, []);
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);

    if (notificationIndex !== -1) {
        if (!notifications[notificationIndex].isRead) {
            notifications[notificationIndex].isRead = true;
            await writeDb(DB_PATH, notifications); 
        }
    }
}

export async function deleteNotificationsByProjectId(projectId: string): Promise<void> {
    if (!projectId) {
        return;
    }

    const notifications = await readDb<Notification[]>(DB_PATH, []);
    const filteredNotifications = notifications.filter(n => n.projectId !== projectId);
    
    if (notifications.length !== filteredNotifications.length) {
        await writeDb(DB_PATH, filteredNotifications);
    }
}

export async function clearAllNotifications(): Promise<void> {
    try {
        await writeDb(DB_PATH, []); 
    } catch (error) {
        console.error("[NotificationService] Failed to clear notifications:", error);
        throw new Error("Could not clear notification data.");
    }
}
