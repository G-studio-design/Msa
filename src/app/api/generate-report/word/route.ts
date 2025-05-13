
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
      return NextResponse.json({ error: 'Missing required fields', details: 'Please ensure all project data, month, and year are provided.' }, { status: 400 });
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
    // Ensure error.message is a string and not empty
    const errMessageString = (typeof error?.message === 'string' && error.message.trim() !== '') ? error.message.trim() : 'An unknown error occurred.';

    let errorMessage = 'Failed to generate Word report.'; // Default category of error
    let errorDetails = errMessageString;                  // Specifics of the error

    // Refine based on error type from generateWordReport or other sources
    if (errMessageString.includes('Failed to pack Word document')) {
        errorMessage = 'Word Document Packing Error';
        errorDetails = `The server encountered an issue while creating the Word file structure: ${errMessageString}`;
    } else if (errMessageString.includes('Error processing chart image')) {
        errorMessage = 'Chart Image Processing Error';
        errorDetails = `There was a problem including the chart image in the Word document: ${errMessageString}`;
    }
    // Add other specific error checks here if needed

    // Final detail message for client, avoiding technical jargon or overly long messages
    let finalDetailMessage = errorDetails;
    if (finalDetailMessage.toLowerCase().includes('<html')) { // Check if error detail contains HTML (like a Next.js error page)
        finalDetailMessage = "Server encountered an unexpected internal error. Please check server logs.";
    } else if (finalDetailMessage.trim() === '{}' || finalDetailMessage.trim() === '' || finalDetailMessage === 'An unknown error occurred.') { // Catch empty or overly generic details
        finalDetailMessage = "An unspecified error occurred on the server during Word report generation. Please check server logs for more details.";
    }


    const errorResponsePayload = { 
        error: errorMessage || "Report Generation Error", // Fallback
        details: finalDetailMessage || "No specific details available. Check server logs." // Fallback
    };
    
    console.error(`[API/WordReport] Responding with error. Original error:`, error); // Log the original error too for server-side debugging
    console.error(`[API/WordReport] Constructed error payload:`, JSON.stringify(errorResponsePayload));
    return NextResponse.json(errorResponsePayload, { status: 500 });
  }
}

