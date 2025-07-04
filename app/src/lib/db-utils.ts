// src/lib/db-utils.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Safely reads a JSON database file.
 * This function is read-only and will not create a file if it doesn't exist.
 * This is critical to prevent side-effects during the Next.js build process.
 * @param dbPath The absolute path to the database file.
 * @param defaultData The default data to return if the file is missing or empty.
 * @returns A promise that resolves to the parsed data or the default data.
 */
export async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        // If the file is empty, return the default data.
        if (data.trim() === "") {
            return defaultData;
        }
        return JSON.parse(data) as T;
    } catch (error: any) {
        // If the file doesn't exist, return default data without trying to create it.
        if (error.code === 'ENOENT') {
          return defaultData;
        }
        // For other errors (e.g., parsing errors), log them and return default data.
        console.error(`[DB Read Error] Error reading or parsing database at ${path.basename(dbPath)}. Returning default data.`, error);
        return defaultData;
    }
}

/**
 * Writes data to a JSON database file.
 * @param dbPath The absolute path to the database file.
 * @param data The data to write to the file.
 */
export async function writeDb<T>(dbPath: string, data: T): Promise<void> {
    try {
        const dbDir = path.dirname(dbPath);
        await fs.mkdir(dbDir, { recursive: true });
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`[DB Write Error] Error writing to database at ${path.basename(dbPath)}:`, error);
        throw new Error(`Failed to save data to ${path.basename(dbPath)}.`);
    }
}
