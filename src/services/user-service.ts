// src/services/user-service.ts
'use server';

import pool from '@/lib/db';
import type { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2';
import { notifyUsersByRole } from './notification-service';

// Define the structure of a user
export interface User {
    id: string;
    username: string;
    role: string;
    password?: string; // Hashed password
    email?: string;
    whatsappNumber?: string;
    profilePictureUrl?: string;
    displayName?: string;
    createdAt?: string; // ISO date string from DB
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
    currentPassword?: string;
    newPassword: string;
}

export interface UpdateUserGoogleTokensData {
    refreshToken?: string | null;
    accessToken: string | null;
    accessTokenExpiresAt: number | null;
}


// --- Database Helper Functions ---

async function hashPassword(password: string): Promise<string> {
    console.warn("[UserService/DB] Password hashing is not implemented. Storing plain text password (UNSAFE).");
    return password;
}

async function verifyPassword(passwordInput: string, storedHash: string): Promise<boolean> {
    console.warn("[UserService/DB] Password verification is not implemented. Comparing plain text password (UNSAFE).");
    return passwordInput === storedHash;
}


// --- Main Service Functions ---

export async function findUserByUsername(username: string): Promise<User | null> {
    console.log(`[UserService/DB] Finding user by username: ${username}`);
    if (!username) return null;
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
            const user = rows[0] as User;
            if (user.createdAt && user.createdAt instanceof Date) {
                 user.createdAt = user.createdAt.toISOString();
            }
            return user;
        }
        return null;
    } catch (error: any) {
        const originalErrorMessage = error.message || 'Unknown database error';
        const errorMessage = `[UserService/DB] Error finding user by username "${username}": ${originalErrorMessage}`;
        console.error(errorMessage);
        throw new Error(`Database query failed while finding user by username. Original error: ${originalErrorMessage}`);
    }
}

export async function findUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    console.log(`[UserService/DB] Finding user by email: ${email}`);
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            const user = rows[0] as User;
             if (user.createdAt && user.createdAt instanceof Date) {
                 user.createdAt = user.createdAt.toISOString();
            }
            return user;
        }
        return null;
    } catch (error: any) {
        const originalErrorMessage = error.message || 'Unknown database error';
        const errorMessage = `[UserService/DB] Error finding user by email "${email}": ${originalErrorMessage}`;
        console.error(errorMessage);
        throw new Error(`Database query failed while finding user by email. Original error: ${originalErrorMessage}`);
    }
}

export async function findUserById(userId: string): Promise<User | null> {
    console.log(`[UserService/DB] Finding user by ID: ${userId}`);
    if(!userId) return null;
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [userId]);
        if (rows.length > 0) {
            const user = rows[0] as User;
             if (user.createdAt && user.createdAt instanceof Date) {
                 user.createdAt = user.createdAt.toISOString();
            }
            return user;
        }
        return null;
    } catch (error: any) {
        const originalErrorMessage = error.message || 'Unknown database error';
        const errorMessage = `[UserService/DB] Error finding user by ID "${userId}": ${originalErrorMessage}`;
        console.error(errorMessage);
        throw new Error(`Database query failed while finding user by ID. Original error: ${originalErrorMessage}`);
    }
}

export async function verifyUserCredentials(usernameInput: string, passwordInput: string): Promise<Omit<User, 'password'> | null> {
    console.log(`[UserService/DB] Verifying credentials for username: "${usernameInput}"`);
    const user = await findUserByUsername(usernameInput);

    if (!user) {
        console.log(`[UserService/DB] User "${usernameInput}" not found.`);
        return null;
    }
    console.log(`[UserService/DB] User "${usernameInput}" found. ID: ${user.id}, Role: ${user.role}`);

    if (!user.password) {
        console.error(`[UserService/DB] Login failed for ${usernameInput}: User has no password stored.`);
        return null;
    }

    const isPasswordCorrect = await verifyPassword(passwordInput, user.password);

    if (isPasswordCorrect) {
        console.log(`[UserService/DB] Password match successful for user "${usernameInput}".`);
        const { password: _p, ...userWithoutPassword } = user;
        return userWithoutPassword;
    } else {
        console.log(`[UserService/DB] Password mismatch for user "${usernameInput}".`);
        return null;
    }
}

