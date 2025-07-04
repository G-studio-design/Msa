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
          return defaultData;
        }
        console.error(`[DB Read Error] Error reading or parsing database at ${path.basename(dbPath)}.`, error);
        return defaultData;
    }
}

async function writeDb<T>(dbPath: string, data: T): Promise<void> {
    try {
        const dbDir = path.dirname(dbPath);
        await fs.mkdir(dbDir, { recursive: true });
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`[DB Write Error] Error writing to database at ${path.basename(dbPath)}:`, error);
        throw new Error(`Failed to save data to ${path.basename(dbPath)}.`);
    }
}

/**
 * Reads the entire user database, including developers.
 * Initializes with default users if the database is empty.
 * This is a low-level data access function.
 * @returns A promise that resolves to an array of all User objects.
 */
export async function getAllUsers(): Promise<User[]> {
    noStore();
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    let users = await readDb<User[]>(DB_PATH, []);

    // If the database was empty (or didn't exist), readDb returns an empty array.
    // We then populate it with default users and write it back.
    if (users.length === 0) {
        console.log(`[UserData] users.json is empty or was not found. Initializing with default users.`);
        await writeDb(DB_PATH, DEFAULT_USERS);
        return DEFAULT_USERS;
    }

    return users;
}

export async function writeAllUsers(users: User[]): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    await writeDb(DB_PATH, users);
}
