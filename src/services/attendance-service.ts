// src/services/attendance-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils';
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
  status: 'Present' | 'Absent' | 'Late';
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

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'attendance.json');

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
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  return attendanceRecords.find(r => r.userId === userId && r.date === todayStr) || null;
}

export async function checkIn(data: CheckInData): Promise<AttendanceRecord> {
  const settings = await getAppSettings();

  if (!data.location) {
    throw new Error("Lokasi tidak ditemukan. Pastikan GPS aktif dan berikan izin lokasi.");
  }
  
  const distance = getDistanceInMeters(
    data.location.latitude,
    data.location.longitude,
    settings.office_latitude,
    settings.office_longitude
  );

  if (distance > settings.attendance_radius_meters) {
    throw new Error(`Anda berada di luar radius kantor yang diizinkan (${Math.round(distance)}m > ${settings.attendance_radius_meters}m). Absensi gagal.`);
  }

  const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  const existingRecord = await getTodaysAttendance(data.userId);
  if (existingRecord) {
    throw new Error("Anda sudah melakukan check-in hari ini.");
  }

  const currentTime = format(now, 'HH:mm');
  const status = currentTime > settings.check_in_time ? 'Late' : 'Present';

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
  return newRecord;
}

export async function checkOut(userId: string, reason: 'Normal' | 'Survei' | 'Sidang' = 'Normal'): Promise<AttendanceRecord> {
  const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const recordIndex = attendanceRecords.findIndex(r => r.userId === userId && r.date === todayStr);

  if (recordIndex === -1) {
    throw new Error("Tidak bisa check-out. Anda belum check-in hari ini.");
  }
  
  const record = attendanceRecords[recordIndex];
  if (record.checkOutTime) {
    throw new Error("Anda sudah melakukan check-out hari ini.");
  }

  record.checkOutTime = new Date().toISOString();
  record.checkOutReason = reason;

  await writeDb(DB_PATH, attendanceRecords);
  
  if (reason === 'Survei' || reason === 'Sidang') {
      const message = `${record.displayName} telah check-out lebih awal untuk keperluan ${reason}.`;
      await notifyUsersByRole(['Owner', 'Admin Proyek'], message);
      console.log(`[AttendanceService] Notified Owner and Admin Proyek about early checkout for ${reason} by ${record.displayName}`);
  }

  return record;
}

export async function getAttendanceForUser(userId: string): Promise<AttendanceRecord[]> {
  const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  return attendanceRecords.filter(r => r.userId === userId);
}

export async function getMonthlyAttendanceReportData(month: number, year: number): Promise<AttendanceRecord[]> {
  const allRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  const monthStr = month.toString().padStart(2, '0');
  const yearStr = year.toString();
  
  return allRecords.filter(r => r.date.startsWith(`${yearStr}-${monthStr}`));
}
