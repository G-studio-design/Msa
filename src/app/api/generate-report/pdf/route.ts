// src/app/api/generate-report/pdf/route.ts

// Static import for side-effects:
// This ensures pdfMake.vfs is set when the module is loaded.
import 'pdfmake/build/vfs_fonts.js';
// Import PdfPrinter class
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import { NextResponse, type NextRequest } from 'next/server';
import { createPdfDocDefinition } from '@/lib/report-generator'; // Import the definition creator
import type { Project } from '@/services/project-service';


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

    // Access VFS data. After `import 'pdfmake/build/vfs_fonts.js'`,
    // pdfMake.vfs should be populated on the global `pdfMake` object.
    // In a Node.js environment, this might be `global.pdfMake.vfs` or `(globalThis as any).pdfMake.vfs`.
    const vfs = (globalThis as any)?.pdfMake?.vfs;

    if (!vfs || !vfs['Roboto-Regular.ttf']) {
        const errorMessage = "Font VFS data not found. `pdfMake.vfs` is not populated or Roboto-Regular.ttf is missing. Ensure 'pdfmake/build/vfs_fonts.js' is correctly processed and pdfMake is available in the global scope.";
        console.error(errorMessage);
        // Log available keys in vfs if vfs exists
        if (vfs) {
            console.log('Available keys in vfs:', Object.keys(vfs).slice(0, 10)); // Log first 10 keys
        } else {
            console.log('globalThis.pdfMake.vfs object itself is undefined.');
            if ((globalThis as any)?.pdfMake) {
                console.log('globalThis.pdfMake exists, keys:', Object.keys((globalThis as any).pdfMake));
            } else {
                console.log('globalThis.pdfMake does not exist.');
            }
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
        pdfDoc.on('data', chunk => chunks.push(chunk as Buffer)); // Ensure chunk is treated as Buffer
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
            console.error(detailMessage); // Log specific error type
        }
    }
     // Also log error.cause if it exists, as pdfmake errors can be nested.
    if(error.cause){
        console.error("Error Cause:", error.cause);
    }
    return NextResponse.json({ error: 'Failed to generate PDF report', details: detailMessage, stack: error.stack, cause: error.cause ? String(error.cause) : undefined }, { status: 500 });
  }
}
