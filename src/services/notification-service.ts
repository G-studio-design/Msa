// src/services/notification-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import type { User } from '@/types/user-types';
import { getAllUsers } from './data-access/user-data';

export interface Notification {
    id: string;
    userId: string; 
    projectId?: string; 
    message: string;
    timestamp: string; 
    isRead: boolean;
}

const NOTIFICATION_LIMIT = 300; 

async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
    try {
        await fs.access(dbPath);
        const data = await fs.readFile(dbPath, 'utf8');
        if (data.trim() === "") {
            return defaultData;
        }
        return JSON.parse(data) as T;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
          return defaultData;
        }
        console.error(`[DB Read Error] Error reading or parsing database at ${path.basename(dbPath)}.`, error);
        return defaultData;
    }
}

async function writeDb<T>(dbPath: string, data: T): Promise<void> {
    const dbDir = path.dirname(dbPath);
    await fs.mkdir(dbDir, { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

async function findUsersByRole(role: string): Promise<User[]> {
    const allUsers = await getAllUsers();
    const usersInRole = allUsers.filter(user => user.role === role);
    return usersInRole;
}

export async function notifyUsersByRole(roleOrRoles: string | string[], message: string, projectId?: string): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
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
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
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
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
    const allNotifications = await readDb<Notification[]>(DB_PATH, []);
    const userNotifications = allNotifications.filter(n => n.userId === userId);
    userNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return userNotifications;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
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
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
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
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
    try {
        await writeDb(DB_PATH, []); 
    } catch (error) {
        console.error("[NotificationService] Failed to clear notifications:", error);
        throw new Error("Could not clear notification data.");
    }
}
