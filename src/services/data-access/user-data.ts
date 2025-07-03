
// src/services/data-access/user-data.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils';
import type { User } from '@/types/user-types';

const USERS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
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

export async function getAllUsers(): Promise<User[]> {
    let users = await readDb<User[]>(USERS_DB_PATH, []);
    
    if (users.length === 0) {
        console.log("[user-data] User database is empty. Initializing with default users.");
        await writeDb(USERS_DB_PATH, DEFAULT_USERS);
        return DEFAULT_USERS;
    }
    
    return users;
}
