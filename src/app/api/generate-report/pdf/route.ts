// src/app/api/generate-report/pdf/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createPdfDocDefinition } from '@/lib/report-generator'; // Import the definition creator
import type { Project } from '@/services/project-service';
import PdfPrinter from 'pdfmake';
import type { TFontDictionary } from 'pdfmake/interfaces';

// Define fonts for pdfmake
// It's important to load vfs_fonts.js correctly for server-side usage.
// This dynamic import helps ensure it's loaded in the Node.js environment of the API route.
async function getPdfMakeVfs() {
  const vfs = await import('pdfmake/build/vfs_fonts.js');
  return vfs.pdfMake.vfs;
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

    const vfs = await getPdfMakeVfs();

    const fonts: TFontDictionary = {
      Roboto: { // Ensure this font key matches what's used in docDefinition.defaultStyle.font
        normal: Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
        bold: Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
        italics: Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
        bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
      }
    };

    const printer = new PdfPrinter(fonts);
    // Await the call to createPdfDocDefinition as it's now async
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
        pdfDoc.on('error', err => reject(err));
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
    // Check if the error is from fontkit trying to access data.trie
    if (error.message && error.message.includes('data.trie')) {
        console.error("Fontkit 'data.trie' error. This might indicate an issue with how pdfmake or its dependencies handle font data in this environment.");
    }
    return NextResponse.json({ error: 'Failed to generate PDF report', details: error.message, stack: error.stack }, { status: 500 });
  }
}
