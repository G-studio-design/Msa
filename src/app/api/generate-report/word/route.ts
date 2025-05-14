
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
        completed = [], // Default to empty array
        canceled = [],  // Default to empty array
        inProgress = [], // Default to empty array
        monthName,
        year,
        chartImageDataUrl, 
        language = 'en' 
    } = body as {
        completed?: Project[], // Make them optional for initial parsing
        canceled?: Project[],
        inProgress?: Project[],
        monthName: string,
        year: string,
        chartImageDataUrl?: string | null, 
        language?: Language
    };

    console.log(`[API/WordReport] Generating Word report for ${monthName} ${year}, Language: ${language}, Chart Provided: ${!!chartImageDataUrl}`);

    if (!monthName || !year) {
      console.error("[API/WordReport] Missing monthName or year in request body.");
      return NextResponse.json({ 
          error: 'Missing Report Period', 
          details: 'Please ensure month and year for the report are provided.' 
      }, { status: 400 });
    }
    
    // Ensure project data arrays are indeed arrays after potential defaults
    if (!Array.isArray(completed) || !Array.isArray(canceled) || !Array.isArray(inProgress)) {
        console.error("[API/WordReport] Project data (completed, canceled, or inProgress) is not an array after parsing.");
        return NextResponse.json({ 
            error: 'Invalid Project Data Structure', 
            details: 'Project data categories (completed, canceled, inProgress) must be arrays.' 
        }, { status: 400 });
    }
    
    if (completed.length === 0 && canceled.length === 0 && inProgress.length === 0 && !chartImageDataUrl) {
        console.log("[API/WordReport] No project data and no chart to generate. Sending minimal report.");
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
    console.error("[API/WordReport] Error generating Word report:", error);
    let errorMessage = 'Failed to generate Word report.';
    
    // Ensure originalErrorMessage is a string and get the most specific message.
    const originalErrorMessage = typeof error?.message === 'string' ? error.message : 
                                 error instanceof Error ? error.toString() : 
                                 'Internal error during Word generation.';

    let errorDetails = originalErrorMessage; // Default to the original message

    if (originalErrorMessage.includes("Cannot read properties of undefined (reading 'children')")) {
        errorMessage = 'Word Document Structure Error';
        errorDetails = `The Word document could not be generated due to an internal structure error, possibly related to empty content sections. Please contact support or try again later. Details: ${originalErrorMessage}`;
    } else if (originalErrorMessage.includes('Failed to pack Word document')) {
        errorMessage = 'Word Document Creation Error';
        // errorDetails is already originalErrorMessage
    } else if (originalErrorMessage.includes('Error processing chart image')) {
        errorMessage = 'Chart Image Processing Error';
        // errorDetails is already originalErrorMessage
    } else {
        // More robust generic fallback
        if (originalErrorMessage.trim().length > 0 && !originalErrorMessage.toLowerCase().includes('<html')) {
           errorDetails = originalErrorMessage.substring(0, 500); // Limit length
       } else if (originalErrorMessage.toLowerCase().includes('<html')) {
           errorDetails = 'Server returned an HTML error page instead of a Word document. Check server logs for details.';
       } else {
           errorDetails = 'An unspecified error occurred during Word document generation.';
       }
    }
    
    const errorResponsePayload = { 
        error: errorMessage,
        details: errorDetails 
    };
    
    console.error(`[API/WordReport] Responding with error payload:`, JSON.stringify(errorResponsePayload));
    return NextResponse.json(errorResponsePayload, { status: 500 });
  }
}
