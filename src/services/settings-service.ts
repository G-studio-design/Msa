// src/services/settings-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils';
import { unstable_noStore as noStore } from 'next/cache';

interface WorkingHours {
  isWorkDay: boolean;
  checkIn: string; // "HH:mm"
  checkOut: string; // "HH:mm"
}

export interface AppSettings {
  feature_attendance_enabled: boolean;
  office_latitude: number;
  office_longitude: number;
  attendance_radius_meters: number;
  workingHours: {
    monday: WorkingHours;
    tuesday: WorkingHours;
    wednesday: WorkingHours;
    thursday: WorkingHours;
    friday: WorkingHours;
    saturday: WorkingHours;
    sunday: WorkingHours;
  };
}

export type AttendanceSettings = Omit<AppSettings, 'feature_attendance_enabled'>;


const SETTINGS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'app_settings.json');
const DEFAULT_SETTINGS: AppSettings = {
  feature_attendance_enabled: true,
  office_latitude: -8.6414837,
  office_longitude: 115.2222507,
  attendance_radius_meters: 100,
  workingHours: {
    monday: { isWorkDay: true, checkIn: "09:00", checkOut: "17:00" },
    tuesday: { isWorkDay: true, checkIn: "09:00", checkOut: "17:00" },
    wednesday: { isWorkDay: true, checkIn: "09:00", checkOut: "17:00" },
    thursday: { isWorkDay: true, checkIn: "09:00", checkOut: "17:00" },
    friday: { isWorkDay: true, checkIn: "09:00", checkOut: "17:00" },
    saturday: { isWorkDay: true, checkIn: "09:00", checkOut: "14:00" },
    sunday: { isWorkDay: false, checkIn: "09:00", checkOut: "17:00" },
  }
};

export async function getAppSettings(): Promise<AppSettings> {
  noStore();
  console.log("[SettingsService] Fetching app settings.");
  return await readDb<AppSettings>(SETTINGS_DB_PATH, DEFAULT_SETTINGS);
}

export async function isAttendanceFeatureEnabled(): Promise<boolean> {
  noStore();
  const settings = await getAppSettings();
  return settings.feature_attendance_enabled;
}

export async function setAttendanceFeatureEnabled(isEnabled: boolean): Promise<AppSettings> {
  noStore();
  console.log(`[SettingsService] Setting attendance feature to: ${isEnabled}`);
  const settings = await getAppSettings();
  const updatedSettings: AppSettings = { ...settings, feature_attendance_enabled: isEnabled };
  await writeDb(SETTINGS_DB_PATH, updatedSettings);
  return updatedSettings;
}

export async function updateAttendanceSettings(newSettings: AttendanceSettings): Promise<AppSettings> {
    noStore();
    console.log('[SettingsService] Updating attendance settings:', newSettings);
    const currentSettings = await getAppSettings();
    const updatedSettings: AppSettings = {
      ...currentSettings,
      ...newSettings,
    };
    await writeDb(SETTINGS_DB_PATH, updatedSettings);
    console.log('[SettingsService] Attendance settings updated successfully.');
    return updatedSettings;
}
