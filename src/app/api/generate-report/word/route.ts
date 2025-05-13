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
        
        let detailMessage = 'An unknown error occurred on the server during Word report generation.'; // Default

        if (error instanceof Error && error.message && error.message.trim() !== '') {
            detailMessage = error.message;
        } else if (typeof error === 'string' && error.trim() !== '') {
            detailMessage = error;
        } else {
            // Attempt to get a string representation if possible, avoiding "[object Object]"
            const errorAsString = String(error);
            if (errorAsString !== '[object Object]' && errorAsString.trim() !== '') {
                detailMessage = errorAsString;
            } else {
                 // If it's an object, try to stringify it for more details
                try {
                    const errorJsonString = JSON.stringify(error);
                    if (errorJsonString !== '{}' && errorJsonString.trim() !== '') {
                        detailMessage = `Server error object: ${errorJsonString}`;
                    }
                } catch (e) {
                    // Ignore stringify error, stick to the default message
                }
            }
        }
        
        // Ensure detailMessage is never an empty string for the response
        const finalDetailMessage = detailMessage.trim() === '' ? 'An unspecified error occurred on the server.' : detailMessage;

        return NextResponse.json(
            { 
                error: 'Word Report Generation Failed', 
                details: finalDetailMessage 
            }, 
            { status: 500 }
        );
    }
}
