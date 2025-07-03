// src/services/user-service.ts
'use server';

import * as path from 'path';
import { writeDb } from '@/lib/json-db-utils';
// REMOVED: import { notifyUsersByRole } from './notification-service';
import type { User, AddUserData, UpdateProfileData, UpdatePasswordData, UpdateUserGoogleTokensData } from '@/types/user-types';
import { getAllUsers } from './data-access/user-data'; // IMPORT FROM NEW DATA ACCESS LAYER

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');

// --- Main Service Functions ---

export async function findUserByUsername(username: string): Promise<User | null> {
    console.log(`[UserService] Finding user by username: ${username}`);
    if (!username) return null;
    const users = await getAllUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user || null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    console.log(`[UserService] Finding user by email: ${email}`);
    const users = await getAllUsers();
    const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    return user || null;
}

export async function findUserById(userId: string): Promise<User | null> {
    console.log(`[UserService] Finding user by ID: ${userId}`);
    if(!userId) return null;
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    return user || null;
}

export async function verifyUserCredentials(usernameInput: string, passwordInput: string): Promise<Omit<User, 'password'> | null> {
    console.log(`[UserService] Verifying credentials for username: "${usernameInput}"`);
    const user = await findUserByUsername(usernameInput);

    if (!user) {
        console.log(`[UserService] User "${usernameInput}" not found.`);
        return null;
    }
    console.log(`[UserService] User "${usernameInput}" found. ID: ${user.id}, Role: ${user.role}`);

    if (!user.password) {
        console.error(`[UserService] Login failed for ${usernameInput}: User has no password stored.`);
        return null;
    }

    const isPasswordCorrect = passwordInput === user.password;

    if (isPasswordCorrect) {
        console.log(`[UserService] Password match successful for user "${usernameInput}".`);
        const { password: _p, ...userWithoutPassword } = user;
        return userWithoutPassword;
    } else {
        console.log(`[UserService] Password mismatch for user "${usernameInput}".`);
        return null;
    }
}

export async function addUser(userData: AddUserData): Promise<Omit<User, 'password'>> {
    console.log('[UserService] Attempting to add user:', userData.username, userData.role);
    const users = await getAllUsers();

    if (userData.role === 'Admin Developer') {
        console.error('[UserService] Cannot add user with role "Admin Developer" through this function.');
        throw new Error('INVALID_ROLE_CREATION_ATTEMPT');
    }

    const existingUser = users.find(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (existingUser) {
        console.error(`[UserService] Username "${userData.username}" already exists.`);
        throw new Error('USERNAME_EXISTS');
    }
    if (userData.email) {
        const existingEmail = users.find(u => u.email && u.email.toLowerCase() === userData.email!.toLowerCase());
        if (existingEmail) {
            console.error(`[UserService] Email "${userData.email}" already exists.`);
            throw new Error('EMAIL_EXISTS');
        }
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const newUser: User = {
        id: userId,
        username: userData.username,
        password: userData.password,
        role: userData.role,
        email: userData.email || `${userData.username.toLowerCase().replace(/\s+/g, '_')}@example.com`,
        displayName: userData.displayName || userData.username,
        createdAt: now.toISOString(),
    };

    users.push(newUser);
    await writeDb(DB_PATH, users);
    console.log(`[UserService] User "${newUser.username}" added successfully with role "${newUser.role}".`);
    const { password: _p, ...newUserWithoutPassword } = newUser;
    return newUserWithoutPassword;
}

export async function deleteUser(userId: string): Promise<void> {
    console.log(`[UserService] Attempting to delete user with ID: ${userId}`);
    let users = await getAllUsers();
    const userToDelete = users.find(user => user.id === userId);

    if (!userToDelete) {
        console.error(`[UserService] User with ID "${userId}" not found for deletion.`);
        throw new Error('USER_NOT_FOUND');
    }

    if (userToDelete.role === 'Admin Developer') {
        console.error(`[UserService] Cannot delete user with role "Admin Developer". ID: ${userId}`);
        throw new Error('CANNOT_DELETE_ADMIN_DEVELOPER');
    }

    users = users.filter(user => user.id !== userId);
    await writeDb(DB_PATH, users);
    console.log(`[UserService] User ${userId} deleted successfully.`);
}

export async function updateUserProfile(updateData: UpdateProfileData): Promise<Omit<User, 'password'> | null> {
    console.log(`[UserService] Attempting to update profile for user ID: ${updateData.userId}`);
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`[UserService] User with ID "${updateData.userId}" not found for profile update.`);
        throw new Error('USER_NOT_FOUND');
    }

    const currentUserState = users[userIndex];

    if (updateData.role && updateData.role === 'Admin Developer' && currentUserState.role !== 'Admin Developer') {
        console.error('[UserService] Cannot update user role to "Admin Developer" via this function.');
        throw new Error('INVALID_ROLE_UPDATE_ATTEMPT');
    }
    if (currentUserState.role === 'Admin Developer' && updateData.role && updateData.role !== 'Admin Developer') {
        console.error('[UserService] Role of "Admin Developer" cannot be changed via this function.');
        throw new Error('CANNOT_CHANGE_ADMIN_DEVELOPER_ROLE');
    }

    if (updateData.username && updateData.username.toLowerCase() !== currentUserState.username.toLowerCase()) {
        const existingUser = users.find(u => u.id !== updateData.userId && u.username.toLowerCase() === updateData.username!.toLowerCase());
        if (existingUser) {
            console.error(`[UserService] New username "${updateData.username}" is already taken.`);
            throw new Error('USERNAME_EXISTS');
        }
    }
    if (updateData.email && updateData.email.toLowerCase() !== (currentUserState.email || '').toLowerCase()) {
        const existingEmailUser = users.find(u => u.id !== updateData.userId && u.email && u.email.toLowerCase() === updateData.email!.toLowerCase());
        if (existingEmailUser) {
            console.error(`[UserService] New email "${updateData.email}" is already taken.`);
            throw new Error('EMAIL_EXISTS');
        }
    }
    
    const updatedUser = { ...currentUserState, ...updateData };
    users[userIndex] = updatedUser;
    await writeDb(DB_PATH, users);
    console.log(`[UserService] User profile for ${updateData.userId} updated successfully.`);
    
    // REMOVED: Notification logic has been decoupled from this service.
    // The calling component or action is now responsible for sending notifications if needed.

    const { password: _p, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
}

export async function updatePassword(updateData: UpdatePasswordData): Promise<void> {
    console.log(`[UserService] Attempting to update password for user ID: ${updateData.userId}`);
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`[UserService] User with ID "${updateData.userId}" not found for password update.`);
        throw new Error('USER_NOT_FOUND');
    }

    const user = users[userIndex];

    if (updateData.currentPassword) {
        if (!user.password || updateData.currentPassword !== user.password) {
            console.error(`[UserService] Current password mismatch for user ID: ${updateData.userId}`);
            throw new Error('PASSWORD_MISMATCH');
        }
        console.log(`[UserService] Current password verified for user ${updateData.userId}.`);
    }

    users[userIndex].password = updateData.newPassword;
    await writeDb(DB_PATH, users);
    console.log(`[UserService] Password for user ${updateData.userId} updated successfully.`);
        
    // REMOVED: Notification logic has been decoupled from this service.
}