export async function addUser(userData: AddUserData): Promise<Omit<User, 'password'>> {
    console.log('[UserService/DB] Attempting to add user:', userData.username, userData.role);

    if (userData.role === 'Admin Developer') {
        console.error('[UserService/DB] Cannot add user with role "Admin Developer" through this function.');
        throw new Error('INVALID_ROLE_CREATION_ATTEMPT');
    }

    const existingUser = await findUserByUsername(userData.username);
    if (existingUser) {
        console.error(`[UserService/DB] Username "${userData.username}" already exists.`);
        throw new Error('USERNAME_EXISTS');
    }
    if (userData.email) {
        const existingEmail = await findUserByEmail(userData.email);
        if (existingEmail) {
            console.error(`[UserService/DB] Email "${userData.email}" already exists.`);
            throw new Error('EMAIL_EXISTS');
        }
    }


    const hashedPassword = await hashPassword(userData.password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const newUser: User = {
        id: userId,
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
        email: userData.email || `${userData.username.toLowerCase().replace(/\s+/g, '_')}@example.com`,
        displayName: userData.displayName || userData.username,
        createdAt: now.toISOString(),
    };

    try {
        await pool.query(
            'INSERT INTO users (id, username, password, role, email, displayName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newUser.id, newUser.username, newUser.password, newUser.role, newUser.email, newUser.displayName, newUser.createdAt]
        );
        console.log(`[UserService/DB] User "${newUser.username}" added successfully with role "${newUser.role}".`);
        const { password: _p, ...newUserWithoutPassword } = newUser;
        return newUserWithoutPassword;
    } catch (error: any) {
        const originalErrorMessage = error.message || 'Unknown database error';
        console.error(`[UserService/DB] Error adding user "${userData.username}":`, originalErrorMessage);
        throw new Error(`Database query failed while adding user. Original error: ${originalErrorMessage}`);
    }
}

export async function deleteUser(userId: string): Promise<void> {
    console.log(`[UserService/DB] Attempting to delete user with ID: ${userId}`);
    const userToDelete = await findUserById(userId);

    if (!userToDelete) {
        console.error(`[UserService/DB] User with ID "${userId}" not found for deletion.`);
        throw new Error('USER_NOT_FOUND');
    }

    if (userToDelete.role === 'Admin Developer') {
        console.error(`[UserService/DB] Cannot delete user with role "Admin Developer". ID: ${userId}`);
        throw new Error('CANNOT_DELETE_ADMIN_DEVELOPER');
    }

    try {
        await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        console.log(`[UserService/DB] User ${userId} deleted successfully.`);
    } catch (error: any) {
        const originalErrorMessage = error.message || 'Unknown database error';
        console.error(`[UserService/DB] Error deleting user "${userId}":`, originalErrorMessage);
        throw new Error(`Database query failed while deleting user. Original error: ${originalErrorMessage}`);
    }
}

export async function updateUserProfile(updateData: UpdateProfileData): Promise<User | null> {
    console.log(`[UserService/DB] Attempting to update profile for user ID: ${updateData.userId}`);
    const currentUserState = await findUserById(updateData.userId);

    if (!currentUserState) {
        console.error(`[UserService/DB] User with ID "${updateData.userId}" not found for profile update.`);
        throw new Error('USER_NOT_FOUND');
    }

    if (updateData.role && updateData.role === 'Admin Developer' && currentUserState.role !== 'Admin Developer') {
        console.error('[UserService/DB] Cannot update user role to "Admin Developer" via this function.');
        throw new Error('INVALID_ROLE_UPDATE_ATTEMPT');
    }
    if (currentUserState.role === 'Admin Developer' && updateData.role && updateData.role !== 'Admin Developer') {
        console.error('[UserService/DB] Role of "Admin Developer" cannot be changed via this function.');
        throw new Error('CANNOT_CHANGE_ADMIN_DEVELOPER_ROLE');
    }

    if (updateData.username && updateData.username.toLowerCase() !== currentUserState.username.toLowerCase()) {
        const existingUser = await findUserByUsername(updateData.username);
        if (existingUser && existingUser.id !== updateData.userId) {
            console.error(`[UserService/DB] New username "${updateData.username}" is already taken.`);
            throw new Error('USERNAME_EXISTS');
        }
    }
     if (updateData.email && updateData.email.toLowerCase() !== (currentUserState.email || '').toLowerCase()) {
        const existingEmailUser = await findUserByEmail(updateData.email);
        if (existingEmailUser && existingEmailUser.id !== updateData.userId) {
            console.error(`[UserService/DB] New email "${updateData.email}" is already taken.`);
            throw new Error('EMAIL_EXISTS');
        }
    }

    const fieldsToUpdate: any = {};
    if (updateData.username !== undefined && updateData.username !== currentUserState.username) fieldsToUpdate.username = updateData.username;
    if (updateData.role !== undefined && updateData.role !== currentUserState.role) fieldsToUpdate.role = updateData.role;
    if (updateData.email !== undefined && updateData.email !== currentUserState.email) fieldsToUpdate.email = updateData.email;
    if (updateData.whatsappNumber !== undefined && updateData.whatsappNumber !== currentUserState.whatsappNumber) fieldsToUpdate.whatsappNumber = updateData.whatsappNumber;
    if (updateData.profilePictureUrl !== undefined && updateData.profilePictureUrl !== currentUserState.profilePictureUrl) {
        fieldsToUpdate.profilePictureUrl = updateData.profilePictureUrl === null ? null : updateData.profilePictureUrl;
    }
    if (updateData.displayName !== undefined && updateData.displayName !== currentUserState.displayName) fieldsToUpdate.displayName = updateData.displayName;


    if (Object.keys(fieldsToUpdate).length === 0) {
        console.log(`[UserService/DB] No changes to update for user ${updateData.userId}.`);
        return currentUserState; // Return current state if no changes
    }
    
    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(fieldsToUpdate), updateData.userId];

    try {
        await pool.query(`UPDATE users SET ${setClauses} WHERE id = ?`, values);
        console.log(`[UserService/DB] User profile for ${updateData.userId} updated successfully.`);

        if (currentUserState.role !== 'Admin Developer') {
            const adminRolesToNotify = ['Owner', 'Admin/Akuntan']; // General Admin is now Admin/Akuntan
            adminRolesToNotify.forEach(async (role) => {
                await notifyUsersByRole(role, `User profile for "${fieldsToUpdate.username || currentUserState.username}" (Role: ${fieldsToUpdate.role || currentUserState.role}) has been updated.`);
            });
        }
        return { ...currentUserState, ...fieldsToUpdate };
    } catch (error: any) {
        const originalErrorMessage = error.message || 'Unknown database error';
        console.error(`[UserService/DB] Error updating user profile for "${updateData.userId}":`, originalErrorMessage);
        throw new Error(`Database query failed while updating user profile. Original error: ${originalErrorMessage}`);
    }
}

