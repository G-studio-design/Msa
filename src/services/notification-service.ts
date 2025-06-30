// src/services/notification-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils'; // Import centralized utils
import { getAllUsersForDisplay, findUserByUsername as findUserByUsernameInternal, type User } from './user-service'; // findUserByUsernameInternal to avoid conflict if User type is also User
import type { Project } from './project-service'; // Import Project type

// Define the structure of a Notification
export interface Notification {
    id: string;
    userId: string; // ID of the user to receive the notification
    projectId?: string; // Optional project ID related to the notification
    message: string;
    timestamp: string; // ISO string
    isRead: boolean;
}

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'notifications.json');
const NOTIFICATION_LIMIT = 300; // Limit the total number of notifications stored

// --- Helper Functions ---

// The individual read/write functions are no longer needed here.
// The new readDb/writeDb functions from json-db-utils handle file access.

// This function needs to read users.json directly to get all users including developers
async function getAllUsersIncludingDevelopers(): Promise<User[]> {
    const USERS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    return await readDb<User[]>(USERS_DB_PATH, []);
}


async function findUsersByRole(role: string): Promise<User[]> {
    const allUsers = await getAllUsersIncludingDevelopers();
    const usersInRole = allUsers.filter(user => user.role === role);
    console.log(`[NotificationService/findUsersByRole] Found ${usersInRole.length} user(s) with role "${role}" for notification.`);
    return usersInRole;
}

// --- Notification Service Functions ---

export async function notifyUsersByRole(roleOrRoles: string | string[], message: string, projectId?: string): Promise<void> {
    const rolesToNotify = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    console.log(`[NotificationService] Attempting to send notification to role(s) "${rolesToNotify.join(', ')}": ${message}${projectId ? ` (Project: ${projectId})` : ''}`);
    
    try {
        if (rolesToNotify.length === 0 || rolesToNotify.every(r => !r)) {
            console.warn(`[NotificationService] No target role(s) specified for notification: "${message}". Skipping.`);
            return;
        }

        let notifications = await readDb<Notification[]>(DB_PATH, []);
        const now = new Date().toISOString();
        let notificationsAdded = 0;

        for (const role of rolesToNotify) {
            if (!role) continue; // Skip if a role in the array is empty or null

            const targetUsers = await findUsersByRole(role);
            if (targetUsers.length === 0) {
                console.warn(`[NotificationService] No users found with role "${role}" to notify for message: "${message}".`);
                continue;
            }

            targetUsers.forEach(user => {
                const newNotification: Notification = {
                    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${user.id.slice(-3)}`, // Make ID more unique
                    userId: user.id,
                    projectId: projectId,
                    message: message,
                    timestamp: now,
                    isRead: false,
                };
                notifications.push(newNotification);
                notificationsAdded++;
                console.log(` -> Notification queued for user ${user.username} (${user.id}) for role ${role}`);
            });
        }
        
        if (notificationsAdded > 0) {
            // Sort by timestamp descending (newest first) to prepare for trimming
            notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            // Keep only the most recent notifications up to the limit
            if (notifications.length > NOTIFICATION_LIMIT) {
              console.log(`[NotificationService] Notification limit (${NOTIFICATION_LIMIT}) reached. Trimming ${notifications.length - NOTIFICATION_LIMIT} oldest notifications.`);
              notifications = notifications.slice(0, NOTIFICATION_LIMIT);
            }

            await writeDb(DB_PATH, notifications);
            console.log(`[NotificationService] ${notificationsAdded} notification(s) successfully written.`);
        } else {
            console.log(`[NotificationService] No notifications were added to be written.`);
        }

    } catch (error) {
        console.error(`[NotificationService] Error notifying users by role(s) "${rolesToNotify.join(', ')}":`, error);
    }
}

export async function notifyUserById(userId: string, message: string, projectId?: string): Promise<void> {
    console.log(`[NotificationService] Sending notification to user ID "${userId}": ${message}${projectId ? ` (Project: ${projectId})` : ''}`);
    try {
        if (!userId) {
            console.warn(`[NotificationService] No target user ID specified for notification: "${message}". Skipping.`);
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
        console.log(` -> Notification queued for user ${userId}`);

        await writeDb(DB_PATH, notifications);

    } catch (error) {
        console.error(`[NotificationService] Error notifying user ID "${userId}":`, error);
    }
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
            console.log(`[NotificationService] Notification ${notificationId} marked as read.`);
        } else {
             console.log(`[NotificationService] Notification ${notificationId} was already marked as read.`);
        }
    } else {
        console.warn(`[NotificationService] Notification ${notificationId} not found to mark as read.`);
    }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
     let changed = false;
     const notifications = await readDb<Notification[]>(DB_PATH, []);
     const updatedNotifications = notifications.map(n => {
         if (n.userId === userId && !n.isRead) {
             changed = true;
             return { ...n, isRead: true };
         }
         return n;
     });

     if (changed) {
         await writeDb(DB_PATH, updatedNotifications); 
         console.log(`[NotificationService] All unread notifications marked as read for user ${userId}.`);
     } else {
         console.log(`[NotificationService] No unread notifications found for user ${userId} to mark as read.`);
     }
}

export async function deleteNotificationsByProjectId(projectId: string): Promise<void> {
    console.log(`[NotificationService] Deleting notifications for project ID: ${projectId}`);
    try {
        if (!projectId) {
            console.warn(`[NotificationService] No project ID provided for notification deletion. Skipping.`);
            return;
        }

        const notifications = await readDb<Notification[]>(DB_PATH, []);
        const originalCount = notifications.length;
        const filteredNotifications = notifications.filter(n => n.projectId !== projectId);
        const newCount = filteredNotifications.length;

        if (originalCount !== newCount) {
            await writeDb(DB_PATH, filteredNotifications);
            console.log(`[NotificationService] Successfully deleted ${originalCount - newCount} notification(s) for project ID ${projectId}.`);
        } else {
            console.log(`[NotificationService] No notifications found for project ID ${projectId}. No changes made.`);
        }

    } catch (error) {
        console.error(`[NotificationService] Error deleting notifications for project ID "${projectId}":`, error);
    }
}

export async function clearAllNotifications(): Promise<void> {
    try {
        await writeDb(DB_PATH, []); 
        console.log("[NotificationService] All notifications have been cleared.");
    } catch (error) {
        console.error("[NotificationService] Failed to clear notifications:", error);
        throw new Error("Could not clear notification data.");
    }
}
