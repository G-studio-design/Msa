
// src/services/holiday-service.ts
'use server';

import * as path from 'path';
import { readDb } from '@/lib/database-utils';

export interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National Holiday" | "Religious Holiday" | "Company Event" | "Other";
  description?: string;
}

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'holidays.json');

export async function getAllHolidays(): Promise<HolidayEntry[]> {
  const holidays = await readDb<HolidayEntry[]>(DB_PATH, []);
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
