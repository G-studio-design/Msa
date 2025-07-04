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

async function readUsersDb(): Promise<User[]> {
    const USERS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    try {
        const data = await fs.readFile(USERS_DB_PATH, 'utf8');
        if (data.trim() === "") return [];
        return JSON.parse(data) as User[];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error(`[user-data] Error reading user database.`, error);
        return [];
    }
}

async function writeUsersDb(data: User[]): Promise<void> {
    const USERS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
    try {
        await fs.writeFile(USERS_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`[user-data] Error writing to user database:`, error);
        throw new Error(`Failed to save user data.`);
    }
}

export async function getAllUsers(): Promise<User[]> {
    let users = await readUsersDb();
    if (users.length === 0) {
        console.log("[user-data] User database is empty. Initializing with default users.");
        await writeUsersDb(DEFAULT_USERS);
        return DEFAULT_USERS;
    }
    return users;
}

export async function saveAllUsers(users: User[]): Promise<void> {
    await writeUsersDb(users);
}