export async function updatePassword(updateData: UpdatePasswordData): Promise<void> {
    console.log(`[UserService/DB] Attempting to update password for user ID: ${updateData.userId}`);
    const user = await findUserById(updateData.userId);

    if (!user) {
        console.error(`[UserService/DB] User with ID "${updateData.userId}" not found for password update.`);
        throw new Error('USER_NOT_FOUND');
    }

    if (updateData.currentPassword) {
        if (!user.password) {
            console.error(`[UserService/DB] Password update failed for ${updateData.userId}: User has no password set.`);
            throw new Error('PASSWORD_MISMATCH');
        }
        const isCurrentPasswordCorrect = await verifyPassword(updateData.currentPassword, user.password);
        if (!isCurrentPasswordCorrect) {
            console.error(`[UserService/DB] Current password mismatch for user ID: ${updateData.userId}`);
            throw new Error('PASSWORD_MISMATCH');
        }
        console.log(`[UserService/DB] Current password verified for user ${updateData.userId}.`);
    }

    const newHashedPassword = await hashPassword(updateData.newPassword);

    try {
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, updateData.userId]);
        console.log(`[UserService/DB] Password for user ${updateData.userId} updated successfully.`);
        
        if (user.role !== 'Admin Developer') {
            const adminRolesToNotify = ['Owner', 'Admin/Akuntan'];
            adminRolesToNotify.forEach(async (role) => {
                await notifyUsersByRole(role, `Password for user "${user.username}" (Role: ${user.role}) has been changed.`);
            });
        }
    } catch (error: any) {
        const originalErrorMessage = error.message || 'Unknown database error';
        console.error(`[UserService/DB] Error updating password for user "${updateData.userId}":`, originalErrorMessage);
        throw new Error(`Database query failed while updating password. Original error: ${originalErrorMessage}`);
    }
}

