
// src/app/api/generate-report/pdf/route.ts

import PdfPrinter from 'pdfmake';
// Import the core pdfMake library and VFS font data separately
import pdfMakeCore from 'pdfmake/build/pdfmake.js';
import vfsFonts from 'pdfmake/build/vfs_fonts.js';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import { NextResponse, type NextRequest } from 'next/server';
import { createPdfDocDefinition } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';

// Explicitly assign the VFS data to the pdfMake core library.
// This makes the virtual file system available globally for pdfmake internals.
if (pdfMakeCore && vfsFonts && vfsFonts.pdfMake && vfsFonts.pdfMake.vfs) {
    pdfMakeCore.vfs = vfsFonts.pdfMake.vfs;
} else {
    console.error("CRITICAL: pdfMakeCore.vfs could not be initialized. vfsFonts or pdfMakeCore is not loaded as expected.");
    // This indicates a fundamental issue with the pdfmake package structure or import.
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { completed, canceled, inProgress, monthName, year } = body as {
      completed: Project[];
      canceled: Project[];
      inProgress: Project[];
      monthName: string;
      year: string;
    };

    if (!completed || !canceled || !inProgress || !monthName || !year) {
      return NextResponse.json({ error: 'Missing required report data' }, { status: 400 });
    }

    // Use the vfs from the initialized pdfMakeCore
    const vfs = pdfMakeCore.vfs;

    if (!vfs || !vfs['Roboto-Regular.ttf']) {
        const errorMessage = "Font VFS data not found in pdfMakeCore.vfs. `pdfMakeCore.vfs` is not populated or Roboto-Regular.ttf is missing. Ensure 'pdfmake/build/vfs_fonts.js' is correctly processed.";
        console.error(errorMessage);
        if (vfs) {
            console.log('Available keys in pdfMakeCore.vfs:', Object.keys(vfs).slice(0, 10));
        } else {
            console.log('pdfMakeCore.vfs object itself is undefined.');
        }
        throw new Error(errorMessage);
    }

    const fonts: TFontDictionary = {
      Roboto: {
        normal: Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
        bold: Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
        italics: Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
        bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
      }
    };

    const printer = new PdfPrinter(fonts);
    const docDefinition = await createPdfDocDefinition(completed, canceled, inProgress, monthName, year);
    
    // Ensure defaultStyle exists and set the font
    if (!docDefinition.defaultStyle) {
        docDefinition.defaultStyle = {};
    }
    docDefinition.defaultStyle.font = 'Roboto';


    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
        pdfDoc.on('data', chunk => chunks.push(chunk as Buffer));
        pdfDoc.on('end', () => resolve());
        pdfDoc.on('error', err => {
            console.error('Error in PDF stream:', err);
            reject(err);
        });
        pdfDoc.end();
    });

    const pdfBytes = Buffer.concat(chunks);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Monthly_Report_${monthName}_${year}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF report in API route:', error);
    let detailMessage = 'An unexpected error occurred.';
    if (error.message) {
        detailMessage = error.message;
        if (error.message.includes('data.trie') || error.message.includes("Font VFS data not found")) {
            detailMessage = `Fontkit/VFS initialization error: ${error.message}. This often indicates an issue with font data handling in the server environment.`;
        }
    }
    if(error.cause){
        console.error("Error Cause:", error.cause);
        // Append cause to detailMessage if it provides more info
        detailMessage += ` Caused by: ${error.cause.message || String(error.cause)}`;
    }
    console.error("Full error stack:", error.stack);
    return NextResponse.json({ error: 'Failed to generate PDF report', details: detailMessage, stack: error.stack, cause: error.cause ? String(error.cause) : undefined }, { status: 500 });
  }
}

```