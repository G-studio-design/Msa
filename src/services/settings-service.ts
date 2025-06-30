// src/services/settings-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils';

interface AppSettings {
  feature_attendance_enabled: boolean;
}

const SETTINGS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'app_settings.json');
const DEFAULT_SETTINGS: AppSettings = {
  feature_attendance_enabled: false,
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
