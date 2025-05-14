// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType, PageNumber, SectionType, ExternalHyperlink, UnderlineType } from 'docx';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';

// --- Helper Functions ---

// Mengembalikan satu spasi non-breaking jika teks kosong setelah trim, jika tidak, kembalikan teks asli.
// Ini membantu memastikan TextRun memiliki konten yang valid untuk pustaka docx.
const ensureSingleSpaceIfEmpty = (text: any): string => {
    const str = String(text == null ? "" : text); // Menangani null/undefined menjadi ""
    return str.trim() === "" ? "\u00A0" : str; // Jika "" setelah trim, jadikan non-breaking space, jika tidak, teks asli.
};


function formatDateOnly(timestamp: string | undefined | null, lang: Language = 'en'): string {
    if (!timestamp) return "N/A";
    try {
        const locale = lang === 'id' ? IndonesianLocale : EnglishLocale;
        return format(parseISO(timestamp), 'PP', { locale });
    } catch (e) {
        console.error("[ReportGenerator] Error formatting date:", timestamp, e);
        return "Invalid Date";
    }
}

function getLastActivityDate(project: Project, lang: Language = 'en'): string {
    if (!project.workflowHistory || project.workflowHistory.length === 0) {
        return formatDateOnly(project.createdAt, lang);
    }
    const lastEntry = project.workflowHistory[project.workflowHistory.length - 1];
    return formatDateOnly(lastEntry?.timestamp, lang);
}

function getContributors(project: Project, reportDict: ReturnType<typeof getDictionary>['monthlyReportPage'] | undefined, currentLang: Language): string {
    const defaultNone = currentLang === 'id' ? "Tidak Ada Kontributor" : "No Contributors";
    if (!project.files || project.files.length === 0) {
        return reportDict?.none || defaultNone;
    }
    const contributors = [...new Set(project.files.map(f => f.uploadedBy || 'Unknown'))];
    return contributors.join(', ') || defaultNone;
}


function escapeCsvValue(value: string | number | undefined | null): string {
    if (value === undefined || value === null) {
        return '';
    }
    const strValue = String(value);
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        const escapedValue = strValue.replace(/"/g, '""');
        return `"${escapedValue}"`;
    }
    return strValue;
}

// --- Excel Report Generation Function ---

export async function generateExcelReport(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[],
    currentLanguage: Language = 'en'
): Promise<string> {
    console.log("[ReportGenerator/Excel] Starting Excel report generation...");
    const dict = getDictionary(currentLanguage);
    const reportDict = dict.monthlyReportPage;
    const dashboardStatusDict = dict.dashboardPage.status;

    const allProjects = [...inProgress, ...completed, ...canceled ];
    allProjects.sort((a, b) => {
        const statusOrderValue = (project: Project, inProgressList: Project[]) => {
            let currentStatus = project.status;
             if (inProgressList.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                currentStatus = 'In Progress';
            }
            if (currentStatus === 'In Progress') return 0;
            if (currentStatus === 'Completed') return 1;
            if (currentStatus === 'Canceled') return 2;
            return 3;
        };

        const orderA = statusOrderValue(a, inProgress);
        const orderB = statusOrderValue(b, inProgress);

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        try {
            const dateA = parseISO(a.createdAt).getTime();
            const dateB = parseISO(b.createdAt).getTime();
             return dateB - dateA;
        } catch (e) {
            console.warn("[ReportGenerator/ExcelSort] Error parsing date for sorting, falling back to title sort:", e);
            return a.title.localeCompare(b.title);
        }
    });

    const headers = [
        ensureSingleSpaceIfEmpty(reportDict.tableHeaderTitle),
        ensureSingleSpaceIfEmpty(reportDict.tableHeaderStatus),
        ensureSingleSpaceIfEmpty(reportDict.tableHeaderLastActivityDate),
        ensureSingleSpaceIfEmpty(reportDict.tableHeaderContributors),
        ensureSingleSpaceIfEmpty(currentLanguage === 'id' ? "Progres (%)" : "Progress (%)"),
        ensureSingleSpaceIfEmpty(currentLanguage === 'id' ? 'Dibuat Oleh' : "Created By"),
        ensureSingleSpaceIfEmpty(currentLanguage === 'id' ? 'Dibuat Pada' : "Created At")
    ];
    const rows = [headers.map(escapeCsvValue).join(',')];

    allProjects.forEach(project => {
        let displayStatus = project.status;
        if (inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
            displayStatus = 'In Progress';
        }
        const statusKey = displayStatus?.toLowerCase().replace(/ /g, '') as keyof typeof dashboardStatusDict;
        const translatedDisplayStatus = dashboardStatusDict[statusKey] || displayStatus;

        const row = [
            escapeCsvValue(project.title),
            escapeCsvValue(translatedDisplayStatus),
            escapeCsvValue(getLastActivityDate(project, currentLanguage)),
            escapeCsvValue(getContributors(project, reportDict, currentLanguage)),
            escapeCsvValue(project.progress),
            escapeCsvValue(project.createdBy),
            escapeCsvValue(formatDateOnly(project.createdAt, currentLanguage)),
        ];
        rows.push(row.join(','));
    });
    console.log("[ReportGenerator/Excel] Excel report data generated successfully.");
    return rows.join('\n');
}


