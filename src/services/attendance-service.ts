// src/services/attendance-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { format } from 'date-fns';
import { getAppSettings } from './settings-service';
import { notifyUsersByRole } from './notification-service';

export interface AttendanceRecord {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // ISO string
  checkOutTime?: string; // ISO string
  checkOutReason?: 'Normal' | 'Survei' | 'Sidang';
  status: 'Present' | 'Late';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CheckInData {
  userId: string;
  username: string;
  displayName: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CheckInResult {
  record?: AttendanceRecord;
  error?: string;
}

export interface CheckOutResult {
  record?: AttendanceRecord;
  error?: string;
}

async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
    try {
        await fs.access(dbPath);
        const data = await fs.readFile(dbPath, 'utf8');
        if (data.trim() === "") {
            return defaultData;
        }
        return JSON.parse(data) as T;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
          return defaultData;
        }
        console.error(`[DB Read Error] Error reading or parsing database at ${path.basename(dbPath)}.`, error);
        return defaultData;
    }
}

async function writeDb<T>(dbPath: string, data: T): Promise<void> {
    const dbDir = path.dirname(dbPath);
    await fs.mkdir(dbDir, { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

// Helper function to calculate distance between two lat/lon points in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}


export async function getTodaysAttendance(userId: string): Promise<AttendanceRecord | null> {
  const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'attendance.json');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  return attendanceRecords.find(r => r.userId === userId && r.date === todayStr) || null;
}

export async function getTodaysAttendanceForAllUsers(): Promise<AttendanceRecord[]> {
  const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'attendance.json');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const allRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  return allRecords.filter(r => r.date === todayStr);
}

export async function checkIn(data: CheckInData): Promise<CheckInResult> {
  const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'attendance.json');
  try {
    const settings = await getAppSettings();

    if (!data.location) {
      return { error: "Lokasi tidak ditemukan. Pastikan GPS aktif dan berikan izin lokasi." };
    }
    
    const distance = getDistanceInMeters(
      data.location.latitude,
      data.location.longitude,
      settings.office_latitude,
      settings.office_longitude
    );

    if (distance > settings.attendance_radius_meters) {
      return { error: `Anda berada di luar radius kantor yang diizinkan (${Math.round(distance)}m > ${settings.attendance_radius_meters}m). Absensi gagal.` };
    }

    const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    const existingRecord = attendanceRecords.find(r => r.userId === data.userId && r.date === todayStr);
    if (existingRecord) {
      return { error: "Anda sudah melakukan check-in hari ini." };
    }

    const dayOfWeek = format(now, 'eeee').toLowerCase() as keyof typeof settings.workingHours;
    const checkInTime = settings.workingHours[dayOfWeek]?.checkIn || "09:00";

    const currentTime = format(now, 'HH:mm');
    const status = currentTime > checkInTime ? 'Late' : 'Present';

    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}_${data.userId.slice(-4)}`,
      userId: data.userId,
      username: data.username,
      displayName: data.displayName,
      date: todayStr,
      checkInTime: now.toISOString(),
      status: status,
      location: data.location,
    };

    attendanceRecords.push(newRecord);
    await writeDb(DB_PATH, attendanceRecords);
    return { record: newRecord };
  } catch (e: any) {
    console.error("[AttendanceService/checkIn] Unexpected error:", e);
    return { error: "Terjadi kesalahan tak terduga di server saat check-in." };
  }
}

export async function checkOut(userId: string, reason: 'Normal' | 'Survei' | 'Sidang' = 'Normal'): Promise<CheckOutResult> {
  const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'attendance.json');
  try {
    const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const recordIndex = attendanceRecords.findIndex(r => r.userId === userId && r.date === todayStr);

    if (recordIndex === -1) {
      return { error: "Tidak bisa check-out. Anda belum check-in hari ini." };
    }
    
    const record = attendanceRecords[recordIndex];
    if (record.checkOutTime) {
      return { error: "Anda sudah melakukan check-out hari ini." };
    }

    record.checkOutTime = new Date().toISOString();
    record.checkOutReason = reason;

    await writeDb(DB_PATH, attendanceRecords);
    
    if (reason === 'Survei' || reason === 'Sidang') {
        const message = `${record.displayName} telah check-out lebih awal untuk keperluan ${reason}.`;
        await notifyUsersByRole(['Owner', 'Admin Proyek'], message);
        console.log(`[AttendanceService] Notified Owner and Admin Proyek about early checkout for ${reason} by ${record.displayName}`);
    }

    return { record };
  } catch (e: any) {
    console.error("[AttendanceService/checkOut] Unexpected error:", e);
    return { error: "Terjadi kesalahan tak terduga di server saat check-out." };
  }
}


export async function getAttendanceForUser(userId: string): Promise<AttendanceRecord[]> {
  const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'attendance.json');
  const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  return attendanceRecords.filter(r => r.userId === userId);
}

export async function getMonthlyAttendanceReportData(month: number, year: number): Promise<AttendanceRecord[]> {
  const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'attendance.json');
  const allRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  const monthStr = month.toString().padStart(2, '0');
  const yearStr = year.toString();
  
  return allRecords.filter(r => r.date.startsWith(`${yearStr}-${monthStr}`));
}
