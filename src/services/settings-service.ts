// src/services/settings-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/database-utils';

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

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'app_settings.json');

export async function getAppSettings(): Promise<AppSettings> {
  return await readDb<AppSettings>(DB_PATH, DEFAULT_SETTINGS);
}

export async function isAttendanceFeatureEnabled(): Promise<boolean> {
  const settings = await getAppSettings();
  return settings.feature_attendance_enabled;
}

export async function setAttendanceFeatureEnabled(isEnabled: boolean): Promise<AppSettings> {
  const settings = await getAppSettings();
  const updatedSettings: AppSettings = { ...settings, feature_attendance_enabled: isEnabled };
  await writeDb(DB_PATH, updatedSettings);
  return updatedSettings;
}

export async function updateAttendanceSettings(newSettings: AttendanceSettings): Promise<AppSettings> {
    const currentSettings = await getAppSettings();
    const updatedSettings: AppSettings = {
      ...currentSettings,
      ...newSettings,
    };
    await writeDb(DB_PATH, updatedSettings);
    return updatedSettings;
}
