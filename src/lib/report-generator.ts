// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import type { Language } from '@/context/LanguageContext';
// getDictionary dan fungsi terjemahan lain tidak lagi dibutuhkan untuk versi super sederhana ini

// Fungsi helper untuk memastikan teks tidak kosong, menggunakan non-breaking space jika iya.
// Ini penting agar TextRun tidak pernah dibuat dengan children undefined.
const ensureNonEmptyTextForRun = (text: string | null | undefined): string => {
    const trimmedText = text?.trim();
    return !trimmedText ? "\u00A0" : trimmedText; // Non-breaking space
};

export async function generateWordReport({
    reportData, // Tidak digunakan di versi super sederhana ini
    monthName,  // Tidak digunakan di versi super sederhana ini
    year,       // Tidak digunakan di versi super sederhana ini
    language,   // Tidak digunakan di versi super sederhana ini
    chartImageDataUrl, // Tidak digunakan di versi super sederhana ini
}: {
    reportData: { completed: Project[]; inProgress: Project[]; canceled: Project[]; };
    monthName: string;
    year: string;
    language: Language;
    chartImageDataUrl: string | null;
}): Promise<Buffer> {
    
    console.log("[generateWordReport] Attempting to generate an extremely simplified Word document.");

    try {
        const doc = new Document({
            creator: "Msarch App",
            title: ensureNonEmptyTextForRun(`Laporan Sangat Sederhana`),
            description: ensureNonEmptyTextForRun("Dokumen Word yang dibuat secara otomatis oleh Msarch App."),
            sections: [{
                // Header dan footer minimal atau dihilangkan untuk kesederhanaan
                headers: {
                    default: new Paragraph({ // Header paling dasar
                        children: [new TextRun(ensureNonEmptyTextForRun("Header Dokumen Sederhana"))],
                    }),
                },
                footers: {
                    default: new Paragraph({ // Footer paling dasar
                        children: [new TextRun(ensureNonEmptyTextForRun("Footer Dokumen Sederhana"))],
                    }),
                },
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: ensureNonEmptyTextForRun("Ini adalah dokumen Word yang sangat sederhana."),
                                bold: true,
                                size: 24, // Ukuran dalam half-points (12pt = 24)
                            }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun(ensureNonEmptyTextForRun("Baris ini untuk menguji pembuatan dokumen dasar.")),
                        ],
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        console.log("[generateWordReport] Simplified Word document packed successfully.");
        return buffer;

    } catch (error: any) {
        console.error("[generateWordReport] Critical error during simplified Word document generation:", error);
        // Pastikan error yang dilempar adalah objek Error
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate simplified Word document: ${errorMessage}`);
    }
}
