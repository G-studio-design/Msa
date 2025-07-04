// src/app/api/generate-report/attendance/route.ts
'use server';

import { NextResponse } from 'next/server';
import { generateAttendanceWordReport } from '@/lib/attendance-report-generator';
import { getMonthlyAttendanceReportData } from '@/services/attendance-service';
import { getAllUsersForDisplay } from '@/services/user-service';
import { getApprovedLeaveRequests } from '@/services/leave-request-service';
import { getAllHolidays } from '@/services/holiday-service';
import type { Language } from '@/context/LanguageContext';

export async function POST(request: Request) {
  try {
    const { month, year, monthName, language } = await request.json() as {
        month: number;
        year: number;
        monthName: string;
        language: Language;
    };

    if (!month || !year || !monthName || !language) {
      return NextResponse.json({ error: "Missing required report parameters." }, { status: 400 });
    }

    const [records, users, leaves, holidays] = await Promise.all([
      getMonthlyAttendanceReportData(month, year),
      getAllUsersForDisplay(),
      getApprovedLeaveRequests(),
      getAllHolidays()
    ]);

    const buffer = await generateAttendanceWordReport({
        records,
        users,
        leaves,
        holidays,
        month,
        year,
        monthName,
        language
    });

    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="attendance_report_${year}_${monthName.replace(/ /g, '_')}.docx"`);
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    return new Response(buffer, { headers });

  } catch (error: any) {
    console.error("[API/AttendanceReport] Error generating Word report:", error);
    return NextResponse.json({
      error: "Word Document Generation Error",
      details: error.message || "An unknown error occurred."
    }, { status: 500 });
  }
}
