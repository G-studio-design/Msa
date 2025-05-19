// src/services/notification-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { getAllUsersForDisplay, type User } from './user-service';
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

// --- Helper Functions ---

async function readNotifications(): Promise<Notification[]> {
    try {
        await fs.access(DB_PATH);
    } catch (error) {
        console.log("[NotificationService/JSON] Notification database file not found, creating a new one.");
        await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        if (data.trim() === "") {
            console.warn("[NotificationService/JSON] Notification database file is empty. Initializing with an empty array.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("[NotificationService/JSON] Notification database file does not contain a valid JSON array. Resetting.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        return parsedData as Notification[];
    } catch (error: any) {
        console.error("[NotificationService/JSON] Error reading or parsing notification database:", error);
        if (error instanceof SyntaxError) {
            console.warn(`[NotificationService/JSON] SyntaxError in notification database: ${error.message}. Attempting to reset.`);
        }
        try {
            console.log("[NotificationService/JSON] Attempting to reset notification database due to read/parse error.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        } catch (writeError) {
            console.error("[NotificationService/JSON] Failed to reset notification database:", writeError);
            throw new Error('Failed to read or reset notification data.');
        }
    }
}

async function writeNotifications(notifications: Notification[]): Promise<void> {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(notifications, null, 2), 'utf8');
        // console.log("Notification data written to DB_PATH successfully."); // Reduce verbosity
    } catch (error) {
        console.error("[NotificationService/JSON] Error writing notification database:", error);
        throw new Error('Failed to save notification data.');
    }
}


async function findUsersByRole(role: string): Promise<User[]> {
    const allUsersForDisplay = await getAllUsersForDisplay();
    return allUsersForDisplay.filter(user => user.role === role);
}

// --- Notification Service Functions ---

export async function notifyUsersByRole(role: string, message: string, projectId?: string): Promise<void> {
    console.log(`[NotificationService/JSON] Sending notification to role "${role}": ${message}${projectId ? ` (Project: ${projectId})` : ''}`);
    try {
        if (!role) {
            console.warn(`[NotificationService/JSON] No target role specified for notification: "${message}". Skipping.`);
            return;
        }
        const targetUsers = await findUsersByRole(role);
        if (targetUsers.length === 0) {
            console.warn(`[NotificationService/JSON] No users found with role "${role}" to notify for message: "${message}".`);
            return;
        }

        const notifications = await readNotifications(); 
        const now = new Date().toISOString();

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
            console.log(` -> Notification queued for user ${user.username} (${user.id})`);
        });

        await writeNotifications(notifications); 
        // console.log(`Notifications persisted. Total notifications: ${notifications.length}`); // Reduce verbosity

    } catch (error) {
        console.error(`[NotificationService/JSON] Error notifying users by role "${role}":`, error);
    }
}

export async function notifyUserById(userId: string, message: string, projectId?: string): Promise<void> {
    console.log(`[NotificationService/JSON] Sending notification to user ID "${userId}": ${message}${projectId ? ` (Project: ${projectId})` : ''}`);
    try {
        if (!userId) {
            console.warn(`[NotificationService/JSON] No target user ID specified for notification: "${message}". Skipping.`);
            return;
        }

        const notifications = await readNotifications();
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

        await writeNotifications(notifications);
        // console.log(`Notification for user ${userId} persisted. Total notifications: ${notifications.length}`); // Reduce verbosity

    } catch (error) {
        console.error(`[NotificationService/JSON] Error notifying user ID "${userId}":`, error);
    }
}


export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
    const allNotifications = await readNotifications();
    const userNotifications = allNotifications.filter(n => n.userId === userId);
    userNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return userNotifications;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const notifications = await readNotifications();
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);

    if (notificationIndex !== -1) {
        if (!notifications[notificationIndex].isRead) {
            notifications[notificationIndex].isRead = true;
            await writeNotifications(notifications); 
            console.log(`[NotificationService/JSON] Notification ${notificationId} marked as read.`);
        } else {
             console.log(`[NotificationService/JSON] Notification ${notificationId} was already marked as read.`);
        }
    } else {
        console.warn(`[NotificationService/JSON] Notification ${notificationId} not found to mark as read.`);
    }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
     let changed = false;
     const notifications = await readNotifications();
     const updatedNotifications = notifications.map(n => {
         if (n.userId === userId && !n.isRead) {
             changed = true;
             return { ...n, isRead: true };
         }
         return n;
     });

     if (changed) {
         await writeNotifications(updatedNotifications); 
         console.log(`[NotificationService/JSON] All unread notifications marked as read for user ${userId}.`);
     } else {
         console.log(`[NotificationService/JSON] No unread notifications found for user ${userId} to mark as read.`);
     }
}

export async function clearAllNotifications(): Promise<void> {
    try {
        await writeNotifications([]); 
        console.log("[NotificationService/JSON] All notifications have been cleared.");
    } catch (error) {
        console.error("[NotificationService/JSON] Failed to clear notifications:", error);
        throw new Error("Could not clear notification data.");
    }
}
