// src/services/notification-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { getAllUsersForDisplay, type User } from './user-service'; // Changed getAllUsers to getAllUsersForDisplay
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

/**
 * Reads the notification data from the JSON file.
 * @returns A promise that resolves to an array of Notification objects.
 */
async function readNotifications(): Promise<Notification[]> {
    try {
        await fs.access(DB_PATH); // Check if file exists
    } catch (error) {
        // If the file doesn't exist, create it with an empty array
        console.log("Notification database file not found, creating a new one.");
        await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        if (data.trim() === "") {
            console.warn("Notification database file is empty. Initializing with an empty array.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("Notification database file does not contain a valid JSON array. Resetting.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        // Basic validation/migration could happen here if needed
        return parsedData as Notification[];
    } catch (error: any) {
        console.error("Error reading or parsing notification database:", error);
        if (error instanceof SyntaxError) {
            console.warn(`SyntaxError in notification database: ${error.message}. Attempting to reset.`);
        }
        try {
            console.log("Attempting to reset notification database due to read/parse error.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        } catch (writeError) {
            console.error("Failed to reset notification database:", writeError);
            throw new Error('Failed to read or reset notification data.');
        }
    }
}

/**
 * Writes the notification data to the JSON file.
 * @param notifications An array of Notification objects to write.
 * @returns A promise that resolves when the write operation is complete.
 */
async function writeNotifications(notifications: Notification[]): Promise<void> {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(notifications, null, 2), 'utf8');
        console.log("Notification data written to DB_PATH successfully.");
    } catch (error) {
        console.error("Error writing notification database:", error);
        throw new Error('Failed to save notification data.');
    }
}


/**
 * Finds users by their role.
 * @param role The role to filter by (e.g., 'Admin Proyek', 'Owner').
 * @returns A promise resolving to an array of User objects with the specified role.
 */
async function findUsersByRole(role: string): Promise<User[]> {
    const allUsersForDisplay = await getAllUsersForDisplay(); // Use getAllUsersForDisplay
    return allUsersForDisplay.filter(user => user.role === role);
}

// --- Notification Service Functions ---

/**
 * Sends a notification message to all users with a specific role for a given project.
 * Ensures the notification is persisted.
 * @param role The target role.
 * @param message The notification message content.
 * @param projectId Optional ID of the project related to the notification.
 */
export async function notifyUsersByRole(role: string, message: string, projectId?: string): Promise<void> {
    console.log(`Sending notification to role "${role}": ${message}${projectId ? ` (Project: ${projectId})` : ''}`);
    try {
        if (!role) {
            console.warn(`No target role specified for notification: "${message}". Skipping.`);
            return;
        }
        const targetUsers = await findUsersByRole(role);
        if (targetUsers.length === 0) {
            console.warn(`No users found with role "${role}" to notify for message: "${message}".`);
            return;
        }

        const notifications = await readNotifications(); // Read current notifications
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
            // TODO: Implement actual real-time delivery mechanism (e.g., WebSockets, Push API) if needed
            console.log(` -> Notification queued for user ${user.username} (${user.id})`);
        });

        await writeNotifications(notifications); // Write updated notifications back to storage
        console.log(`Notifications persisted. Total notifications: ${notifications.length}`);

    } catch (error) {
        console.error(`Error notifying users by role "${role}":`, error);
    }
}

/**
 * Retrieves notifications for a specific user.
 * Fetches from the persisted storage.
 * @param userId The ID of the user whose notifications are to be retrieved.
 * @returns A promise resolving to an array of Notification objects for the user.
 */
export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
    const allNotifications = await readNotifications();
    const userNotifications = allNotifications.filter(n => n.userId === userId);
    // Sort by timestamp, newest first
    userNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return userNotifications;
}

/**
 * Marks a specific notification as read.
 * Updates the persisted storage.
 * @param notificationId The ID of the notification to mark as read.
 * @returns A promise resolving when the update is complete.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const notifications = await readNotifications();
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);

    if (notificationIndex !== -1) {
        if (!notifications[notificationIndex].isRead) {
            notifications[notificationIndex].isRead = true;
            await writeNotifications(notifications); // Persist change
            console.log(`Notification ${notificationId} marked as read.`);
        } else {
             console.log(`Notification ${notificationId} was already marked as read.`);
        }
    } else {
        console.warn(`Notification ${notificationId} not found to mark as read.`);
    }
}

/**
 * Marks all notifications for a specific user as read.
 * Updates the persisted storage.
 * @param userId The ID of the user.
 * @returns A promise resolving when the update is complete.
 */
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
         await writeNotifications(updatedNotifications); // Persist changes
         console.log(`All unread notifications marked as read for user ${userId}.`);
     } else {
         console.log(`No unread notifications found for user ${userId} to mark as read.`);
     }
}

/**
 * Clears all notifications from the storage. Use with caution!
 * @returns A promise resolving when the operation is complete.
 */
export async function clearAllNotifications(): Promise<void> {
    try {
        await writeNotifications([]); // Write an empty array to the file
        console.log("All notifications have been cleared.");
    } catch (error) {
        console.error("Failed to clear notifications:", error);
        throw new Error("Could not clear notification data.");
    }
}
