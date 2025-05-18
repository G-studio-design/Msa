
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

export interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National Holiday" | "Religious Holiday" | "Company Event" | "Other";
  description?: string;
  // createdBy?: string; // Optional: who added this entry
  // createdAt?: string; // Optional: when it was added
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
    // If file doesn't exist or is invalid, return empty array or create it
    console.warn("[HolidayService] holidays.json not found or is empty/invalid. Returning empty array. Please create the file with '[]' if it doesn't exist or you want to start fresh.");
    // Optionally create the file if it doesn't exist
    try {
        await fs.access(HOLIDAYS_DB_PATH);
    } catch (accessError) {
        console.log("[HolidayService] Creating new holidays.json file.");
        await fs.writeFile(HOLIDAYS_DB_PATH, JSON.stringify([], null, 2), 'utf8');
    }
    return [];
  }
}

async function writeHolidays(holidays: HolidayEntry[]): Promise<void> {
  try {
    await fs.writeFile(HOLIDAYS_DB_PATH, JSON.stringify(holidays, null, 2), 'utf8');
    console.log(`[HolidayService] Holiday data successfully written. Total entries: ${holidays.length}`);
  } catch (error) {
    console.error("[HolidayService] Error writing holidays database:", error);
    throw new Error('Failed to save holiday data.');
  }
}

export async function getAllHolidays(): Promise<HolidayEntry[]> {
  console.log("[HolidayService] Fetching all holidays.");
  const holidays = await readHolidays();
  // Sort by date, ascending
  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// --- Placeholder functions for future UI ---
// export async function addHoliday(data: Omit<HolidayEntry, 'id'>): Promise<HolidayEntry> {
//   const holidays = await readHolidays();
//   const newHoliday: HolidayEntry = {
//     id: `holiday_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
//     ...data,
//     // createdAt: new Date().toISOString(),
//     // createdBy: data.createdBy // Assuming this will be passed from the UI/auth context
//   };
//   holidays.push(newHoliday);
//   await writeHolidays(holidays);
//   return newHoliday;
// }

// export async function updateHoliday(id: string, updatedData: Partial<Omit<HolidayEntry, 'id'>>): Promise<HolidayEntry | null> {
//   const holidays = await readHolidays();
//   const index = holidays.findIndex(h => h.id === id);
//   if (index === -1) {
//     return null;
//   }
//   holidays[index] = { ...holidays[index], ...updatedData };
//   await writeHolidays(holidays);
//   return holidays[index];
// }

// export async function deleteHoliday(id: string): Promise<void> {
//   let holidays = await readHolidays();
//   holidays = holidays.filter(h => h.id !== id);
//   await writeHolidays(holidays);
// }
