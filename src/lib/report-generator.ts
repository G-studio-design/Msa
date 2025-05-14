// src/lib/report-generator.ts
'use server';

import { Document, Packer, Paragraph, TextRun } from 'docx';
import type { Project } from '@/services/project-service';
import type { Language } from '@/context/LanguageContext';
// Fungsi atau impor lain yang tidak digunakan dalam versi super sederhana ini telah dihapus.

export async function generateWordReport({
    // Parameter berikut akan diabaikan untuk versi ultra-minimal ini
    reportData,
    monthName,
    year,
    language,
    chartImageDataUrl,
}: {
    reportData: { completed: Project[]; inProgress: Project[]; canceled: Project[]; };
    monthName: string;
    year: string;
    language: Language;
    chartImageDataUrl: string | null;
}): Promise<Buffer> {
    
    console.log("[generateWordReport] Attempting to generate an ULTRA-MINIMAL Word document.");

    try {
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        children: [
                            new TextRun("Dokumen Tes Minimal."),
                        ],
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        console.log("[generateWordReport] ULTRA-MINIMAL Word document packed successfully.");
        return buffer;

    } catch (error: any) {
        console.error("[generateWordReport] Critical error during ULTRA-MINIMAL Word document generation:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Melempar error baru agar bisa ditangkap oleh API route dengan pesan yang lebih spesifik
        throw new Error(`Failed to generate ultra-minimal Word document: ${errorMessage}`);
    }
}
