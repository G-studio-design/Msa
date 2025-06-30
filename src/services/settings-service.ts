// src/services/settings-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils';

export interface AppSettings {
  feature_attendance_enabled: boolean;
  office_latitude: number;
  office_longitude: number;
  attendance_radius_meters: number;
  check_in_time: string; // e.g., "09:00"
  check_out_time: string; // e.g., "17:00"
}

export type AttendanceSettings = Omit<AppSettings, 'feature_attendance_enabled'>;


const SETTINGS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'app_settings.json');
const DEFAULT_SETTINGS: AppSettings = {
  feature_attendance_enabled: true,
  office_latitude: -8.6759,
  office_longitude: 115.2386,
  attendance_radius_meters: 100,
  check_in_time: "09:00",
  check_out_time: "17:00",
};

export async function getAppSettings(): Promise<AppSettings> {
  console.log("[SettingsService] Fetching app settings.");
  return await readDb<AppSettings>(SETTINGS_DB_PATH, DEFAULT_SETTINGS);
}

export async function isAttendanceFeatureEnabled(): Promise<boolean> {
  const settings = await getAppSettings();
  return settings.feature_attendance_enabled;
}

export async function setAttendanceFeatureEnabled(isEnabled: boolean): Promise<AppSettings> {
  console.log(`[SettingsService] Setting attendance feature to: ${isEnabled}`);
  const settings = await getAppSettings();
  const updatedSettings: AppSettings = { ...settings, feature_attendance_enabled: isEnabled };
  await writeDb(SETTINGS_DB_PATH, updatedSettings);
  return updatedSettings;
}

export async function updateAttendanceSettings(newSettings: AttendanceSettings): Promise<AppSettings> {
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
