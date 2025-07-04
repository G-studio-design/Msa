// src/services/data-access/user-data.ts
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

async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
    try {
        await fs.access(dbPath);
        const data = await fs.readFile(dbPath, 'utf8');
        if (data.trim() === "") {
            return defaultData;
        }
        return JSON.parse(data) as T;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
          // IMPORTANT: Do NOT write the file here. This function should be read-only.
          console.warn(`[DB Read] File not found at ${path.basename(dbPath)}. Returning default data in memory.`);
          return defaultData;
        }
        console.error(`[DB Read Error] Error reading or parsing database at ${path.basename(dbPath)}.`, error);
        return defaultData;
    }
}

/**
 * Reads the entire user database, including developers.
 * Initializes with default users if the database is empty.
 * This is a low-level data access function.
 * @returns A promise that resolves to an array of all User objects.
 */
export async function getAllUsers(): Promise<User[]> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    let users = await readDb<User[]>(DB_PATH, DEFAULT_USERS);

    // This logic is now safe because readDb no longer writes files.
    if (users.length === 0) {
        return DEFAULT_USERS;
    }

    return users;
}
