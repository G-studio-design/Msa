
// src/services/notification-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
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
        // Sort by timestamp descending (newest first) to prepare for trimming
        notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Keep only the most recent notifications up to the limit
        if (notifications.length > NOTIFICATION_LIMIT) {
          console.log(`[NotificationService/JSON] Notification limit (${NOTIFICATION_LIMIT}) reached. Trimming ${notifications.length - NOTIFICATION_LIMIT} oldest notifications.`);
          notifications = notifications.slice(0, NOTIFICATION_LIMIT);
        }

        await fs.writeFile(DB_PATH, JSON.stringify(notifications, null, 2), 'utf8');
    } catch (error) {
        console.error("[NotificationService/JSON] Error writing notification database:", error);
        throw new Error('Failed to save notification data.');
    }
}


// Updated findUsersByRole to fetch all users from the primary source in user-service
// This ensures Admin Developer can be targeted if specified.
async function findUsersByRole(role: string): Promise<User[]> {
    // Temporarily read users.json directly for this function if a more direct "getAllUsersIncludingDev" isn't available.
    // This is a simplified approach for now. Ideally, user-service would provide this.
    let allUsers: User[] = [];
    const USERS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    try {
        const data = await fs.readFile(USERS_DB_PATH, 'utf8');
        if (data.trim() !== "") {
            allUsers = JSON.parse(data) as User[];
        }
    } catch (e) {
        console.error("[NotificationService/findUsersByRole] Error reading users.json directly:", e);
        // Fallback to getAllUsersForDisplay if direct read fails, understanding its limitations
        allUsers = await getAllUsersForDisplay();
    }
    
    const usersInRole = allUsers.filter(user => user.role === role);
    console.log(`[NotificationService/findUsersByRole] Found ${usersInRole.length} user(s) with role "${role}" for notification.`);
    return usersInRole;
}

// --- Notification Service Functions ---

export async function notifyUsersByRole(roleOrRoles: string | string[], message: string, projectId?: string): Promise<void> {
    const rolesToNotify = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    console.log(`[NotificationService/JSON] Attempting to send notification to role(s) "${rolesToNotify.join(', ')}": ${message}${projectId ? ` (Project: ${projectId})` : ''}`);
    
    try {
        if (rolesToNotify.length === 0 || rolesToNotify.every(r => !r)) {
            console.warn(`[NotificationService/JSON] No target role(s) specified for notification: "${message}". Skipping.`);
            return;
        }

        const notifications = await readNotifications();
        const now = new Date().toISOString();
        let notificationsAdded = 0;

        for (const role of rolesToNotify) {
            if (!role) continue; // Skip if a role in the array is empty or null

            const targetUsers = await findUsersByRole(role);
            if (targetUsers.length === 0) {
                console.warn(`[NotificationService/JSON] No users found with role "${role}" to notify for message: "${message}".`);
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
            await writeNotifications(notifications);
            console.log(`[NotificationService/JSON] ${notificationsAdded} notification(s) successfully written.`);
        } else {
            console.log(`[NotificationService/JSON] No notifications were added to be written.`);
        }

    } catch (error) {
        console.error(`[NotificationService/JSON] Error notifying users by role(s) "${rolesToNotify.join(', ')}":`, error);
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