export async function getAllUsersForDisplay(): Promise<Omit<User, 'password'>[]> {
    console.log("[UserService] Fetching all users for display (excluding Admin Developer).");
    const users = await getAllUsers();
    return users
        .filter(user => user.role !== 'Admin Developer')
        .map(user => {
            const { password: _p, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
}

export async function updateUserGoogleTokens(
    userId: string,
    tokens: UpdateUserGoogleTokensData
): Promise<void> {
    console.log(`[UserService] Updating Google tokens for user ID: ${userId}`);
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        console.error(`[UserService] User with ID "${userId}" not found for Google token update.`);
        throw new Error('USER_NOT_FOUND');
    }

    users[userIndex] = {
        ...users[userIndex],
        googleRefreshToken: tokens.refreshToken !== undefined ? tokens.refreshToken : users[userIndex].googleRefreshToken,
        googleAccessToken: tokens.accessToken !== undefined ? tokens.accessToken : users[userIndex].googleAccessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt !== undefined ? tokens.accessTokenExpiresAt : users[userIndex].accessTokenExpiresAt,
    };
    
    await writeDb(DB_PATH, users);
    console.log(`[UserService] Google tokens for user ${userId} updated successfully.`);
}

export async function clearUserGoogleTokens(userId: string): Promise<Omit<User, 'password'> | null> {
    console.log(`[UserService] Clearing Google tokens for user ID: ${userId}`);
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        console.error(`[UserService] User with ID "${userId}" not found for clearing Google tokens.`);
        throw new Error('USER_NOT_FOUND');
    }

    const user = { ...users[userIndex] };
    
    // Set fields to null/undefined
    user.googleRefreshToken = null;
    user.googleAccessToken = null;
    user.accessTokenExpiresAt = null;

    users[userIndex] = user;

    // We can also delete the keys if we want to be cleaner
    delete users[userIndex].googleRefreshToken;
    delete users[userIndex].googleAccessToken;
    delete users[userIndex].accessTokenExpiresAt;
    
    await writeDb(DB_PATH, users);
    console.log(`[UserService] Google tokens for user ${userId} cleared successfully.`);
    const { password: _p, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
}
