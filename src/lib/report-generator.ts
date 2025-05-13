// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale'; // Import locales
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType } from 'docx';
import type { Language } from '@/context/LanguageContext'; // Import Language type
import { getDictionary } from '@/lib/translations'; // Import dictionary

// --- Helper Functions (can be used by both Excel and Word generation) ---

function formatDateOnly(timestamp: string, lang: Language = 'en'): string {
    if (!timestamp) return "N/A";
    try {
        const locale = lang === 'id' ? IndonesianLocale : EnglishLocale;
        return format(parseISO(timestamp), 'PP', { locale }); // e.g., Sep 29, 2023 or 29 Sep 2023
    } catch (e) {
        console.error("Error formatting date:", timestamp, e);
        return "Invalid Date";
    }
}

function getLastActivityDate(project: Project, lang: Language = 'en'): string {
    if (!project.workflowHistory || project.workflowHistory.length === 0) {
        return formatDateOnly(project.createdAt, lang);
    }
    const lastEntry = project.workflowHistory[project.workflowHistory.length - 1];
    return formatDateOnly(lastEntry.timestamp, lang);
}

function getContributors(project: Project, dict: ReturnType<typeof getDictionary>['monthlyReportPage']): string {
    if (!project.files || project.files.length === 0) {
        return dict.none || (lang === 'id' ? "Tidak Ada" : "None");
    }
    const contributors = [...new Set(project.files.map(f => f.uploadedBy))];
    return contributors.join(', ');
}
let lang: Language = 'en'; // Define lang at a broader scope if it's used by getContributors

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
    currentLanguage: Language = 'en' // Renamed parameter to avoid conflict with global lang
): Promise<string> {
    lang = currentLanguage; // Set global lang for helpers
    const dict = getDictionary(lang); 
    const reportDict = dict.monthlyReportPage;

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
        const dateA = new Date(getLastActivityDate(a, lang) === "Invalid Date" || getLastActivityDate(a, lang) === "N/A" ? 0 : getLastActivityDate(a, lang)).getTime();
        const dateB = new Date(getLastActivityDate(b, lang) === "Invalid Date" || getLastActivityDate(b, lang) === "N/A" ? 0 : getLastActivityDate(b, lang)).getTime();
        return dateB - dateA;
    });

    const headers = [
        reportDict.tableHeaderTitle,
        reportDict.tableHeaderStatus,
        reportDict.tableHeaderLastActivityDate,
        reportDict.tableHeaderContributors,
        lang === 'id' ? "Progres (%)" : "Progress (%)", 
        dict.projectsPage.uploadedByOn.split(" ")[lang === 'id' ? 2 : 2],
        lang === 'id' ? 'Dibuat Pada' : "Created At" 
    ];
    const rows = [headers.map(escapeCsvValue).join(',')];

    allProjects.forEach(project => {
        let displayStatus = project.status;
        if (inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
            displayStatus = 'In Progress';
        }
        const translatedDisplayStatus = (dict.dashboardPage.status as any)[displayStatus.toLowerCase().replace(/ /g, '')] || displayStatus;


        const row = [
            escapeCsvValue(project.title),
            escapeCsvValue(translatedDisplayStatus),
            escapeCsvValue(getLastActivityDate(project, lang)),
            escapeCsvValue(getContributors(project, reportDict)),
            escapeCsvValue(project.progress),
            escapeCsvValue(project.createdBy),
            escapeCsvValue(formatDateOnly(project.createdAt, lang)),
        ];
        rows.push(row.join(','));
    });

    return rows.join('\n');
}

