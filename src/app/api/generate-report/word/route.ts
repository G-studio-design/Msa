// src/app/api/generate-report/word/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { generateWordReport } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { completed, canceled, inProgress, monthName, year, chartImageDataUrl } = body as {
            completed: Project[];
            canceled: Project[];
            inProgress: Project[];
            monthName: string;
            year: string;
            chartImageDataUrl?: string; 
        };

        if (!completed || !canceled || !inProgress || !monthName || !year) {
            return NextResponse.json({ error: 'Missing required report data' }, { status: 400 });
        }
        
        // Generate the Word document buffer
        const wordBuffer = await generateWordReport(completed, canceled, inProgress, monthName, year, chartImageDataUrl);

        // Return the Word document as a response
        return new NextResponse(wordBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Monthly_Report_${monthName}_${year}.docx"`,
            },
        });

    } catch (error: any) {
        console.error('Error generating Word report (API Route):', error);
        let errorMessage = 'Failed to generate Word report.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        return NextResponse.json({ error: 'Word Report Generation Failed', details: errorMessage }, { status: 500 });
    }
}
