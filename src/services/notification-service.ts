// src/services/notification-service.ts
'use server';

import { getAllUsers, type User } from './user-service';

// Define the structure of a Notification
export interface Notification {
    id: string;
    userId: string; // ID of the user to receive the notification
    projectId?: string; // Optional project ID related to the notification // Renamed property
    message: string;
    timestamp: string; // ISO string
    isRead: boolean;
}

// --- Placeholder Notification Storage ---
// In a real application, this would be a database table or collection.
let notifications: Notification[] = [];

// --- Helper Function ---

/**
 * Finds users by their role.
 * @param role The role to filter by (e.g., 'Admin Proyek', 'Owner').
 * @returns A promise resolving to an array of User objects with the specified role.
 */
async function findUsersByRole(role: string): Promise<User[]> {
    const allUsers = await getAllUsers(); // Assuming getAllUsers doesn't include passwords by default
    return allUsers.filter(user => user.role === role);
}

// --- Notification Service Functions ---

/**
 * Sends a notification message to all users with a specific role.
 * @param role The target role.
 * @param message The notification message content.
 * @param projectId Optional ID of the project related to the notification. // Renamed parameter
 */
export async function notifyUsersByRole(role: string, message: string, projectId?: string): Promise<void> { // Renamed parameter
    console.log(`Sending notification to role "${role}": ${message}${projectId ? ` (Project: ${projectId})` : ''}`); // Updated log message
    try {
        const targetUsers = await findUsersByRole(role);
        const now = new Date().toISOString();

        targetUsers.forEach(user => {
            const newNotification: Notification = {
                id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                userId: user.id,
                projectId: projectId, // Renamed property
                message: message,
                timestamp: now,
                isRead: false,
            };
            notifications.push(newNotification);
            // TODO: Implement actual delivery mechanism (e.g., WebSockets, Push API, Email)
            console.log(` -> Notification queued for user ${user.username} (${user.id})`);
        });

        // TODO: Persist notifications array to a database or file if needed
        console.log(`Notifications array length: ${notifications.length}`);

    } catch (error) {
        console.error(`Error notifying users by role "${role}":`, error);
    }
}

/**
 * Retrieves notifications for a specific user.
 * In a real app, this would fetch from the database.
 * @param userId The ID of the user whose notifications are to be retrieved.
 * @returns A promise resolving to an array of Notification objects for the user.
 */
export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
    // Filter the placeholder array
    const userNotifications = notifications.filter(n => n.userId === userId);
    // Sort by timestamp, newest first
    userNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return userNotifications;
}

/**
 * Marks a specific notification as read.
 * In a real app, this would update the database.
 * @param notificationId The ID of the notification to mark as read.
 * @returns A promise resolving when the update is complete.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);
    if (notificationIndex !== -1) {
        notifications[notificationIndex].isRead = true;
        // TODO: Persist change to database/file
        console.log(`Notification ${notificationId} marked as read.`);
    } else {
        console.warn(`Notification ${notificationId} not found to mark as read.`);
    }
}

/**
 * Marks all notifications for a specific user as read.
 * @param userId The ID of the user.
 * @returns A promise resolving when the update is complete.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
     let changed = false;
     notifications = notifications.map(n => {
         if (n.userId === userId && !n.isRead) {
             changed = true;
             return { ...n, isRead: true };
         }
         return n;
     });
     if (changed) {
         // TODO: Persist changes to database/file
         console.log(`All unread notifications marked as read for user ${userId}.`);
     }
}