// --- Word Document Generation Function ---
export async function generateWordReport(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[],
    monthName: string,
    year: string,
    chartImageDataUrl?: string,
    currentLanguage: Language = 'en'
): Promise<Buffer> {
    lang = currentLanguage; // Set global lang for helpers
    const dict = getDictionary(lang);
    const reportDict = dict.monthlyReportPage;
    const dashboardStatusDict = dict.dashboardPage.status;

    const allProjectsForWord = [...inProgress, ...completed, ...canceled];
     allProjectsForWord.sort((a, b) => {
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

        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const sections = [
        {
            properties: {},
            children: [
                new Paragraph({
                    text: `${reportDict.title} - ${monthName} ${year}`,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: `${lang === 'id' ? 'Dibuat pada' : 'Generated on'}: ${format(new Date(), 'PPpp', { locale: lang === 'id' ? IndonesianLocale : EnglishLocale })}`,
                    style: "SubheaderStyle",
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: `${lang === 'id' ? 'Ringkasan' : 'Summary'}:`,
                    heading: HeadingLevel.HEADING_1,
                    style: "SectionHeaderStyle",
                }),
                new Paragraph({ text: `  • ${reportDict.totalProjects}: ${completed.length + canceled.length + inProgress.length}`, style: "SummaryTextStyle" }),
                new Paragraph({ text: `    - ${reportDict.inProgressProjectsShort}: ${inProgress.length}`, style: "SummaryTextStyle" }),
                new Paragraph({ text: `    - ${reportDict.completedProjectsShort}: ${completed.length}`, style: "SummaryTextStyle" }),
                new Paragraph({ text: `    - ${reportDict.canceledProjectsShort}: ${canceled.length}`, style: "SummaryTextStyle" }),
                new Paragraph({ text: "" }), 
            ],
        },
    ];

    if (chartImageDataUrl) {
        try {
            const imageBuffer = Buffer.from(chartImageDataUrl.split(',')[1], 'base64');
            sections[0].children.push(
                new Paragraph({
                    text: lang === 'id' ? "Gambaran Status Proyek:" : "Project Status Overview:",
                    heading: HeadingLevel.HEADING_1,
                    style: "SectionHeaderStyle",
                }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: 500, 
                                height: 250,
                            },
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" }) 
            );
        } catch (error) {
            console.error("Error processing chart image for Word report:", error);
            sections[0].children.push(new Paragraph({ text: lang === 'id' ? "Kesalahan: Gambar grafik tidak dapat dimuat." : "Error: Chart image could not be loaded.", style: "ErrorTextStyle"}));
        }
    }


    if (allProjectsForWord.length > 0) {
        sections[0].children.push(
            new Paragraph({
                text: lang === 'id' ? "Daftar Detail Semua Proyek:" : "All Projects Detailed List:",
                heading: HeadingLevel.HEADING_1,
                style: "SectionHeaderStyle",
            })
        );

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderTitle, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }), // Darker Blue
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderStatus, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderLastActivityDate, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderContributors, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: lang === 'id' ? 'Progres (%)' : 'Progress (%)', style: "TableHeaderStyle", alignment: AlignmentType.RIGHT })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: lang === 'id' ? 'Dibuat Oleh' : 'Created By', style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: lang === 'id' ? 'Dibuat Pada' : 'Created At', style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
            ],
            tableHeader: true,
        });

        const dataRows = allProjectsForWord.map((project, index) => {
            let displayStatus = project.status;
            if (inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                displayStatus = 'In Progress';
            }
            const translatedDisplayStatus = (dashboardStatusDict as any)[displayStatus.toLowerCase().replace(/ /g, '')] || displayStatus;
            
            const cellShading = index % 2 === 0 ? undefined : { type: ShadingType.SOLID, fill: "DCE6F1" }; // Light Blue for Zebra

            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: project.title, style: "TableCellStyle"})], shading: cellShading }),
                    new TableCell({ children: [new Paragraph({ text: translatedDisplayStatus, style: "TableCellStyle"})], shading: cellShading }),
                    new TableCell({ children: [new Paragraph({ text: getLastActivityDate(project, lang), style: "TableCellStyle"})], shading: cellShading }),
                    new TableCell({ children: [new Paragraph({ text: getContributors(project, reportDict), style: "TableCellStyle"})], shading: cellShading }),
                    new TableCell({ children: [new Paragraph({ text: project.progress.toString(), alignment: AlignmentType.RIGHT, style: "TableCellStyle"})], shading: cellShading }),
                    new TableCell({ children: [new Paragraph({ text: project.createdBy, style: "TableCellStyle"})], shading: cellShading }),
                    new TableCell({ children: [new Paragraph({ text: formatDateOnly(project.createdAt, lang), style: "TableCellStyle"})], shading: cellShading }),
                ],
            });
        });

        const table = new Table({
            rows: [headerRow, ...dataRows],
            width: {
                size: 100,
                type: WidthType.PERCENTAGE,
            },
            columnWidths: [2500, 1200, 1500, 1800, 800, 1000, 1200],
            borders: { 
                top: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
            },
        });
        sections[0].children.push(table);

    } else {
        sections[0].children.push(
            new Paragraph({ text: reportDict.noDataForMonth, alignment: AlignmentType.CENTER, style: "NormalTextStyle" })
        );
    }

    const doc = new Document({
        creator: "Msarch App",
        title: `${reportDict.title} - ${monthName} ${year}`,
        description: `Monthly project report for ${monthName} ${year}`,
        sections: sections,
        styles: {
            paragraphStyles: [
                {
                    id: "SubheaderStyle",
                    name: "Subheader Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 20, italics: true, color: "595959" }, 
                    paragraph: { spacing: { after: 200 } },
                },
                {
                    id: "TableHeaderStyle",
                    name: "Table Header Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { bold: true, size: 20, color: "FFFFFF" }, // White text for header
                    paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 80, after: 80 } },
                },
                {
                    id: "TableCellStyle",
                    name: "Table Cell Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 18, color: "333333"}, // Darker grey text
                    paragraph: { spacing: { before: 60, after: 60 } },
                },
                {
                    id: "SummaryTextStyle",
                    name: "Summary Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 22, color: "404040"}, 
                    paragraph: { spacing: { before: 40, after: 40 }, indent: { left: 200 }},
                },
                 {
                    id: "SectionHeaderStyle",
                    name: "Section Header Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 28, bold: true, color: "2F5496" }, 
                    paragraph: { spacing: { after: 240, before: 400 } },
                },
                {
                    id: "ErrorTextStyle",
                    name: "Error Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 20, color: "C00000", italics: true}, 
                },
                {
                    id: "NormalTextStyle",
                    name: "Normal Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 22, color: "262626"}, 
                },
            ],
            default: {
                document: {
                     run: { font: "Calibri" }, 
                },
                heading1: { 
                    run: { size: 28, bold: true, color: "2F5496", font: "Calibri Light" },
                    paragraph: { spacing: { after: 240, before: 400 } },
                },
                 title: { 
                    run: { size: 44, bold: true, color: "1F3864", font: "Calibri Light" }, 
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 400 } },
                },
            }
        },
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
}
