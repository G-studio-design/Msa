
// src/services/data-access/user-data.ts
'use server';

import * as path from 'path';
import type { User } from '@/types/user-types';
import { readDb } from '@/lib/database-utils';

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

/**
 * Reads the entire user database, including developers.
 * Initializes with default users if the database is empty or doesn't exist.
 * This is a low-level data access function.
 * @returns A promise that resolves to an array of all User objects.
 */
export async function getAllUsers(): Promise<User[]> {
    const users = await readDb<User[]>(DB_PATH, DEFAULT_USERS);
    // If the read operation returns an empty array (e.g., file was empty),
    // ensure the default users are still returned.
    return users.length > 0 ? users : DEFAULT_USERS;
}
