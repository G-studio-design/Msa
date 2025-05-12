// src/app/api/generate-report/pdf/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createPdfDocDefinition } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';
import PdfPrinter from 'pdfmake';
import * as fs from 'fs'; // Use synchronous fs for vfs_fonts, or ensure it's bundled
import * as path from 'path';

// Define font files for pdfmake
// This is crucial for pdfmake to work correctly on the server.
// The vfs_fonts.js file provides the virtual file system for fonts.
// If this file is not correctly loaded or accessible, font errors will occur.
let vfsContent: string;
try {
    // Adjust path if necessary, depending on your project structure and where vfs_fonts.js is located
    // after build. For Next.js, it might be tricky to get the path right.
    // One common approach is to copy vfs_fonts.js to the public folder and read it from there,
    // or ensure it's bundled with the serverless function.
    // For simplicity in this example, we assume it's in the project root.
    // In a real app, you might need a more robust way to locate this file.
    const vfsPath = path.join(process.cwd(), 'node_modules', 'pdfmake', 'build', 'vfs_fonts.js');
    vfsContent = fs.readFileSync(vfsPath, 'utf-8');
} catch (error) {
    console.error("Critical Error: Could not load vfs_fonts.js. PDF generation will fail.", error);
    // Fallback or throw, depending on how critical PDF generation is
    vfsContent = "this.pdfMake = this.pdfMake || {}; this.pdfMake.vfs = {};"; // Empty VFS as a fallback
}

const vfs = new Function(`${vfsContent} return pdfMake.vfs;`)();


const fonts = {
    Roboto: {
        normal: Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
        bold: Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
        italics: Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
        bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
    },
};


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { completed, canceled, inProgress, monthName, year } = body as {
            completed: Project[];
            canceled: Project[];
            inProgress: Project[];
            monthName: string;
            year: string;
            // chartImageDataUrl?: string; // chartImageDataUrl is no longer expected here for now
        };

        if (!completed || !canceled || !inProgress || !monthName || !year) {
            return NextResponse.json({ error: 'Missing required report data' }, { status: 400 });
        }
        
        const printer = new PdfPrinter(fonts);

        // Create the PDF document definition using the shared function
        // No chartImageDataUrl is passed for now to simplify
        const docDefinition = await createPdfDocDefinition(completed, canceled, inProgress, monthName, year);

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        
        // Pipe the PDF document to a buffer
        const chunks: Uint8Array[] = [];
        await new Promise<void>((resolve, reject) => {
            pdfDoc.on('data', (chunk) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve());
            pdfDoc.on('error', (err) => {
                 console.error("Error during PDF stream processing:", err);
                 reject(err);
            });
            pdfDoc.end();
        });

        const pdfBuffer = Buffer.concat(chunks);

        // Return the PDF as a response
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Monthly_Report_${monthName}_${year}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error generating PDF (API Route):', error);
        // Log the full error for server-side debugging
        let errorMessage = 'Failed to generate PDF.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        return NextResponse.json({ error: 'PDF Generation Failed', details: errorMessage }, { status: 500 });
    }
}
