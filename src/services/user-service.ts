// src/services/user-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { notifyUsersByRole } from './notification-service';

// Define the structure of a user
export interface User {
    id: string;
    username: string;
    role: string;
    password?: string; // Plain text password for JSON, should be hashed in real DB
    email?: string;
    whatsappNumber?: string;
    profilePictureUrl?: string;
    displayName?: string;
    createdAt?: string; // ISO date string
    googleRefreshToken?: string | null;
    googleAccessToken?: string | null;
    googleAccessTokenExpiresAt?: number | null; // Unix timestamp (milliseconds)
}

export interface AddUserData {
    username: string;
    password: string;
    role: string;
    email?: string;
    displayName?: string;
}

export interface UpdateProfileData {
    userId: string;
    username?: string;
    role?: string;
    email?: string;
    whatsappNumber?: string;
    profilePictureUrl?: string | null;
    displayName?: string;
}

export interface UpdatePasswordData {
    userId: string;
    currentPassword?: string; // For verifying against current password
    newPassword: string;
}

export interface UpdateUserGoogleTokensData {
    refreshToken?: string | null;
    accessToken: string | null;
    accessTokenExpiresAt: number | null;
}


const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');

// --- Helper Functions ---

async function readUsers(): Promise<User[]> {
    try {
        await fs.access(DB_PATH);
    } catch (error) {
        console.log("[UserService/JSON] User database file not found, creating a new one with default admin if missing.");
        // Create with a default Admin Developer and Owner if not present
        const defaultUsers: User[] = [
            {
              id: "usr_dev_iwg",
              username: "I.wayan_govina",
              password: "Govina110900",
              role: "Admin Developer",
              email: "i.wayan_govina@example.dev",
              displayName: "I Wayan Govina (Dev)",
              createdAt: new Date().toISOString(),
              whatsappNumber: ""
            },
            {
              id: "usr_owner_default",
              username: "owner_default",
              password: "owner123",
              role: "Owner",
              email: "owner@example.com",
              displayName: "Default Owner",
              createdAt: new Date().toISOString()
            }
        ];
        await fs.writeFile(DB_PATH, JSON.stringify(defaultUsers, null, 2), 'utf8');
        return defaultUsers;
    }
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        if (data.trim() === "") {
             console.warn("[UserService/JSON] User database file is empty. Initializing with default users.");
             const defaultUsers: User[] = [
                {
                  id: "usr_dev_iwg",
                  username: "I.wayan_govina",
                  password: "Govina110900",
                  role: "Admin Developer",
                  email: "i.wayan_govina@example.dev",
                  displayName: "I Wayan Govina (Dev)",
                  createdAt: new Date().toISOString(),
                  whatsappNumber: ""
                },
                {
                  id: "usr_owner_default",
                  username: "owner_default",
                  password: "owner123",
                  role: "Owner",
                  email: "owner@example.com",
                  displayName: "Default Owner",
                  createdAt: new Date().toISOString()
                }
            ];
            await fs.writeFile(DB_PATH, JSON.stringify(defaultUsers, null, 2), 'utf8');
            return defaultUsers;
        }
        return JSON.parse(data) as User[];
    } catch (error) {
        console.error("[UserService/JSON] Error reading or parsing user database:", error);
        throw new Error('Failed to read user data.');
    }
}

async function writeUsers(users: User[]): Promise<void> {
    try {
        // When writing back, we keep the password as is (plain text for JSON version)
        await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error("[UserService/JSON] Error writing user database:", error);
        throw new Error('Failed to save user data.');
    }
}

// --- Main Service Functions ---

export async function findUserByUsername(username: string): Promise<User | null> {
    console.log(`[UserService/JSON] Finding user by username: ${username}`);
    if (!username) return null;
    const users = await readUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user || null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    console.log(`[UserService/JSON] Finding user by email: ${email}`);
    const users = await readUsers();
    const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    return user || null;
}

export async function findUserById(userId: string): Promise<User | null> {
    console.log(`[UserService/JSON] Finding user by ID: ${userId}`);
    if(!userId) return null;
    const users = await readUsers();
    const user = users.find(u => u.id === userId);
    return user || null;
}

