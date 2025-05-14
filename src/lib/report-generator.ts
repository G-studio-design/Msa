// src/lib/report-generator.ts
'use server';

import type { Project, WorkflowHistoryEntry } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType, PageNumber, SectionType, ExternalHyperlink, UnderlineType } from 'docx';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';

// --- Helper Functions ---

// Returns a non-breaking space if the text is empty after trimming, otherwise returns the original text.
// This helps ensure TextRun has valid content for the docx library.
const ensureSingleSpaceIfEmpty = (text: any): string => {
    const str = String(text == null ? "" : text); // Handle null/undefined to ""
    return str.trim() === "" ? "\u00A0" : str; // If "" after trim, make it a non-breaking space, else original text.
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
    chartImageDataUrl: string | null | undefined, // Still passed but not used in this minimal version
    currentLanguage: Language = 'en'
): Promise<Buffer> {
    console.log("[ReportGenerator/Word] Starting Word report generation with ABSOLUTE MINIMAL structure for debugging...");
    
    // Ensure childrenForSection always has at least one valid paragraph.
    const childrenForSection: Paragraph[] = [
        new Paragraph({
            children: [new TextRun(ensureSingleSpaceIfEmpty(`Dokumen Uji Minimal - ${monthName} ${year}`))],
            alignment: AlignmentType.CENTER,
        }),
    ];
    
    // If all data arrays are empty and chart is also unavailable, add a placeholder.
    // This is to ensure the section always has some content if everything else is skipped.
    if (completed.length === 0 && canceled.length === 0 && inProgress.length === 0 && !chartImageDataUrl) {
        childrenForSection.push(
             new Paragraph({
                children: [new TextRun(ensureSingleSpaceIfEmpty(currentLanguage === 'id' ? "Tidak ada data untuk dilaporkan." : "No data to report."))]
            })
        );
    }


    const sections = [{
        properties: { // Minimal section properties
            type: SectionType.NEXT_PAGE, // Using NEXT_PAGE is common for basic sections
            page: {
                margin: { top: 720, right: 720, bottom: 720, left: 720 }, // Standard 1-inch margins in DXA
            },
        },
        headers: { // Minimal header
            default: new Paragraph({
                children: [new TextRun(ensureSingleSpaceIfEmpty("Header Minimal"))],
                alignment: AlignmentType.RIGHT,
            }),
        },
        footers: { // Minimal footer
            default: new Paragraph({
                children: [new TextRun(ensureSingleSpaceIfEmpty("Footer Minimal"))],
                alignment: AlignmentType.CENTER,
            }),
        },
        children: childrenForSection.length > 0 ? childrenForSection : [new Paragraph({children: [new TextRun("\u00A0")]})], // Ensure children is never empty
    }];

    const doc = new Document({
        creator: "Msarch App - Debug Mode",
        title: `Laporan Minimal - ${monthName} ${year}`,
        description: `Laporan debug minimal untuk ${monthName} ${year}.`,
        sections: sections,
        // styles are completely removed for this debugging step
    });

    try {
        console.log("[ReportGenerator/Word] Attempting to pack Word document with ABSOLUTE MINIMAL structure...");
        const buffer = await Packer.toBuffer(doc);
        console.log("[ReportGenerator/Word] Word document (ABSOLUTE MINIMAL) packed successfully.");
        return buffer;
    } catch (packError: any) {
        console.error('[ReportGenerator/Word] Error during Packer.toBuffer (ABSOLUTE MINIMAL):', packError.message);
        if (packError.stack) {
            console.error('[ReportGenerator/Word] Packer.toBuffer (ABSOLUTE MINIMAL) stack trace:', packError.stack);
        }
        // Re-throw to be caught by API route and ensure proper error propagation
        throw new Error(`Failed to pack Word document (Packer Error): ${packError.message}`);
    }
}
