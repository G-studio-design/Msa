// src/services/holiday-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils'; // Import centralized utils

export interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National Holiday" | "Religious Holiday" | "Company Event" | "Other";
  description?: string;
}

const HOLIDAYS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'holidays.json');

// The individual read/write functions are no longer needed here.

export async function getAllHolidays(): Promise<HolidayEntry[]> {
  console.log("[HolidayService] Fetching all holidays.");
  const holidays = await readDb<HolidayEntry[]>(HOLIDAYS_DB_PATH, []);
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