export async function verifyUserCredentials(usernameInput: string, passwordInput: string): Promise<Omit<User, 'password'> | null> {
    console.log(`[UserService/JSON] Verifying credentials for username: "${usernameInput}"`);
    const user = await findUserByUsername(usernameInput);

    if (!user) {
        console.log(`[UserService/JSON] User "${usernameInput}" not found.`);
        return null;
    }
    console.log(`[UserService/JSON] User "${usernameInput}" found. ID: ${user.id}, Role: ${user.role}`);

    if (!user.password) {
        console.error(`[UserService/JSON] Login failed for ${usernameInput}: User has no password stored.`);
        return null;
    }

    // For JSON, we compare plain text passwords. In a real DB, this would be hashed.
    const isPasswordCorrect = passwordInput === user.password;

    if (isPasswordCorrect) {
        console.log(`[UserService/JSON] Password match successful for user "${usernameInput}".`);
        const { password: _p, ...userWithoutPassword } = user;
        return userWithoutPassword;
    } else {
        console.log(`[UserService/JSON] Password mismatch for user "${usernameInput}".`);
        return null;
    }
}

export async function addUser(userData: AddUserData): Promise<Omit<User, 'password'>> {
    console.log('[UserService/JSON] Attempting to add user:', userData.username, userData.role);
    const users = await readUsers();

    if (userData.role === 'Admin Developer') {
        console.error('[UserService/JSON] Cannot add user with role "Admin Developer" through this function.');
        throw new Error('INVALID_ROLE_CREATION_ATTEMPT');
    }

    const existingUser = users.find(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (existingUser) {
        console.error(`[UserService/JSON] Username "${userData.username}" already exists.`);
        throw new Error('USERNAME_EXISTS');
    }
    if (userData.email) {
        const existingEmail = users.find(u => u.email && u.email.toLowerCase() === userData.email!.toLowerCase());
        if (existingEmail) {
            console.error(`[UserService/JSON] Email "${userData.email}" already exists.`);
            throw new Error('EMAIL_EXISTS');
        }
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const newUser: User = {
        id: userId,
        username: userData.username,
        password: userData.password, // Storing plain text for JSON demo
        role: userData.role,
        email: userData.email || `${userData.username.toLowerCase().replace(/\s+/g, '_')}@example.com`,
        displayName: userData.displayName || userData.username,
        createdAt: now.toISOString(),
    };

    users.push(newUser);
    await writeUsers(users);
    console.log(`[UserService/JSON] User "${newUser.username}" added successfully with role "${newUser.role}".`);
    const { password: _p, ...newUserWithoutPassword } = newUser;
    return newUserWithoutPassword;
}

export async function deleteUser(userId: string): Promise<void> {
    console.log(`[UserService/JSON] Attempting to delete user with ID: ${userId}`);
    let users = await readUsers();
    const userToDelete = users.find(user => user.id === userId);

    if (!userToDelete) {
        console.error(`[UserService/JSON] User with ID "${userId}" not found for deletion.`);
        throw new Error('USER_NOT_FOUND');
    }

    if (userToDelete.role === 'Admin Developer') {
        console.error(`[UserService/JSON] Cannot delete user with role "Admin Developer". ID: ${userId}`);
        throw new Error('CANNOT_DELETE_ADMIN_DEVELOPER');
    }

    users = users.filter(user => user.id !== userId);
    await writeUsers(users);
    console.log(`[UserService/JSON] User ${userId} deleted successfully.`);
}

export async function updateUserProfile(updateData: UpdateProfileData): Promise<User | null> {
    console.log(`[UserService/JSON] Attempting to update profile for user ID: ${updateData.userId}`);
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`[UserService/JSON] User with ID "${updateData.userId}" not found for profile update.`);
        throw new Error('USER_NOT_FOUND');
    }

    const currentUserState = users[userIndex];

    if (updateData.role && updateData.role === 'Admin Developer' && currentUserState.role !== 'Admin Developer') {
        console.error('[UserService/JSON] Cannot update user role to "Admin Developer" via this function.');
        throw new Error('INVALID_ROLE_UPDATE_ATTEMPT');
    }
    if (currentUserState.role === 'Admin Developer' && updateData.role && updateData.role !== 'Admin Developer') {
        console.error('[UserService/JSON] Role of "Admin Developer" cannot be changed via this function.');
        throw new Error('CANNOT_CHANGE_ADMIN_DEVELOPER_ROLE');
    }

    if (updateData.username && updateData.username.toLowerCase() !== currentUserState.username.toLowerCase()) {
        const existingUser = users.find(u => u.id !== updateData.userId && u.username.toLowerCase() === updateData.username!.toLowerCase());
        if (existingUser) {
            console.error(`[UserService/JSON] New username "${updateData.username}" is already taken.`);
            throw new Error('USERNAME_EXISTS');
        }
    }
    if (updateData.email && updateData.email.toLowerCase() !== (currentUserState.email || '').toLowerCase()) {
        const existingEmailUser = users.find(u => u.id !== updateData.userId && u.email && u.email.toLowerCase() === updateData.email!.toLowerCase());
        if (existingEmailUser) {
            console.error(`[UserService/JSON] New email "${updateData.email}" is already taken.`);
            throw new Error('EMAIL_EXISTS');
        }
    }
    
    const updatedUser = { ...currentUserState, ...updateData };
    users[userIndex] = updatedUser;
    await writeUsers(users);
    console.log(`[UserService/JSON] User profile for ${updateData.userId} updated successfully.`);
    
    if (currentUserState.role !== 'Admin Developer' && (updateData.username || updateData.role)) {
      const adminRolesToNotify = ['Owner', 'General Admin'];
      adminRolesToNotify.forEach(async (role) => {
          await notifyUsersByRole(role, `User profile for "${updatedUser.username}" (Role: ${updatedUser.role}) has been updated.`);
      });
    }
    // Return user without password for security, even though it's plain in JSON for demo
    const { password: _p, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
}

export async function updatePassword(updateData: UpdatePasswordData): Promise<void> {
    console.log(`[UserService/JSON] Attempting to update password for user ID: ${updateData.userId}`);
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`[UserService/JSON] User with ID "${updateData.userId}" not found for password update.`);
        throw new Error('USER_NOT_FOUND');
    }

    const user = users[userIndex];

    if (updateData.currentPassword) {
        if (!user.password || updateData.currentPassword !== user.password) {
            console.error(`[UserService/JSON] Current password mismatch for user ID: ${updateData.userId}`);
            throw new Error('PASSWORD_MISMATCH');
        }
        console.log(`[UserService/JSON] Current password verified for user ${updateData.userId}.`);
    }

    users[userIndex].password = updateData.newPassword; // Storing new plain text password
    await writeUsers(users);
    console.log(`[UserService/JSON] Password for user ${updateData.userId} updated successfully.`);
        
    if (user.role !== 'Admin Developer') {
        const adminRolesToNotify = ['Owner', 'General Admin'];
        adminRolesToNotify.forEach(async (role) => {
            await notifyUsersByRole(role, `Password for user "${user.username}" (Role: ${user.role}) has been changed.`);
        });
    }
}

export async function getAllUsersForDisplay(): Promise<Omit<User, 'password'>[]> {
    console.log("[UserService/JSON] Fetching all users for display (excluding Admin Developer).");
    const users = await readUsers();
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
    console.log(`[UserService/JSON] Updating Google tokens for user ID: ${userId}`);
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        console.error(`[UserService/JSON] User with ID "${userId}" not found for Google token update.`);
        throw new Error('USER_NOT_FOUND');
    }

    users[userIndex] = {
        ...users[userIndex],
        googleRefreshToken: tokens.refreshToken !== undefined ? tokens.refreshToken : users[userIndex].googleRefreshToken,
        googleAccessToken: tokens.accessToken !== undefined ? tokens.accessToken : users[userIndex].googleAccessToken,
        googleAccessTokenExpiresAt: tokens.accessTokenExpiresAt !== undefined ? tokens.accessTokenExpiresAt : users[userIndex].googleAccessTokenExpiresAt,
    };
    
    await writeUsers(users);
    console.log(`[UserService/JSON] Google tokens for user ${userId} updated successfully.`);
}
