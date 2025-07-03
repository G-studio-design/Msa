
// src/lib/json-db-utils.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

export async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
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

export async function writeDb<T>(dbPath: string, data: T): Promise<void> {
    try {
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`[JSON DB Utils] Error writing to database at ${path.basename(dbPath)}:`, error);
        throw new Error(`Failed to save data to ${path.basename(dbPath)}.`);
    }
}
