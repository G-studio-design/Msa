// src/services/holiday-service.ts
'use server';

import * as path from 'path';
import { readDb } from '@/lib/json-db-utils';

export interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National Holiday" | "Religious Holiday" | "Company Event" | "Other";
  description?: string;
}

export async function getAllHolidays(): Promise<HolidayEntry[]> {
  const HOLIDAYS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'holidays.json');
  const holidays = await readDb<HolidayEntry[]>(HOLIDAYS_DB_PATH, []);
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
