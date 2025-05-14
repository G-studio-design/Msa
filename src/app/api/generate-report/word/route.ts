// src/app/api/generate-report/word/route.ts
import { NextResponse } from 'next/server';
import { generateWordReport } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';
import type { Language } from '@/context/LanguageContext';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      reportData,
      monthName,
      year,
      language,
      chartImageDataUrl
    } = body;

    // Validasi input dasar, meskipun generateWordReport mungkin tidak menggunakan semuanya saat ini
    if (!reportData || typeof reportData.completed === 'undefined' || typeof reportData.inProgress === 'undefined' || typeof reportData.canceled === 'undefined' || !monthName || !year || !language) {
      console.error("[API/WordReport] Missing required report data components, month, year, or language.");
      return NextResponse.json({ error: "Missing required report data, month, year, or language." }, { status: 400 });
    }

    console.log("[API/WordReport] Received request to generate Word report for:", monthName, year, language);

    const buffer = await generateWordReport({
        reportData: reportData as { completed: Project[]; inProgress: Project[]; canceled: Project[]; },
        monthName,
        year,
        language: language as Language,
        chartImageDataUrl
    });

    console.log("[API/WordReport] Word report buffer generated, size:", buffer.length);

    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="monthly_report_${year}_${monthName.replace(/ /g, '_')}.docx"`);
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    return new Response(buffer, { headers });

  } catch (error: any) {
    console.error("[API/WordReport] Error generating Word report:", error);
    
    let detailMessage = "An unknown error occurred during Word report generation.";
    if (error instanceof Error) {
        detailMessage = error.message;
    } else if (typeof error === 'string') {
        detailMessage = error;
    }

    // Menyediakan pesan error yang lebih user-friendly, tetapi tetap log detail teknis
    let userFriendlyError = "The Word document could not be generated due to an internal error.";
    // Anda dapat menambahkan logika untuk memeriksa detailMessage untuk pesan spesifik jika diperlukan
    if (detailMessage && detailMessage.toLowerCase().includes("cannot read properties of undefined (reading 'children')")) {
        userFriendlyError = "The Word document could not be generated due to an internal structure error, possibly related to empty content sections. Please contact support or try again later.";
    } else if (detailMessage.includes("Failed to generate simplified Word document")) {
        userFriendlyError = "The Word document could not be generated even with a simplified structure. Please contact support.";
    }


    return NextResponse.json({
      error: "Word Document Structure Error", 
      details: `${userFriendlyError} Details: ${detailMessage}`
    }, { status: 500 });
  }
}
