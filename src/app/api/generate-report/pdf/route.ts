// src/app/api/generate-report/pdf/route.ts
import { NextResponse } from 'next/server';
import PdfPrinter from 'pdfmake';
import pdfMakeLib from 'pdfmake/build/pdfmake.js'; // Import for VFS assignment
import pdfFonts from 'pdfmake/build/vfs_fonts.js';   // VFS data
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import { createPdfDocDefinition } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';

// Assign VFS to the pdfMake library instance
// This is the standard way to make fonts available to pdfMake
if (pdfMakeLib && pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMakeLib.vfs = pdfFonts.pdfMake.vfs;
} else {
  console.error("CRITICAL: pdfMake.vfs could not be populated from vfs_fonts.js. PDF generation will likely fail.");
  // Consider returning an error response immediately if VFS fails to load
}

// Font descriptors for PdfPrinter. These names must match those in the VFS.
// When using VFS, pdfmake looks up these font files (e.g., 'Roboto-Regular.ttf') from the pdfMakeLib.vfs object.
const printerFonts: TFontDictionary = {
  Roboto: { // This is the font family name you'll use in your document definition styles
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  }
};

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

    // Ensure VFS is loaded before proceeding, crucial for server environments
    if (!pdfMakeLib.vfs || Object.keys(pdfMakeLib.vfs).length === 0) {
        console.error("FATAL: pdfMake.vfs is not loaded or empty. Cannot generate PDF.");
        return NextResponse.json({ error: 'Internal Server Error', details: 'Font system not initialized for PDF generation.' }, { status: 500 });
    }


    const docDefinition = await createPdfDocDefinition(
        completed,
        canceled,
        inProgress,
        monthName,
        year,
        chartImageDataUrl
    );

    // Pass the font descriptors to PdfPrinter
    const printer = new PdfPrinter(printerFonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));
    
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

        pdfDoc.on('error', (streamError: Error) => {
            console.error('Error during PDF stream generation (pdfDoc.on(error)):', streamError);
            rejectPromise(new Error(`PDF stream error: ${streamError.message}`)); 
        });
        pdfDoc.end();
    }).catch(promiseError => {
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
