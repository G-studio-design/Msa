'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import type { User } from '@/types/user-types';

const DEFAULT_USERS: User[] = [
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


// --- Internal DB Functions (Isolated) ---
async function readDb<T>(dbPath: string): Promise<T[]> {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data) as T[];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return []; // Return empty array if file doesn't exist
        }
        throw error;
    }
}

async function writeDb<T>(dbPath: string, data: T): Promise<void> {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}
// --- End Internal DB Functions ---


/**
 * Reads the entire user database, including developers.
 * Initializes with default users if the database is empty.
 * This is a low-level data access function.
 * @returns A promise that resolves to an array of all User objects.
 */
export async function getAllUsers(): Promise<User[]> {
    const USERS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    let users = await readDb<User>(USERS_DB_PATH);
    
    if (users.length === 0) {
        console.log("[user-data] User database is empty. Initializing with default users.");
        await writeDb(USERS_DB_PATH, DEFAULT_USERS);
        return DEFAULT_USERS;
    }
    
    return users;
}

/**
 * Saves the entire user array back to the database file.
 * @param users The complete array of users to save.
 */
export async function saveAllUsers(users: User[]): Promise<void> {
    const USERS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    await writeDb(USERS_DB_PATH, users);
}
