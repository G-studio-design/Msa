// src/services/user-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { notifyUsersByRole } from './notification-service'; // Import notification service

// Define the structure of a user in the database
export interface User {
    id: string;
    username: string;
    role: string;
    password?: string;
    email?: string;
    whatsappNumber?: string;
    profilePictureUrl?: string;
    displayName?: string;
    createdAt?: string;
    googleRefreshToken?: string; // Added for Google Calendar
    googleAccessToken?: string; // Added for Google Calendar
    googleAccessTokenExpiresAt?: number; // Timestamp (ms) when access token expires
}

// Define the structure for updating a user's password
export interface UpdatePasswordData {
    userId: string;
    currentPassword?: string;
    newPassword: string;
}

// Define the structure for updating a user's profile (excluding password)
export interface UpdateProfileData {
    userId: string;
    username: string;
    role: string;
    email?: string;
    whatsappNumber?: string;
    profilePictureUrl?: string | null;
    displayName?: string;
}

// Define the structure for adding a user directly (by admin)
export interface AddUserData {
    username: string;
    password: string;
    role: string;
}


const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');

// --- Helper Functions ---

async function readUsers(): Promise<User[]> {
    try {
        await fs.access(DB_PATH);
    } catch (error) {
        console.log("User database file not found, creating a new one.");
        await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        if (data.trim() === "") {
            console.warn("User database file is empty. Initializing with an empty array.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("User database file does not contain a valid JSON array. Resetting.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        return (parsedData as any[])
            .filter(user => user.role !== 'Admin Developer')
            .map(user => ({
                ...user,
                email: user.email || '',
                whatsappNumber: user.whatsappNumber || '',
                profilePictureUrl: user.profilePictureUrl || undefined,
                displayName: user.displayName || user.username,
                googleRefreshToken: user.googleRefreshToken || undefined,
                googleAccessToken: user.googleAccessToken || undefined,
                googleAccessTokenExpiresAt: user.googleAccessTokenExpiresAt || undefined,
            })) as User[];
    } catch (error: any) {
        console.error("Error reading or parsing user database:", error);
         if (error instanceof SyntaxError) {
            console.warn(`SyntaxError in user database: ${error.message}. Attempting to reset.`);
        }
         try {
             console.log("Attempting to reset user database due to read/parse error.");
             await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
             return [];
         } catch (writeError) {
             console.error("Failed to reset user database:", writeError);
             throw new Error('Failed to read or reset user data.');
         }
    }
}

async function writeUsers(users: User[]): Promise<void> {
    try {
        const usersToWrite = users
            .filter(u => u.role !== 'Admin Developer')
            .map(u => {
                const { passwordHash, googleUid, ...userWithoutSensitive } = u as any; // Ensure googleUid is removed if it was ever there
                return userWithoutSensitive;
            });
        await fs.writeFile(DB_PATH, JSON.stringify(usersToWrite, null, 2), 'utf8');
        console.log("User data written to DB_PATH successfully.");
    } catch (error) {
        console.error("Error writing user database:", error);
        throw new Error('Failed to save user data.');
    }
}

// --- Main Service Functions ---

export async function findUserByUsername(username: string): Promise<User | null> {
    const users = await readUsers();
    const lowerCaseUsername = username.toLowerCase();
    return users.find(u => u.username.toLowerCase() === lowerCaseUsername && u.role !== 'Admin Developer') || null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const users = await readUsers();
    const lowerCaseEmail = email.toLowerCase();
    return users.find(u => u.email?.toLowerCase() === lowerCaseEmail && u.role !== 'Admin Developer') || null;
}


export async function findUserById(userId: string): Promise<User | null> {
    const users = await readUsers();
    return users.find(u => u.id === userId && u.role !== 'Admin Developer') || null;
}

export async function verifyUserCredentials(username: string, passwordInput: string): Promise<Omit<User, 'password'> | null> {
    console.log(`Verifying credentials for username: "${username}"`);
    const user = await findUserByUsername(username);

    if (!user) {
        console.log(`User "${username}" not found or is Admin Developer.`);
        return null;
    }
    console.log(`User "${username}" found. ID: ${user.id}, Role: ${user.role}`);

    if (!user.password) {
         console.error(`Login failed for ${username}: User has no password stored.`);
         return null;
    }

    if (passwordInput === user.password) {
        console.log(`Password match successful for user "${username}".`);
        const { password: _p, ...userWithoutPassword } = user;
        return userWithoutPassword;
    } else {
        console.log(`Password mismatch for user "${username}".`);
        return null;
    }
}

export async function addUser(userData: AddUserData): Promise<Omit<User, 'password'>> {
    console.log('Attempting to add user:', userData.username, userData.role);
    const users = await readUsers();

    if (userData.role === 'Admin Developer') {
        console.error('Cannot add user with role "Admin Developer".');
        throw new Error('INVALID_ROLE');
    }

    const usernameExists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (usernameExists) {
        console.error(`Username "${userData.username}" already exists.`);
        throw new Error('USERNAME_EXISTS');
    }

    const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: userData.username,
        password: userData.password,
        role: userData.role,
        email: `${userData.username.toLowerCase()}@example.com`, // Default email
        whatsappNumber: '',
        profilePictureUrl: undefined,
        displayName: userData.username,
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await writeUsers(users);

    console.log(`User "${newUser.username}" added successfully with role "${newUser.role}".`);
    const { password: _p, ...newUserWithoutPassword } = newUser;
    return newUserWithoutPassword;
}

export async function deleteUser(userId: string): Promise<void> {
    console.log(`Attempting to delete user with ID: ${userId}`);
    let users = await readUsers();
    const userToDelete = users.find(u => u.id === userId);

    if (!userToDelete) {
        console.error(`User with ID "${userId}" not found for deletion.`);
        throw new Error('USER_NOT_FOUND');
    }

    if (userToDelete.role === 'Admin Developer') {
        console.error(`Cannot delete user with role "Admin Developer". ID: ${userId}`);
        throw new Error('CANNOT_DELETE_ADMIN_DEVELOPER');
    }

    users = users.filter(u => u.id !== userId);
    await writeUsers(users);
    console.log(`User ${userId} deleted successfully.`);
}

export async function updateUserProfile(updateData: UpdateProfileData): Promise<void> {
    console.log(`Attempting to update profile for user ID: ${updateData.userId}`);
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`User with ID "${updateData.userId}" not found for profile update.`);
        throw new Error('USER_NOT_FOUND');
    }

    if (updateData.role === 'Admin Developer') {
         console.error('Cannot update user role to "Admin Developer".');
         throw new Error('INVALID_ROLE');
     }

    if (updateData.username && updateData.username.toLowerCase() !== users[userIndex].username.toLowerCase()) {
        const newUsernameLower = updateData.username.toLowerCase();
        const usernameConflict = users.some(u => u.id !== updateData.userId && u.username.toLowerCase() === newUsernameLower);
        if (usernameConflict) {
            console.error(`New username "${updateData.username}" is already taken.`);
            throw new Error('USERNAME_EXISTS');
        }
    }

    const updatedUser = { ...users[userIndex] };
    if (updateData.username) updatedUser.username = updateData.username;
    if (updateData.role) updatedUser.role = updateData.role;
    if (updateData.email !== undefined) updatedUser.email = updateData.email;
    if (updateData.whatsappNumber !== undefined) updatedUser.whatsappNumber = updateData.whatsappNumber;
    if (updateData.profilePictureUrl !== undefined) {
        updatedUser.profilePictureUrl = updateData.profilePictureUrl || undefined;
    }

    if (updateData.username && updateData.username !== users[userIndex].username && !updateData.displayName) {
        updatedUser.displayName = updateData.username;
    } else if (updateData.displayName) {
        updatedUser.displayName = updateData.displayName;
    }

    users[userIndex] = updatedUser;
    await writeUsers(users);
    console.log(`User profile for ${updateData.userId} updated successfully in database file.`);

    const adminRolesToNotify = ['Owner', 'General Admin'];
    const currentUser = users[userIndex];
    adminRolesToNotify.forEach(async (role) => {
        await notifyUsersByRole(role, `User profile for "${currentUser.username}" (Role: ${currentUser.role}) has been updated.`);
    });
}

