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
        
        console.log(`[API/WordReport] Generating Word report for ${monthName} ${year}, Language: ${language || 'en'}`);
        if (chartImageDataUrl) {
            console.log(`[API/WordReport] Chart image data URL provided (length: ${chartImageDataUrl.length})`);
        } else {
            console.log(`[API/WordReport] No chart image data URL provided.`);
        }

        const wordBuffer = await generateWordReport(completed, canceled, inProgress, monthName, year, chartImageDataUrl, language || 'en');
        
        console.log(`[API/WordReport] Word report generated successfully. Buffer size: ${wordBuffer.length}`);

        return new NextResponse(wordBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Monthly_Report_${monthName}_${year}.docx"`,
            },
        });

    } catch (error: any) {
        console.error('[API/WordReport] Error generating Word report:', error);
        if (error.stack) {
            console.error('[API/WordReport] Stack trace:', error.stack);
        }

        let detailMessage = 'An unknown error occurred on the server during Word report generation.';

        if (error instanceof Error && error.message && error.message.trim() !== '') {
            detailMessage = error.message;
        } else if (typeof error === 'string' && error.trim() !== '') {
            detailMessage = error;
        } else {
            const errorAsString = String(error);
            if (errorAsString !== '[object Object]' && errorAsString.trim() !== '') {
                detailMessage = errorAsString;
            } else {
                try {
                    const errorJsonString = JSON.stringify(error, Object.getOwnPropertyNames(error)); 
                    if (errorJsonString && errorJsonString.trim() !== '' && errorJsonString !== '{}') {
                        detailMessage = `Server error object: ${errorJsonString}`;
                    } else {
                        detailMessage = error.stack ? String(error.stack).split('\n')[0] : 'Undescribable server error.';
                    }
                } catch (e) {
                     detailMessage = error.stack ? String(error.stack).split('\n')[0] : 'Server error (stringify failed).';
                }
            }
        }
        
        let finalDetailMessage = detailMessage.trim() === '' ? 'An unspecified server error occurred.' : detailMessage;
        finalDetailMessage = String(finalDetailMessage || 'An unspecified error occurred.').replace(/[^\x20-\x7E]/g, '');
        if (!finalDetailMessage.trim()) {
            finalDetailMessage = 'Error details could not be processed or contained non-printable characters.';
        }

        const errorResponsePayload = { 
            error: 'Word Report Generation Failed', 
            details: finalDetailMessage 
        };
        // Log the exact payload being sent to NextResponse.json
        console.error(`[API/WordReport] Responding with error payload:`, JSON.stringify(errorResponsePayload));

        return NextResponse.json(errorResponsePayload, { status: 500 });
    }
}