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
        chartImageDataUrl, 
        language = 'en' 
    } = body as {
        completed: Project[],
        canceled: Project[],
        inProgress: Project[],
        monthName: string,
        year: string,
        chartImageDataUrl?: string | null, 
        language?: Language
    };

    console.log(`[API/WordReport] Generating Word report for ${monthName} ${year}, Language: ${language}, Chart Provided: ${!!chartImageDataUrl}`);

    if (!completed || !canceled || !inProgress || !monthName || !year) {
      console.error("[API/WordReport] Missing required fields in request body.");
      const missingFields = [];
      if (!completed) missingFields.push('completed projects data');
      if (!canceled) missingFields.push('canceled projects data');
      if (!inProgress) missingFields.push('in-progress projects data');
      if (!monthName) missingFields.push('monthName');
      if (!year) missingFields.push('year');
      
      return NextResponse.json({ 
          error: 'Missing required fields', 
          details: `Please ensure all project data categories, month, and year are provided. Missing: ${missingFields.join(', ')}.` 
      }, { status: 400 });
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
    // Initialize errorDetails with a generic server error message.
    // This will be used if error.message is not helpful or specific.
    let errorDetails = 'An unexpected error occurred on the server.';

    if (error.message) {
        // If error.message contains specific keywords, provide more targeted user feedback.
        if (error.message.includes('Failed to pack Word document')) {
            errorMessage = 'Word Document Creation Error';
            // Use the error message itself as details if it's specific enough.
            errorDetails = `The server encountered an issue while assembling the Word file: ${error.message}`;
        } else if (error.message.includes('Error processing chart image')) {
            errorMessage = 'Chart Image Processing Error';
            errorDetails = `There was a problem including the chart image in the Word document: ${error.message}`;
        } else if (typeof error.message === 'string' && 
                   !error.message.toLowerCase().includes('<html') && // Avoid sending HTML error pages to client
                   error.message.trim().length > 0 && 
                   error.message.trim() !== '{}') {
            // For other errors, if error.message is a non-empty, non-HTML string, use it as details.
            // This is where "Cannot read properties of undefined (reading 'children')" will be captured.
            errorDetails = error.message.substring(0, 500); // Limit length to prevent overly long messages
        }
        // If error.message was not useful (e.g., empty, HTML, or '{}'), errorDetails remains the generic server error.
    }
    

    const errorResponsePayload = { 
        error: errorMessage,
        details: errorDetails // This will now correctly send the "Cannot read..." message if that's what error.message was
    };
    
    console.error(`[API/WordReport] Responding with error payload:`, JSON.stringify(errorResponsePayload));
    return NextResponse.json(errorResponsePayload, { status: 500 });
  }
}