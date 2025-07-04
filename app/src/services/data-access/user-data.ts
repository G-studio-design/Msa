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

async function readDb(): Promise<User[]> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        return JSON.parse(data) as User[];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`[UserData] users.json not found. Creating it with default users.`);
            await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_USERS, null, 2), 'utf8');
            return DEFAULT_USERS;
        }
        console.error(`[UserData] Error reading users.json:`, error);
        throw new Error('Could not read user database.');
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
    return await readDb();
}
