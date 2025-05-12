// src/app/api/generate-report/pdf/route.ts
import { NextResponse } from 'next/server';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import { createPdfDocDefinition } from '@/lib/report-generator';
import type { Project } from '@/services/project-service';

// Define font files for pdfmake
// Ensure these paths are correct and files exist
// The require statements for vfs_fonts.js load the font data directly
const fonts: TFontDictionary = {
  Roboto: {
    normal: Buffer.from(require('pdfmake/build/vfs_fonts.js').pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(require('pdfmake/build/vfs_fonts.js').pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
    italics: Buffer.from(require('pdfmake/build/vfs_fonts.js').pdfMake.vfs['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(require('pdfmake/build/vfs_fonts.js').pdfMake.vfs['Roboto-MediumItalic.ttf'], 'base64'),
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
      return NextResponse.json({ error: 'Missing required report data' }, { status: 400 });
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
    
    return new Promise<NextResponse>((resolve, reject) => {
        pdfDoc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            const response = new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Monthly_Report_${monthName}_${year}.pdf"`,
                },
            });
            resolve(response);
        });

        pdfDoc.on('error', (err) => {
            console.error('Error generating PDF:', err);
            reject(NextResponse.json({ error: 'Failed to generate PDF report', details: err.message }, { status: 500 }));
        });
        pdfDoc.end();
    });

  } catch (error: any) {
    console.error('API Error generating PDF report:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
