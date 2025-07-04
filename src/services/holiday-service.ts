'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

export interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National Holiday" | "Religious Holiday" | "Company Event" | "Other";
  description?: string;
}


// --- Internal DB Functions (Isolated) ---
async function readDb<T>(dbPath: string): Promise<T[]> {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data) as T[];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return []; // Return empty array if file doesn't exist
        }
        throw error;
    }
}
// --- End Internal DB Functions ---


export async function getAllHolidays(): Promise<HolidayEntry[]> {
  const HOLIDAYS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'holidays.json');
  const holidays = await readDb<HolidayEntry>(HOLIDAYS_DB_PATH);
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
