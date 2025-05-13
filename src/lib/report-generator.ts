// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale'; // Import locales
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun } from 'docx';
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
        return dict.none || "None";
    }
    const contributors = [...new Set(project.files.map(f => f.uploadedBy))];
    return contributors.join(', ');
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
    lang: Language = 'en' // Added language parameter
): Promise<string> {
    const dict = getDictionary(lang); // Get dictionary for the specified language
    const reportDict = dict.monthlyReportPage;

    const allProjects = [...inProgress, ...completed, ...canceled ];
    allProjects.sort((a, b) => {
        const statusOrder = (status: string) => {
            if (inProgress.some(p => p.id === a.id && (status === 'Completed' || status === 'Canceled'))) return 0;
            if (status === 'In Progress') return 0;
            if (status === 'Completed') return 1;
            if (status === 'Canceled') return 2;
            return 3;
        };

        const orderA = statusOrder(a.status);
        const orderB = statusOrder(b.status);

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        const dateA = new Date(getLastActivityDate(a, lang) === "Invalid Date" || getLastActivityDate(a, lang) === "N/A" ? 0 : getLastActivityDate(a, lang)).getTime();
        const dateB = new Date(getLastActivityDate(b, lang) === "Invalid Date" || getLastActivityDate(b, lang) === "N/A" ? 0 : getLastActivityDate(b, lang)).getTime();
        return dateB - dateA;
    });

    // Use translated headers
    const headers = [
        reportDict.tableHeaderTitle,
        reportDict.tableHeaderStatus,
        reportDict.tableHeaderLastActivityDate,
        reportDict.tableHeaderContributors,
        "Progress (%)", // This can also be translated if needed
        dict.projectsPage.uploadedByOn.split(" ")[2], // "By" from "Uploaded by {user} on {date}"
        "Created At" // This can also be translated
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
    monthName: string, // monthName is already localized by the client
    year: string,
    chartImageDataUrl?: string,
    lang: Language = 'en' // Added language parameter
): Promise<Buffer> {
    const dict = getDictionary(lang); // Get dictionary for the specified language
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
                    text: `${reportDict.title} - ${monthName} ${year}`, // Translated title
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: `${lang === 'id' ? 'Dibuat pada' : 'Generated on'}: ${format(new Date(), 'PPpp', { locale: lang === 'id' ? IndonesianLocale : EnglishLocale })}`, // Translated generated on
                    style: "Subheader",
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: `${lang === 'id' ? 'Ringkasan' : 'Summary'}:`, // Translated Summary
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({ text: `${reportDict.totalProjects}: ${completed.length + canceled.length + inProgress.length}` }),
                new Paragraph({ text: `  - ${reportDict.inProgressProjectsShort}: ${inProgress.length}` }),
                new Paragraph({ text: `  - ${reportDict.completedProjectsShort}: ${completed.length}` }),
                new Paragraph({ text: `  - ${reportDict.canceledProjectsShort}: ${canceled.length}` }),
                new Paragraph({ text: "" }), // Spacer
            ],
        },
    ];

    if (chartImageDataUrl) {
        try {
            const imageBuffer = Buffer.from(chartImageDataUrl.split(',')[1], 'base64');
            sections[0].children.push(
                new Paragraph({
                    text: lang === 'id' ? "Gambaran Status Proyek:" : "Project Status Overview:", // Translated chart title
                    heading: HeadingLevel.HEADING_1,
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
                new Paragraph({ text: "" }) // Spacer
            );
        } catch (error) {
            console.error("Error processing chart image for Word report:", error);
            sections[0].children.push(new Paragraph({ text: lang === 'id' ? "Kesalahan: Gambar grafik tidak dapat dimuat." : "Error: Chart image could not be loaded."}));
        }
    }


    if (allProjectsForWord.length > 0) {
        sections[0].children.push(
            new Paragraph({
                text: lang === 'id' ? "Daftar Detail Semua Proyek:" : "All Projects Detailed List:", // Translated list title
                heading: HeadingLevel.HEADING_1,
            })
        );

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderTitle, style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderStatus, style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderLastActivityDate, style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderContributors, style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: `Progress (%)`, style: "TableHeader", alignment: AlignmentType.RIGHT })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: lang === 'id' ? 'Dibuat Oleh' : 'Created By', style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: lang === 'id' ? 'Dibuat Pada' : 'Created At', style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
            ],
            tableHeader: true,
        });

        const dataRows = allProjectsForWord.map((project) => {
            let displayStatus = project.status;
            if (inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                displayStatus = 'In Progress';
            }
            const translatedDisplayStatus = (dashboardStatusDict as any)[displayStatus.toLowerCase().replace(/ /g, '')] || displayStatus;

            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(project.title)] }),
                    new TableCell({ children: [new Paragraph(translatedDisplayStatus)] }),
                    new TableCell({ children: [new Paragraph(getLastActivityDate(project, lang))] }),
                    new TableCell({ children: [new Paragraph(getContributors(project, reportDict))] }),
                    new TableCell({ children: [new Paragraph({ text: project.progress.toString(), alignment: AlignmentType.RIGHT })] }),
                    new TableCell({ children: [new Paragraph(project.createdBy)] }),
                    new TableCell({ children: [new Paragraph(formatDateOnly(project.createdAt, lang))] }),
                ],
            });
        });

        const table = new Table({
            rows: [headerRow, ...dataRows],
            width: {
                size: 100,
                type: WidthType.PERCENTAGE,
            },
            columnWidths: [3000, 1500, 1500, 1500, 1000, 1000, 1000],
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
            },
        });
        sections[0].children.push(table);

    } else {
        sections[0].children.push(
            new Paragraph({ text: reportDict.noDataForMonth, alignment: AlignmentType.CENTER })
        );
    }

    const doc = new Document({
        sections: sections,
        styles: {
            paragraphStyles: [
                {
                    id: "Subheader",
                    name: "Subheader",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        size: 20, // 10pt
                        italics: true,
                        color: "555555",
                    },
                    paragraph: {
                        spacing: { after: 200 }, // 10pt spacing after
                    },
                },
                {
                    id: "TableHeader",
                    name: "Table Header",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        bold: true,
                        size: 20, // 10pt
                        color: "000000", 
                    },
                    paragraph: {
                        alignment: AlignmentType.LEFT,
                        spacing: { before: 80, after: 80 },
                    },
                },
            ],
            default: {
                heading1: {
                    run: {
                        size: 28, // 14pt
                        bold: true,
                        color: "2E74B5", // Dark Blue
                    },
                    paragraph: {
                        spacing: { after: 240, before: 300 }, // 12pt after, 15pt before
                    },
                },
                 title: {
                    run: {
                        size: 36, // 18pt
                        bold: true,
                        color: "1F4E79", // Darker Blue
                    },
                    paragraph: {
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }, // 20pt after
                    },
                },
            }
        },
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
}
