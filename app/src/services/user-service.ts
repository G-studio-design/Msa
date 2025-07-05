
// src/services/user-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import type { User, AddUserData, UpdateProfileData, UpdatePasswordData, UpdateUserGoogleTokensData } from '@/types/user-types';
import { getAllUsers } from './data-access/user-data';

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');

async function writeAllUsers(data: User[]): Promise<void> {
    const dbDir = path.dirname(DB_PATH);
    await fs.mkdir(dbDir, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}


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

    if (!user || !user.password || passwordInput !== user.password) {
        return null;
    }

    const { password: _p, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

export async function addUser(userData: AddUserData): Promise<Omit<User, 'password'>> {
    const users = await getAllUsers();

    if (userData.role === 'Admin Developer') {
        throw new Error('INVALID_ROLE_CREATION_ATTEMPT');
    }

    if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
        throw new Error('USERNAME_EXISTS');
    }
    if (userData.email && users.some(u => u.email && u.email.toLowerCase() === userData.email!.toLowerCase())) {
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
    await writeAllUsers(users);
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

    const remainingUsers = users.filter(user => user.id !== userId);
    await writeAllUsers(remainingUsers);
}

export async function updateUserProfile(updateData: UpdateProfileData): Promise<Omit<User, 'password'>> {
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
        if (users.some(u => u.id !== updateData.userId && u.username.toLowerCase() === updateData.username!.toLowerCase())) {
            throw new Error('USERNAME_EXISTS');
        }
    }
    if (updateData.email && updateData.email.toLowerCase() !== (currentUserState.email || '').toLowerCase()) {
        if (users.some(u => u.id !== updateData.userId && u.email && u.email.toLowerCase() === updateData.email!.toLowerCase())) {
            throw new Error('EMAIL_EXISTS');
        }
    }
    
    const updatedUser = { ...currentUserState, ...updateData };
    users[userIndex] = updatedUser;
    await writeAllUsers(users);
    
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
    await writeAllUsers(users);
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
    
    await writeAllUsers(users);
}

export async function clearUserGoogleTokens(userId: string): Promise<Omit<User, 'password'>> {
    let users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('USER_NOT_FOUND');
    }

    const user = { ...users[userIndex] };
    
    delete user.googleRefreshToken;
    delete user.googleAccessToken;
    delete user.accessTokenExpiresAt;

    users[userIndex] = user;
    
    await writeAllUsers(users);
    const { password: _p, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
}
