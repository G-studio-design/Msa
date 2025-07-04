// src/services/holiday-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { unstable_noStore as noStore } from 'next/cache';

export interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National Holiday" | "Religious Holiday" | "Company Event" | "Other";
  description?: string;
}

export async function getAllHolidays(): Promise<HolidayEntry[]> {
  noStore();
  const HOLIDAYS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'holidays.json');
  const holidays = await readDb<HolidayEntry[]>(HOLIDAYS_DB_PATH, []);
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// --- Internal DB Functions ---

async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
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
