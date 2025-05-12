// src/app/api/generate-report/pdf/route.ts
import { NextResponse } from 'next/server';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import { createPdfDocDefinition } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';

// Attempt to load vfs_fonts.js
// This is critical for pdfmake to work correctly with fonts.
let vfsFonts;
try {
    // Use require for vfs_fonts.js as it's typically a CommonJS module that populates pdfMake.vfs
    vfsFonts = require('pdfmake/build/vfs_fonts.js');
    if (!vfsFonts || !vfsFonts.pdfMake || !vfsFonts.pdfMake.vfs) {
        console.error("Critical: pdfmake/build/vfs_fonts.js loaded but pdfMake.vfs is not populated.");
        // This state will likely lead to errors later, caught by the main try-catch.
    }
} catch (e) {
    console.error("Critical: Failed to require pdfmake/build/vfs_fonts.js.", e);
    // PDF generation will likely fail if fonts aren't available.
}

// Define font dictionary for PdfPrinter
// Fallback to empty string for Buffer.from if vfs or font keys are missing to avoid undefined errors.
// PdfPrinter will later fail if font data is truly missing.
const fonts: TFontDictionary = {
  Roboto: {
    normal: Buffer.from(vfsFonts?.pdfMake?.vfs?.['Roboto-Regular.ttf'] || '', 'base64'),
    bold: Buffer.from(vfsFonts?.pdfMake?.vfs?.['Roboto-Medium.ttf'] || '', 'base64'),
    italics: Buffer.from(vfsFonts?.pdfMake?.vfs?.['Roboto-Italic.ttf'] || '', 'base64'),
    bolditalics: Buffer.from(vfsFonts?.pdfMake?.vfs?.['Roboto-MediumItalic.ttf'] || '', 'base64'),
  }
};

// Sanity check for font loading
if (typeof fonts.Roboto.normal === 'string' || fonts.Roboto.normal.length === 0) {
    console.warn("Warning: Roboto-Regular font buffer is empty or not a buffer. PDF generation might fail or use default fonts.");
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { completed, canceled, inProgress, monthName, year, chartImageDataUrl } = body as {
      completed: Project[];
      canceled: Project[];
      inProgress: Project[];
      monthName: string;
      year: string;
      chartImageDataUrl?: string;
    };

    if (!completed || !canceled || !inProgress || !monthName || !year) {
      return NextResponse.json({ error: 'Missing required report data', details: 'Ensure all project arrays, month, and year are provided.' }, { status: 400 });
    }

    const docDefinition = await createPdfDocDefinition(
        completed,
        canceled,
        inProgress,
        monthName,
        year,
        chartImageDataUrl
    );

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));
    
    // Wrap stream events in a promise for better error handling
    return await new Promise<NextResponse>((resolvePromise, rejectPromise) => {
        pdfDoc.on('end', () => {
            try {
                const pdfBuffer = Buffer.concat(chunks);
                const response = new NextResponse(pdfBuffer, {
                    status: 200,
                    headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="Monthly_Report_${monthName}_${year}.pdf"`,
                    },
                });
                resolvePromise(response);
            } catch (concatError: any) {
                console.error('Error during PDF Buffer.concat or NextResponse creation:', concatError);
                rejectPromise(new Error(`Buffer concatenation/response creation failed: ${concatError.message}`));
            }
        });

        pdfDoc.on('error', (streamError: Error) => { // Explicitly type streamError
            console.error('Error during PDF stream generation (pdfDoc.on(error)):', streamError);
            rejectPromise(new Error(`PDF stream error: ${streamError.message}`)); 
        });
        pdfDoc.end();
    }).catch(promiseError => {
        // This .catch() is for the new Promise created for stream handling
        console.error('Error in PDF stream promise chain:', promiseError);
        return NextResponse.json({ 
            error: 'Failed to process PDF stream', 
            details: (promiseError instanceof Error ? promiseError.message : String(promiseError)) 
        }, { status: 500 });
    });

  } catch (error: any) {
    console.error('API Route Error generating PDF report (outer catch):', error);
    let details = error.message || 'An unexpected error occurred.';
    if (error.stack) {
        details += `\nStack: ${error.stack}`;
    }
    return NextResponse.json({ error: 'Internal Server Error in API route', details: details }, { status: 500 });
  }
}