export async function getAllUsersForDisplay(): Promise<Omit<User, 'password'>[]> {
    console.log("[UserService/DB] Fetching all users for display (excluding Admin Developer).");
    try {
        const [rows] = await pool.query<RowDataPacket[]>("SELECT id, username, role, email, whatsappNumber, profilePictureUrl, displayName, createdAt, googleRefreshToken, googleAccessToken, googleAccessTokenExpiresAt FROM users WHERE role != 'Admin Developer'");
        return rows.map(row => {
            const user = row as User;
             if (user.createdAt && user.createdAt instanceof Date) {
                 user.createdAt = user.createdAt.toISOString();
            }
            return user;
        }) as Omit<User, 'password'>[];
    } catch (error: any) {
        const originalErrorMessage = error.message || 'Unknown database error';
        console.error("[UserService/DB] Error fetching all users for display:", originalErrorMessage);
        throw new Error(`Database query failed while fetching users for display. Original error: ${originalErrorMessage}`);
    }
}

export async function updateUserGoogleTokens(
    userId: string,
    tokens: UpdateUserGoogleTokensData
): Promise<void> {
    console.log(`[UserService/DB] Updating Google tokens for user ID: ${userId}`);
    
    const fieldsToUpdate: any = {};
    // Only add fields to update if they are explicitly provided (not undefined)
    if (tokens.accessToken !== undefined) fieldsToUpdate.googleAccessToken = tokens.accessToken;
    if (tokens.accessTokenExpiresAt !== undefined) fieldsToUpdate.googleAccessTokenExpiresAt = tokens.accessTokenExpiresAt;
    if (tokens.refreshToken !== undefined) fieldsToUpdate.googleRefreshToken = tokens.refreshToken;


    if (Object.keys(fieldsToUpdate).length === 0) {
        console.log(`[UserService/DB] No Google token fields to update for user ID: ${userId}.`);
        return;
    }

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(fieldsToUpdate), userId];

    try {
        const [result] = await pool.query<ResultSetHeader>(`UPDATE users SET ${setClauses} WHERE id = ?`, values);
        if (result.affectedRows === 0) {
            console.error(`[UserService/DB] User with ID "${userId}" not found for Google token update.`);
            throw new Error('USER_NOT_FOUND');
        }
        console.log(`[UserService/DB] Google tokens for user ${userId} updated successfully.`);
    } catch (error: any) {
        const originalErrorMessage = error.message || 'Unknown database error';
        console.error(`[UserService/DB] Error updating Google tokens for user "${userId}":`, originalErrorMessage);
        throw new Error(`Database query failed while updating Google tokens. Original error: ${originalErrorMessage}`);
    }
}
