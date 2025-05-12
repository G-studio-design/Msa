// src/app/api/generate-report/pdf/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { generatePdfReport } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { completed, canceled, inProgress, monthName, year } = body as {
      completed: Project[];
      canceled: Project[];
      inProgress: Project[];
      monthName: string;
      year: string;
    };

    if (!completed || !canceled || !inProgress || !monthName || !year) {
      return NextResponse.json({ error: 'Missing required report data' }, { status: 400 });
    }

    const pdfBytes = await generatePdfReport(completed, canceled, inProgress, monthName, year);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Monthly_Report_${monthName}_${year}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json({ error: 'Failed to generate PDF report', details: error.message }, { status: 500 });
  }
}
