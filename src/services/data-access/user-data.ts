
// src/services/data-access/user-data.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import type { User } from '@/types/user-types';

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');

const DEFAULT_USERS: User[] = [
    {
      id: "usr_dev_iwg",
      username: "dev_admin",
      password: "password123",
      role: "Admin Developer",
      email: "dev@example.com",
      displayName: "Developer Admin",
      createdAt: new Date().toISOString(),
      whatsappNumber: ""
    },
    {
      id: "usr_owner_default",
      username: "owner",
      password: "password123",
      role: "Owner",
      email: "owner@example.com",
      displayName: "Default Owner",
      createdAt: new Date().toISOString()
    }
];

// This function ONLY READS. It does not create files, making it safe for build processes.
async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return data ? (JSON.parse(data) as T) : defaultData;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
          // File doesn't exist, return default data without trying to create it.
          return defaultData;
        }
        console.error(`[DB Read Error] Error reading or parsing database at ${path.basename(dbPath)}.`, error);
        // Fallback to in-memory default data on other errors.
        return defaultData;
    }
}

/**
 * Reads the entire user database, including developers.
 * Initializes with default users if the database is empty or doesn't exist.
 * This is a low-level data access function.
 * @returns A promise that resolves to an array of all User objects.
 */
export async function getAllUsers(): Promise<User[]> {
    const users = await readDb<User[]>(DB_PATH, DEFAULT_USERS);
    return users.length > 0 ? users : DEFAULT_USERS;
}
