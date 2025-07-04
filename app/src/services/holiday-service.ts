// src/services/holiday-service.ts
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

async function readDb(): Promise<HolidayEntry[]> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'holidays.json');
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        return JSON.parse(data) as HolidayEntry[];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
          return [];
        }
        console.error(`[HolidayService] Error reading database:`, error);
        throw new Error('Failed to read holiday database.');
    }
}

export async function getAllHolidays(): Promise<HolidayEntry[]> {
  const holidays = await readDb();
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
