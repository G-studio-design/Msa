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

const HOLIDAYS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'holidays.json');

async function readHolidays(): Promise<HolidayEntry[]> {
  try {
    await fs.access(HOLIDAYS_DB_PATH);
    const data = await fs.readFile(HOLIDAYS_DB_PATH, 'utf8');
    if (data.trim() === "") {
      return [];
    }
    return JSON.parse(data) as HolidayEntry[];
  } catch (error) {
    console.warn("[HolidayService/JSON] holidays.json not found or is empty/invalid. Returning empty array.");
    try {
        await fs.access(HOLIDAYS_DB_PATH); // Check again before writing
    } catch (accessError) {
        console.log("[HolidayService/JSON] Creating new holidays.json file.");
        await fs.writeFile(HOLIDAYS_DB_PATH, JSON.stringify([], null, 2), 'utf8');
    }
    return [];
  }
}

async function writeHolidays(holidays: HolidayEntry[]): Promise<void> {
  try {
    await fs.writeFile(HOLIDAYS_DB_PATH, JSON.stringify(holidays, null, 2), 'utf8');
    console.log(`[HolidayService/JSON] Holiday data successfully written. Total entries: ${holidays.length}`);
  } catch (error) {
    console.error("[HolidayService/JSON] Error writing holidays database:", error);
    throw new Error('Failed to save holiday data.');
  }
}

export async function getAllHolidays(): Promise<HolidayEntry[]> {
  console.log("[HolidayService/JSON] Fetching all holidays.");
  const holidays = await readHolidays();
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
