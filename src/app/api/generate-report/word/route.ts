// src/app/api/generate-report/word/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { generateWordReport } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';
import type { Language } from '@/context/LanguageContext';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { completed, canceled, inProgress, monthName, year, chartImageDataUrl, language } = body as {
            completed: Project[];
            canceled: Project[];
            inProgress: Project[];
            monthName: string;
            year: string;
            chartImageDataUrl?: string;
            language?: Language; 
        };

        if (!completed || !canceled || !inProgress || !monthName || !year) {
            return NextResponse.json({ error: 'Missing required report data', details: 'Required fields for report generation are missing.' }, { status: 400 });
        }
        
        const wordBuffer = await generateWordReport(completed, canceled, inProgress, monthName, year, chartImageDataUrl, language || 'en');

        return new NextResponse(wordBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Monthly_Report_${monthName}_${year}.docx"`,
            },
        });

    } catch (error: any) {
        console.error('Error generating Word report (API Route):', error); // Log the full error on the server
        
        let errorMessage = 'An unexpected error occurred while generating the Word report.'; // Default user-friendly message

        if (error instanceof Error && error.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string' && error.trim() !== '') {
            errorMessage = error;
        } else if (error && typeof error.toString === 'function') {
            const errStr = error.toString();
            // Avoid using "[object Object]" or empty strings as the error message
            if (errStr !== '[object Object]' && errStr.trim() !== '') {
                errorMessage = errStr;
            }
        }
        
        // Ensure errorMessage is a non-empty string
        if (!errorMessage || errorMessage.trim() === '') {
             errorMessage = 'An unspecified error occurred on the server during Word report generation.';
        }
        
        return NextResponse.json({ error: 'Word Report Generation Failed', details: errorMessage }, { status: 500 });
    }
}