// --- Word Document Generation Function ---
export async function generateWordReport(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[],
    monthName: string,
    year: string,
    chartImageDataUrl?: string | null, // Tetap ada untuk logika API, tapi tidak digunakan di sini untuk debugging
    currentLanguage: Language = 'en'
): Promise<Buffer> {
    console.log("[ReportGenerator/Word] Starting Word report generation with highly simplified structure...");
    const dict = getDictionary(currentLanguage);
    const reportDict = dict.monthlyReportPage;
    const locale = currentLanguage === 'id' ? IndonesianLocale : EnglishLocale;

    const childrenForSection: (Paragraph | Table)[] = [
        new Paragraph({
            children: [new TextRun(ensureSingleSpaceIfEmpty(String((reportDict?.title || "Monthly Project Report") + ` - ${monthName || "N/A"} ${year || "N/A"}`)))],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
            children: [new TextRun(ensureSingleSpaceIfEmpty(String(`${currentLanguage === 'id' ? 'Dibuat pada' : 'Generated on'}: ${format(new Date(), 'PPPPpppp', { locale })}`)))],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("\u00A0"))], spacing: {after: 100} }), 
        new Paragraph({
            children: [new TextRun(ensureSingleSpaceIfEmpty(String(currentLanguage === 'id' ? 'Ringkasan Proyek' : 'Project Summary')))],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 100, before: 100 }
        }),
        new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(`• ${reportDict?.totalProjects || "Total Projects Reviewed"}: ${(completed?.length || 0) + (canceled?.length || 0) + (inProgress?.length || 0)}`)))] }),
        new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(`  - ${reportDict?.inProgressProjectsShort || "In Progress"}: ${inProgress?.length || 0}`)))], indent: {left: 360} }),
        new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(`  - ${reportDict?.completedProjectsShort || "Completed"}: ${completed?.length || 0}`)))], indent: {left: 360} }),
        new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(`  - ${reportDict?.canceledProjectsShort || "Canceled"}: ${canceled?.length || 0}`)))], indent: {left: 360} }),
        new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("\u00A0"))], spacing: {after: 100} }), 
    ];
    
    // Bagian grafik sepenuhnya dinonaktifkan untuk debugging
    console.log("[ReportGenerator/Word] Chart image section entirely skipped for debugging.");


    // Selalu coba tambahkan tabel dengan data dummy untuk debugging
    childrenForSection.push(
        new Paragraph({
            children: [new TextRun(ensureSingleSpaceIfEmpty(String(currentLanguage === 'id' ? "Daftar Detail Proyek (Data Dummy)" : "Detailed Project List (Dummy Data)")))],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 100, before: 100 }
        })
    );

    const headerRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(reportDict?.tableHeaderTitle || "Project Title")))] })]}),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(reportDict?.tableHeaderStatus || "Status")))] })]}),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(reportDict?.tableHeaderLastActivityDate || "Last Activity")))] })]}),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(reportDict?.tableHeaderContributors || "Contributors")))] })]}),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(currentLanguage === 'id' ? 'Progres (%)' : 'Progress (%)')))], alignment: AlignmentType.CENTER })]}),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(currentLanguage === 'id' ? 'Dibuat Oleh' : 'Created By')))] })]}),
            new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty(String(currentLanguage === 'id' ? 'Dibuat Pada' : 'Created At')))] })]}),
        ],
        tableHeader: true,
    });
    
    const dummyDataRows: TableRow[] = [
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("Proyek Contoh 1"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("Selesai"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("12 Mei 2024"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("Pengguna A, Pengguna B"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("100"))], alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("Pemilik"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("01 Mei 2024"))] })] }),
            ],
        }),
        new TableRow({
             children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("Proyek Contoh 2"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("Sedang Berjalan"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("13 Mei 2024"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("Pengguna C"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("50"))], alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("Admin Umum"))] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("10 Mei 2024"))] })] }),
            ],
        })
    ];

    const table = new Table({
        rows: [headerRow, ...dummyDataRows],
        width: { size: 9020, type: WidthType.DXA }, // Ukuran standar kertas A4 landscape dalam DXA
        // columnWidths dan borders sengaja dihilangkan untuk penyederhanaan maksimal saat debugging
    });
    childrenForSection.push(table);
    console.log("[ReportGenerator/Word] Dummy project table (simplified) added to document sections.");


    childrenForSection.push(
        new Paragraph({ children: [new TextRun(ensureSingleSpaceIfEmpty("\u00A0"))], spacing: {after: 200} }) 
    );
     childrenForSection.push(
        new Paragraph({
            children: [
                new TextRun({ text: ensureSingleSpaceIfEmpty(String(currentLanguage === 'id' ? 'Dihasilkan oleh Msarch App' : 'Generated by Msarch App'))}),
            ],
            alignment: AlignmentType.RIGHT,
        })
    );

    const sections = [
        {
            properties: { // Properti section yang sangat dasar
                type: SectionType.NEXT_PAGE,
                 margin: { top: 720, right: 720, bottom: 720, left: 720 }, 
            },
            headers: { // Header yang sangat sederhana
                 default: new Paragraph({
                    children: [new TextRun(ensureSingleSpaceIfEmpty(String(currentLanguage === 'id' ? 'Laporan Bulanan - Msarch App' : 'Monthly Report - Msarch App')))],
                    alignment: AlignmentType.RIGHT,
                }),
            },
            footers: { // Footer yang sangat sederhana, tanpa PageNumber untuk sementara
                default: new Paragraph({
                    children: [
                        new TextRun(ensureSingleSpaceIfEmpty(String(currentLanguage === 'id' ? 'Halaman' : 'Page'))),
                        // PageNumber.CURRENT, // Sementara dihilangkan untuk debugging
                        // new TextRun(ensureSingleSpaceIfEmpty(String(currentLanguage === 'id' ? ' dari ' : ' of '))),
                        // PageNumber.TOTAL_PAGES, // Sementara dihilangkan untuk debugging
                    ],
                    alignment: AlignmentType.CENTER,
                }),
            },
            children: childrenForSection,
        },
    ];


    const doc = new Document({
        creator: "Msarch App",
        title: String((reportDict?.title || "Monthly Project Report") + ` - ${monthName || "N/A"} ${year || "N/A"}`),
        description: String(`Monthly project report for ${monthName || "N/A"} ${year || "N/A"} generated by Msarch App.`),
        sections: sections,
        // styles: undefined, // Semua gaya kustom dihilangkan untuk debugging
    });

    try {
        console.log("[ReportGenerator/Word] Attempting to pack Word document with highly simplified structure...");
        const buffer = await Packer.toBuffer(doc);
        console.log("[ReportGenerator/Word] Word document packed successfully (highly simplified).");
        return buffer;
    } catch (packError: any) {
        console.error('[ReportGenerator/Word] Error during Packer.toBuffer (highly simplified):', packError);
        if (packError.message && packError.message.includes("Cannot read properties of undefined (reading 'children')")) {
            console.error("[ReportGenerator/Word] Packer error (highly simplified) likely due to structural issue. Further isolation needed.");
        }
        if (packError.stack) {
            console.error('[ReportGenerator/Word] Packer.toBuffer (highly simplified) stack trace:', packError.stack);
        }
        throw packError; // Tetap lemparkan error agar API route bisa menangani
    }
}

