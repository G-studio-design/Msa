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
      // language, // Bahasa akan di-hardcode ke 'en' untuk pengujian
      chartImageDataUrl
    } = body;

    // Validasi input dasar yang minimal karena kita menguji versi sederhana report-generator
    if (
      !reportData || // Masih perlu reportData untuk struktur dasar, meskipun tidak semua field digunakan
      !monthName ||
      !year
    ) {
      console.error("[API/WordReport] Missing required components for report generation (even for simplified version).");
      return NextResponse.json({ error: "Missing required components for report generation." }, { status: 400 });
    }

    // PAKSA BAHASA INGGRIS UNTUK DEBUGGING
    const forcedLanguage: Language = 'en';
    console.log(`[API/WordReport] Received request for ultra-minimal report for:`, monthName, year, `. Forcing language to: ${forcedLanguage}`);

    // Memanggil generateWordReport dengan data yang ada, meskipun generateWordReport versi ultra-minimal akan mengabaikan sebagian besar.
    const buffer = await generateWordReport({
        reportData: reportData as { completed: Project[]; inProgress: Project[]; canceled: Project[]; },
        monthName,
        year,
        language: forcedLanguage, 
        chartImageDataUrl 
    });

    console.log("[API/WordReport] Word report buffer (ultra-minimal) generated, size:", buffer.length);

    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="ultra_minimal_report_${year}_${monthName.replace(/ /g, '_')}_${forcedLanguage}.docx"`);
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    return new Response(buffer, { headers });

  } catch (error: any) {
    console.error("[API/WordReport] Error generating Word report (ultra-minimal):", error);
    
    let detailMessage = "An unknown error occurred during Word report generation.";
    // Mengambil pesan error yang lebih spesifik jika ada
    if (error instanceof Error && error.message.startsWith("Failed to generate ultra-minimal Word document:")) {
        detailMessage = error.message; // Gunakan pesan error yang sudah diformat dari generateWordReport
    } else if (error instanceof Error) {
        detailMessage = error.message;
    } else if (typeof error === 'string') {
        detailMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        detailMessage = error.message;
    }

    let userFriendlyError = "The Word document could not be generated due to an internal error.";
    // Deteksi pesan kesalahan "children"
    if (detailMessage && detailMessage.toLowerCase().includes("cannot read properties of undefined (reading 'children')")) {
        userFriendlyError = "The Word document could not be generated due to an internal structure error, possibly related to empty content sections. Please contact support or try again later.";
    } else if (detailMessage.includes("Failed to generate ultra-minimal Word document")) {
        // Menambahkan penanganan untuk pesan error baru dari generateWordReport
        userFriendlyError = "The Word document could not be generated even with an ultra-minimal structure. Please contact support.";
    }

    return NextResponse.json({
      error: "Word Document Structure Error", 
      details: `${userFriendlyError} Details: ${detailMessage}`
    }, { status: 500 });
  }
}
