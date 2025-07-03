// src/lib/json-db-utils.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Reads and parses a JSON database file.
 * Handles file not found, empty, or corrupted JSON cases safely for build processes.
 * @param dbPath The absolute path to the JSON file.
 * @param defaultData The default data (e.g., an empty array) to use if the file is new or invalid.
 * @returns A promise that resolves to the parsed data or the default data.
 */
export async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
    try {
        // We only try to read the file. We never write during a read operation.
        const data = await fs.readFile(dbPath, 'utf8');
        // If the file is empty, return the default data.
        if (data.trim() === "") {
            console.warn(`[JSON DB Utils] Database file at ${path.basename(dbPath)} is empty. Returning default data.`);
            return defaultData;
        }
        return JSON.parse(data) as T;
    } catch (error: any) {
        // If the file doesn't exist (ENOENT) or there's another read/parse error,
        // we log it and safely return the default data without trying to write.
        if (error.code === 'ENOENT') {
          console.log(`[JSON DB Utils] Database file not found at ${path.basename(dbPath)}. Returning default data without creating file.`);
        } else {
          console.error(`[JSON DB Utils] Error reading or parsing database at ${path.basename(dbPath)}. Returning default data. Error:`, error);
        }
        return defaultData;
    }
}


/**
 * Writes data to a JSON database file.
 * @param dbPath The absolute path to the JSON file.
 * @param data The data to write to the file.
 */
export async function writeDb<T>(dbPath: string, data: T): Promise<void> {
    try {
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`[JSON DB Utils] Error writing to database at ${path.basename(dbPath)}:`, error);
        throw new Error(`Failed to save data to ${path.basename(dbPath)}.`);
    }
}