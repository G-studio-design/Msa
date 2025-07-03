
// src/services/user-service.ts
'use server';

import * as path from 'path';
import { writeDb } from '@/lib/json-db-utils';
import { notifyUsersByRole } from './notification-service';
import { getAllUsers } from './data-access/user-data';
import type { User, AddUserData, UpdateProfileData, UpdatePasswordData, UpdateUserGoogleTokensData } from '@/types/user-types';

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');

export async function findUserByUsername(username: string): Promise<User | null> {
    if (!username) return null;
    const users = await getAllUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const users = await getAllUsers();
    return users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
}

export async function findUserById(userId: string): Promise<User | null> {
    if(!userId) return null;
    const users = await getAllUsers();
    return users.find(u => u.id === userId) || null;
}

export async function verifyUserCredentials(usernameInput: string, passwordInput: string): Promise<Omit<User, 'password'> | null> {
    const user = await findUserByUsername(usernameInput);
    if (!user || !user.password || passwordInput !== user.password) {
        return null;
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

export async function addUser(userData: AddUserData): Promise<Omit<User, 'password'>> {
    const users = await getAllUsers();
    if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
        throw new Error('USERNAME_EXISTS');
    }
    if (userData.email && users.some(u => u.email?.toLowerCase() === userData.email!.toLowerCase())) {
        throw new Error('EMAIL_EXISTS');
    }

    const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: userData.username,
        password: userData.password,
        role: userData.role,
        email: userData.email || `${userData.username.toLowerCase().replace(/\s+/g, '_')}@example.com`,
        displayName: userData.displayName || userData.username,
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await writeDb(DB_PATH, users);
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
}

export async function deleteUser(userId: string): Promise<void> {
    let users = await getAllUsers();
    const userToDelete = users.find(user => user.id === userId);
    if (!userToDelete) throw new Error('USER_NOT_FOUND');
    if (userToDelete.role === 'Admin Developer') throw new Error('CANNOT_DELETE_ADMIN_DEVELOPER');

    users = users.filter(user => user.id !== userId);
    await writeDb(DB_PATH, users);
}

export async function updateUserProfile(updateData: UpdateProfileData): Promise<Omit<User, 'password'>> {
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);
    if (userIndex === -1) throw new Error('USER_NOT_FOUND');
    
    const updatedUser = { ...users[userIndex], ...updateData };
    users[userIndex] = updatedUser;
    await writeDb(DB_PATH, users);
    
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
}

export async function updatePassword(updateData: UpdatePasswordData): Promise<void> {
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);
    if (userIndex === -1) throw new Error('USER_NOT_FOUND');

    const user = users[userIndex];
    if (updateData.currentPassword && (!user.password || updateData.currentPassword !== user.password)) {
        throw new Error('PASSWORD_MISMATCH');
    }

    users[userIndex].password = updateData.newPassword;
    await writeDb(DB_PATH, users);
}

export async function getAllUsersForDisplay(): Promise<Omit<User, 'password'>[]> {
    const users = await getAllUsers();
    return users
        .filter(user => user.role !== 'Admin Developer')
        .map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
}

export async function updateUserGoogleTokens(userId: string, tokens: UpdateUserGoogleTokensData): Promise<void> {
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('USER_NOT_FOUND');

    users[userIndex] = {
        ...users[userIndex],
        googleRefreshToken: tokens.refreshToken,
        googleAccessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    };
    await writeDb(DB_PATH, users);
}

export async function clearUserGoogleTokens(userId: string): Promise<Omit<User, 'password'>> {
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('USER_NOT_FOUND');

    delete users[userIndex].googleRefreshToken;
    delete users[userIndex].googleAccessToken;
    delete users[userIndex].accessTokenExpiresAt;
    
    await writeDb(DB_PATH, users);
    const { password, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
}
