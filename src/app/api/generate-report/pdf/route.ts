// src/app/api/generate-report/pdf/route.ts

// Static import for side-effects:
// This ensures pdfMake.vfs is set when the module is loaded, making it available
// globally for any PdfPrinter instances or internal pdfmake operations.
import 'pdfmake/build/vfs_fonts.js';

import PdfPrinter from 'pdfmake'; // Import PdfPrinter class
import { NextResponse, type NextRequest } from 'next/server';
import { createPdfDocDefinition } from '@/lib/report-generator'; // Import the definition creator
import type { Project } from '@/services/project-service';
import type { TFontDictionary } from 'pdfmake/interfaces';

// Store the VFS data once, globally for this module, to avoid re-importing repeatedly.
let vfsDataInstance: any = null;

async function getInitializedVfsData() {
    if (!vfsDataInstance) {
        // Dynamically import to get the vfs object containing font data.
        // The global side-effect of setting pdfMake.vfs should have already occurred
        // due to the static import 'pdfmake/build/vfs_fonts.js' at the top of this file.
        // This function now primarily serves to access the vfs data for creating font buffers.
        const vfsModule = await import('pdfmake/build/vfs_fonts.js');
        vfsDataInstance = vfsModule.pdfMake.vfs;
    }
    return vfsDataInstance;
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

    // Get VFS data for creating font buffers
    const vfs = await getInitializedVfsData();

    const fonts: TFontDictionary = {
      Roboto: {
        normal: Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
        bold: Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
        italics: Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
        bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
      }
    };

    const printer = new PdfPrinter(fonts);
    // Await the call to createPdfDocDefinition as it's async
    const docDefinition = await createPdfDocDefinition(completed, canceled, inProgress, monthName, year);
    
    // Explicitly set defaultStyle font if not already in createPdfDocDefinition
    if (!docDefinition.defaultStyle) {
        docDefinition.defaultStyle = {};
    }
    docDefinition.defaultStyle.font = 'Roboto';


    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
        pdfDoc.on('data', chunk => chunks.push(chunk));
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
        if (error.message.includes('data.trie')) {
            detailMessage = "Fontkit 'data.trie' error. This indicates an issue with font data handling in the server environment. Ensure 'vfs_fonts.js' is correctly processed.";
            console.error(detailMessage); // Log specific error type
        }
    }
    return NextResponse.json({ error: 'Failed to generate PDF report', details: detailMessage, stack: error.stack }, { status: 500 });
  }
}