// src/services/data-access/user-data.ts
'use server';

import * as path from 'path';
import type { User } from '@/types/user-types';
import { unstable_noStore as noStore } from 'next/cache';
import { readDb, writeDb } from '@/lib/db-utils';

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
