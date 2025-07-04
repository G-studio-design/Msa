
// src/services/notification-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils';
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

async function findUsersByRole(role: string): Promise<User[]> {
    const allUsers = await getAllUsers();
    return allUsers.filter(user => user.role === role);
}

export async function notifyUsersByRole(roleOrRoles: string | string[], message: string, projectId?: string): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
    const rolesToNotify = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    
    if (rolesToNotify.length === 0 || rolesToNotify.every(r => !r)) {
        console.warn(`[NotificationService] No target role(s) specified. Skipping.`);
        return;
    }

    let notifications = await readDb<Notification[]>(DB_PATH, []);
    const now = new Date().toISOString();
    let notificationsAdded = 0;

    for (const role of rolesToNotify) {
        if (!role) continue;
        const targetUsers = await findUsersByRole(role);
        targetUsers.forEach(user => {
            const newNotification: Notification = {
                id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
    if (!userId) return;
    const notifications = await readDb<Notification[]>(DB_PATH, []);
    const now = new Date().toISOString();
    notifications.push({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId, projectId, message, timestamp: now, isRead: false,
    });
    await writeDb(DB_PATH, notifications);
}

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
    const allNotifications = await readDb<Notification[]>(DB_PATH, []);
    return allNotifications
        .filter(n => n.userId === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
    const notifications = await readDb<Notification[]>(DB_PATH, []);
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
        notification.isRead = true;
        await writeDb(DB_PATH, notifications); 
    }
}

export async function deleteNotificationsByProjectId(projectId: string): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
    if (!projectId) return;
    const notifications = await readDb<Notification[]>(DB_PATH, []);
    const filtered = notifications.filter(n => n.projectId !== projectId);
    await writeDb(DB_PATH, filtered);
}

export async function clearAllNotifications(): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
    await writeDb(DB_PATH, []);
}
