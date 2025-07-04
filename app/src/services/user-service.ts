// src/services/user-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import type { User, AddUserData, UpdateProfileData, UpdatePasswordData, UpdateUserGoogleTokensData } from '@/types/user-types';
import { getAllUsers } from './data-access/user-data';

async function writeDb(data: User[]): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing to database at ${path.basename(DB_PATH)}:`, error);
        throw new Error(`Failed to save data to ${path.basename(DB_PATH)}.`);
    }
}


// --- Main Service Functions ---

export async function findUserByUsername(username: string): Promise<User | null> {
    if (!username) return null;
    const users = await getAllUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user || null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const users = await getAllUsers();
    const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    return user || null;
}

export async function findUserById(userId: string): Promise<User | null> {
    if(!userId) return null;
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    return user || null;
}

export async function verifyUserCredentials(usernameInput: string, passwordInput: string): Promise<Omit<User, 'password'> | null> {
    const user = await findUserByUsername(usernameInput);

    if (!user) {
        return null;
    }

    if (!user.password) {
        return null;
    }

    const isPasswordCorrect = passwordInput === user.password;

    if (isPasswordCorrect) {
        const { password: _p, ...userWithoutPassword } = user;
        return userWithoutPassword;
    } else {
        return null;
    }
}

export async function addUser(userData: AddUserData): Promise<Omit<User, 'password'>> {
    const users = await getAllUsers();

    if (userData.role === 'Admin Developer') {
        throw new Error('INVALID_ROLE_CREATION_ATTEMPT');
    }

    const existingUser = users.find(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (existingUser) {
        throw new Error('USERNAME_EXISTS');
    }
    if (userData.email) {
        const existingEmail = users.find(u => u.email && u.email.toLowerCase() === userData.email!.toLowerCase());
        if (existingEmail) {
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
    await writeDb(users);
    const { password: _p, ...newUserWithoutPassword } = newUser;
    return newUserWithoutPassword;
}

export async function deleteUser(userId: string): Promise<void> {
    let users = await getAllUsers();
    const userToDelete = users.find(user => user.id === userId);

    if (!userToDelete) {
        throw new Error('USER_NOT_FOUND');
    }

    if (userToDelete.role === 'Admin Developer') {
        throw new Error('CANNOT_DELETE_ADMIN_DEVELOPER');
    }

    users = users.filter(user => user.id !== userId);
    await writeDb(users);
}

export async function updateUserProfile(updateData: UpdateProfileData): Promise<Omit<User, 'password'> | null> {
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        throw new Error('USER_NOT_FOUND');
    }

    const currentUserState = users[userIndex];

    if (updateData.role && updateData.role === 'Admin Developer' && currentUserState.role !== 'Admin Developer') {
        throw new Error('INVALID_ROLE_UPDATE_ATTEMPT');
    }
    if (currentUserState.role === 'Admin Developer' && updateData.role && updateData.role !== 'Admin Developer') {
        throw new Error('CANNOT_CHANGE_ADMIN_DEVELOPER_ROLE');
    }

    if (updateData.username && updateData.username.toLowerCase() !== currentUserState.username.toLowerCase()) {
        const existingUser = users.find(u => u.id !== updateData.userId && u.username.toLowerCase() === updateData.username!.toLowerCase());
        if (existingUser) {
            throw new Error('USERNAME_EXISTS');
        }
    }
    if (updateData.email && updateData.email.toLowerCase() !== (currentUserState.email || '').toLowerCase()) {
        const existingEmailUser = users.find(u => u.id !== updateData.userId && u.email && u.email.toLowerCase() === updateData.email!.toLowerCase());
        if (existingEmailUser) {
            throw new Error('EMAIL_EXISTS');
        }
    }
    
    const updatedUser = { ...currentUserState, ...updateData };
    users[userIndex] = updatedUser;
    await writeDb(users);
    
    const { password: _p, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
}

export async function updatePassword(updateData: UpdatePasswordData): Promise<void> {
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        throw new Error('USER_NOT_FOUND');
    }

    const user = users[userIndex];

    if (updateData.currentPassword) {
        if (!user.password || updateData.currentPassword !== user.password) {
            throw new Error('PASSWORD_MISMATCH');
        }
    }

    users[userIndex].password = updateData.newPassword;
    await writeDb(users);
}

export async function getAllUsersForDisplay(): Promise<Omit<User, 'password'>[]> {
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
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('USER_NOT_FOUND');
    }

    users[userIndex] = {
        ...users[userIndex],
        googleRefreshToken: tokens.refreshToken !== undefined ? tokens.refreshToken : users[userIndex].googleRefreshToken,
        googleAccessToken: tokens.accessToken !== undefined ? tokens.accessToken : users[userIndex].googleAccessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt !== undefined ? tokens.accessTokenExpiresAt : users[userIndex].accessTokenExpiresAt,
    };
    
    await writeDb(users);
}

export async function clearUserGoogleTokens(userId: string): Promise<Omit<User, 'password'> | null> {
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('USER_NOT_FOUND');
    }

    const user = { ...users[userIndex] };
    
    user.googleRefreshToken = null;
    user.googleAccessToken = null;
    user.accessTokenExpiresAt = null;

    users[userIndex] = user;

    delete users[userIndex].googleRefreshToken;
    delete users[userIndex].googleAccessToken;
    delete users[userIndex].accessTokenExpiresAt;
    
    await writeDb(users);
    const { password: _p, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
}
