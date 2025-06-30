// src/services/attendance-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils';
import { format, startOfDay } from 'date-fns';

export interface AttendanceRecord {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // ISO string
  checkOutTime?: string; // ISO string
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
const CHECK_IN_DEADLINE = "09:00"; // 9:00 AM

export async function getTodaysAttendance(userId: string): Promise<AttendanceRecord | null> {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  return attendanceRecords.find(r => r.userId === userId && r.date === todayStr) || null;
}

export async function checkIn(data: CheckInData): Promise<AttendanceRecord> {
  const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  const existingRecord = await getTodaysAttendance(data.userId);
  if (existingRecord) {
    throw new Error("User has already checked in today.");
  }

  const currentTime = format(now, 'HH:mm');
  const status = currentTime > CHECK_IN_DEADLINE ? 'Late' : 'Present';

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

export async function checkOut(userId: string): Promise<AttendanceRecord> {
  const attendanceRecords = await readDb<AttendanceRecord[]>(DB_PATH, []);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const recordIndex = attendanceRecords.findIndex(r => r.userId === userId && r.date === todayStr);

  if (recordIndex === -1) {
    throw new Error("Cannot check out. User has not checked in today.");
  }
  
  if (attendanceRecords[recordIndex].checkOutTime) {
    throw new Error("User has already checked out today.");
  }

  attendanceRecords[recordIndex].checkOutTime = new Date().toISOString();
  await writeDb(DB_PATH, attendanceRecords);
  return attendanceRecords[recordIndex];
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
