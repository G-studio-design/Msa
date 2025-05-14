// src/app/api/generate-report/word/route.ts
import { NextResponse } from 'next/server';
import { generateWordReport } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';
import type { Language } from '@/context/LanguageContext';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      reportData, // { completed: Project[], inProgress: Project[], canceled: Project[] }
      monthName,  // string
      year,       // string
      language,   // Language ('en' | 'id')
      chartImageDataUrl // string | null (base64 data URI or null)
    } = body;

    if (!reportData || !reportData.completed || !reportData.inProgress || !reportData.canceled || !monthName || !year || !language) {
      return NextResponse.json({ error: "Missing required report data, month, year, or language." }, { status: 400 });
    }

    const buffer = await generateWordReport({
        reportData: reportData as { completed: Project[]; inProgress: Project[]; canceled: Project[]; },
        monthName,
        year,
        language: language as Language,
        chartImageDataUrl
    });

    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="monthly_report_${year}_${monthName.replace(/ /g, '_')}.docx"`);
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    return new Response(buffer, { headers });

  } catch (error: any) {
    console.error("[API/WordReport] Error generating Word report:", error);
    // Extract a more specific error message if available
    const detailMessage = error.message || "An unknown error occurred during Word report generation.";
    
    // It's crucial to understand if the error is from our logic or from `docx`
    // Often `docx` errors like "Cannot read properties of undefined (reading 'children')" point to structural issues.
    let userFriendlyError = "The Word document could not be generated due to an internal error.";
    if (error.message && error.message.toLowerCase().includes("cannot read properties of undefined (reading 'children')")) {
        userFriendlyError = "The Word document could not be generated due to an internal structure error, possibly related to empty content sections. Please contact support or try again later.";
    }


    return NextResponse.json({
      error: "Word Document Structure Error", // More specific error type
      details: `${userFriendlyError} Details: ${detailMessage}`
    }, { status: 500 });
  }
}
