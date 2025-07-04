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

async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
    noStore();
    try {
        await fs.access(dbPath);
        const data = await fs.readFile(dbPath, 'utf8');
        if (data.trim() === "") {
            return defaultData;
        }
        return JSON.parse(data) as T;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
          return defaultData;
        }
        console.error(`[DB Read Error] Error reading or parsing database at ${path.basename(dbPath)}.`, error);
        return defaultData;
    }
}

export async function getAllHolidays(): Promise<HolidayEntry[]> {
  const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'holidays.json');
  const holidays = await readDb<HolidayEntry[]>(DB_PATH, []);
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
