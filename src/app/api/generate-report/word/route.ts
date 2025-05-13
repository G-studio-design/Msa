// src/app/api/generate-report/word/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { generateWordReport } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';
import type { Language } from '@/context/LanguageContext';

export async function POST(req: NextRequest) {
  console.log("[API/WordReport] Received request to generate Word report.");
  try {
    const body = await req.json();
    const {
        completed,
        canceled,
        inProgress,
        monthName,
        year,
        chartImageDataUrl, // Expect this from the client
        language = 'en' // Default to English if not provided
    } = body as {
        completed: Project[],
        canceled: Project[],
        inProgress: Project[],
        monthName: string,
        year: string,
        chartImageDataUrl?: string,
        language?: Language
    };

    console.log(`[API/WordReport] Generating Word report for ${monthName} ${year}, Language: ${language}, Chart Provided: ${!!chartImageDataUrl}`);

    if (!completed || !canceled || !inProgress || !monthName || !year) {
      console.error("[API/WordReport] Missing required fields in request body.");
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = await generateWordReport(completed, canceled, inProgress, monthName, year, chartImageDataUrl, language);
    console.log("[API/WordReport] Word report buffer generated successfully.");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="MsarchApp_Monthly_Report_${monthName}_${year}.docx"`,
      },
    });
  } catch (error: any) {
    let errorMessage = 'Failed to generate Word report.';
    let errorDetails = error.message || 'Unknown error';

    if (error.message && error.message.includes('Failed to pack Word document')) {
        errorMessage = 'Word Document Packing Error';
        errorDetails = `The server encountered an issue while creating the Word file structure: ${error.message}`;
    } else if (error.message && error.message.includes('Error processing chart image')) {
        errorMessage = 'Chart Image Processing Error';
        errorDetails = `There was a problem including the chart image in the Word document: ${error.message}`;
    }

    console.error('[API/WordReport] Error generating Word report:', error);
    if (error.stack) {
        console.error('[API/WordReport] Stack trace:', error.stack);
    }
    
    // Determine a final detail message for the client
    let finalDetailMessage = errorDetails;
    if (errorDetails.toLowerCase().includes('html')) { // If the error detail itself contains HTML (like a Next.js error page)
        finalDetailMessage = "Server encountered an unexpected internal error while generating the report.";
    } else if (errorDetails.trim() === '{}' || errorDetails.trim() === '') { // Catch empty or {} details
        finalDetailMessage = "An unspecified error occurred on the server during Word report generation.";
    }


    const errorResponsePayload = { 
        error: errorMessage, 
        details: finalDetailMessage 
    };
    console.error(`[API/WordReport] Responding with error payload:`, JSON.stringify(errorResponsePayload));
    return NextResponse.json(errorResponsePayload, { status: 500 });
  }
}
