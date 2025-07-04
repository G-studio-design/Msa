// src/services/data-access/user-data.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import type { User } from '@/types/user-types';
import { unstable_noStore as noStore } from 'next/cache';

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

/**
 * Reads the entire user database, including developers.
 * Initializes with default users if the database is empty.
 * This is a low-level data access function.
 * @returns A promise that resolves to an array of all User objects.
 */
export async function getAllUsers(): Promise<User[]> {
    noStore();
    const USERS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    let users = await readDb<User[]>(USERS_DB_PATH, []);
    
    if (users.length === 0) {
        console.log("[user-data] User database is empty. Initializing with default users.");
        await writeDb(USERS_DB_PATH, DEFAULT_USERS);
        return DEFAULT_USERS;
    }
    
    return users;
}


// --- Internal DB Functions ---

async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        if (data.trim() === "") {
            console.warn(`[JSON DB Utils] Database file at ${path.basename(dbPath)} is empty. Returning default data.`);
            return defaultData;
        }
        return JSON.parse(data) as T;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(`[JSON DB Utils] Database file not found at ${path.basename(dbPath)}. Returning default data without creating file.`);
        } else {
          console.error(`[JSON DB Utils] Error reading or parsing database at ${path.basename(dbPath)}. Returning default data. Error:`, error);
        }
        return defaultData;
    }
}

async function writeDb<T>(dbPath: string, data: T): Promise<void> {
    try {
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`[JSON DB Utils] Error writing to database at ${path.basename(dbPath)}:`, error);
        throw new Error(`Failed to save data to ${path.basename(dbPath)}.`);
    }
}
