// src/services/data-access/user-data.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import type { User } from '@/types/user-types';
import { unstable_noStore as noStore } from 'next/cache';
import { readDb } from '@/lib/db-utils';

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
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    
    let users = await readDb<User[]>(DB_PATH, DEFAULT_USERS);

    // If the database file was empty or didn't exist, and we got the default users,
    // let's ensure the file is created on the first run for subsequent reads.
    // This is a one-time setup action.
    try {
        await fs.access(DB_PATH);
    } catch (error) {
        console.log(`[UserData] users.json not found. Creating it with default users.`);
        await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_USERS, null, 2), 'utf8');
    }

    return users;
}
