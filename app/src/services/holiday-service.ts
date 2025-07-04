// src/services/holiday-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { unstable_noStore as noStore } from 'next/cache';
import { readDb } from '@/lib/db-utils';

export interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National Holiday" | "Religious Holiday" | "Company Event" | "Other";
  description?: string;
}

export async function getAllHolidays(): Promise<HolidayEntry[]> {
  noStore();
  const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'holidays.json');
  const holidays = await readDb<HolidayEntry[]>(DB_PATH, []);
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