export async function updatePassword(updateData: UpdatePasswordData): Promise<void> {
    console.log(`Attempting to update password for user ID: ${updateData.userId}`);
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`User with ID "${updateData.userId}" not found for password update.`);
        throw new Error('USER_NOT_FOUND');
    }

    const user = users[userIndex];
    if (updateData.currentPassword) {
         if (!user.password) {
             console.error(`Password update failed for ${updateData.userId}: User has no password set.`);
             throw new Error('PASSWORD_MISMATCH');
         }
        if (updateData.currentPassword !== user.password) {
            console.error(`Current password mismatch for user ID: ${updateData.userId}`);
            throw new Error('PASSWORD_MISMATCH');
        }
         console.log(`Current password verified for user ${updateData.userId}.`);
    } else {
        console.log(`Password reset/update initiated for user ID: ${updateData.userId} (current password check skipped).`);
    }

    users[userIndex] = { ...user, password: updateData.newPassword };
    await writeUsers(users);
    console.log(`Password for user ${updateData.userId} updated successfully.`);

     const adminRolesToNotify = ['Owner', 'General Admin'];
     const currentUser = users[userIndex];
     adminRolesToNotify.forEach(async (role) => {
         await notifyUsersByRole(role, `Password for user "${currentUser.username}" (Role: ${currentUser.role}) has been changed.`);
     });
}

export async function getAllUsers(): Promise<User[]> {
    const users = await readUsers();
    return users;
}

export async function updateUserGoogleTokens(
    userId: string,
    tokens: { refreshToken?: string; accessToken: string; accessTokenExpiresAt: number }
): Promise<void> {
    console.log(`Updating Google tokens for user ID: ${userId}`);
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        console.error(`User with ID "${userId}" not found for Google token update.`);
        throw new Error('USER_NOT_FOUND');
    }

    users[userIndex] = {
        ...users[userIndex],
        googleAccessToken: tokens.accessToken,
        googleAccessTokenExpiresAt: tokens.accessTokenExpiresAt,
        // Only update refresh token if it's provided (it's often only sent once)
        ...(tokens.refreshToken && { googleRefreshToken: tokens.refreshToken }),
    };

    await writeUsers(users);
    console.log(`Google tokens for user ${userId} updated successfully.`);
}
