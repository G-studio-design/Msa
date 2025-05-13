// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale'; // Import locales
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType, ExternalHyperlink, UnderlineType } from 'docx';
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

function getContributors(project: Project, dict: ReturnType<typeof getDictionary>['monthlyReportPage'], currentLang: Language): string {
    if (!project.files || project.files.length === 0) {
        return dict.none || (currentLang === 'id' ? "Tidak Ada" : "None");
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
    currentLanguage: Language = 'en'
): Promise<string> {
    const dict = getDictionary(currentLanguage);
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
        const dateA = new Date(getLastActivityDate(a, currentLanguage) === "Invalid Date" || getLastActivityDate(a, currentLanguage) === "N/A" ? 0 : getLastActivityDate(a, currentLanguage)).getTime();
        const dateB = new Date(getLastActivityDate(b, currentLanguage) === "Invalid Date" || getLastActivityDate(b, currentLanguage) === "N/A" ? 0 : getLastActivityDate(b, currentLanguage)).getTime();
        return dateB - dateA;
    });

    const headers = [
        reportDict.tableHeaderTitle,
        reportDict.tableHeaderStatus,
        reportDict.tableHeaderLastActivityDate,
        reportDict.tableHeaderContributors,
        currentLanguage === 'id' ? "Progres (%)" : "Progress (%)",
        dict.projectsPage.uploadedByOn.split(" ")[currentLanguage === 'id' ? 2 : 2], // "oleh" or "by"
        currentLanguage === 'id' ? 'Dibuat Pada' : "Created At"
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
            escapeCsvValue(getLastActivityDate(project, currentLanguage)),
            escapeCsvValue(getContributors(project, reportDict, currentLanguage)),
            escapeCsvValue(project.progress),
            escapeCsvValue(project.createdBy),
            escapeCsvValue(formatDateOnly(project.createdAt, currentLanguage)),
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
    const dict = getDictionary(currentLanguage);
    const reportDict = dict.monthlyReportPage;
    const dashboardStatusDict = dict.dashboardPage.status;
    const locale = currentLanguage === 'id' ? IndonesianLocale : EnglishLocale;

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
                    children: [
                        new TextRun({
                            text: `${reportDict.title} - ${monthName} ${year}`,
                            font: "Calibri Light", // Professional font
                            size: 44, // Large title
                            bold: true,
                            color: "2E74B5", // Darker blue for title
                        }),
                    ],
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                }),
                new Paragraph({
                    text: `${currentLanguage === 'id' ? 'Dibuat pada' : 'Generated on'}: ${format(new Date(), 'PPpp', { locale })}`,
                    style: "SubheaderStyle",
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),
                new Paragraph({
                    children: [
                         new TextRun({ text: `${currentLanguage === 'id' ? 'Ringkasan' : 'Summary'}:`, font: "Calibri", bold: true, size: 28, color: "333333" })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    style: "SectionHeaderStyle",
                    spacing: { after: 150, before: 300 }
                }),
                new Paragraph({ text: `  • ${reportDict.totalProjects} ${completed.length + canceled.length + inProgress.length}`, style: "SummaryTextStyle" }),
                new Paragraph({ text: `    - ${reportDict.inProgressProjectsShort}: ${inProgress.length}`, style: "SummaryTextStyle", indent: {left: 400} }),
                new Paragraph({ text: `    - ${reportDict.completedProjectsShort}: ${completed.length}`, style: "SummaryTextStyle", indent: {left: 400} }),
                new Paragraph({ text: `    - ${reportDict.canceledProjectsShort}: ${canceled.length}`, style: "SummaryTextStyle", indent: {left: 400} }),
                new Paragraph({ text: "", spacing: {after: 200} }),
            ],
        },
    ];

    if (chartImageDataUrl) {
        try {
            const imageBuffer = Buffer.from(chartImageDataUrl.split(',')[1], 'base64');
            sections[0].children.push(
                new Paragraph({
                    children: [
                         new TextRun({ text: currentLanguage === 'id' ? "Gambaran Status Proyek:" : "Project Status Overview:", font: "Calibri", bold: true, size: 28, color: "333333" })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    style: "SectionHeaderStyle",
                     spacing: { after: 150, before: 300 }
                }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: 550, // Slightly larger chart
                                height: 275,
                            },
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "", spacing: {after: 200} })
            );
        } catch (error) {
            console.error("Error processing chart image for Word report:", error);
            sections[0].children.push(new Paragraph({ text: currentLanguage === 'id' ? "Kesalahan: Gambar grafik tidak dapat dimuat." : "Error: Chart image could not be loaded.", style: "ErrorTextStyle"}));
        }
    }


    if (allProjectsForWord.length > 0) {
        sections[0].children.push(
            new Paragraph({
                 children: [
                     new TextRun({ text: currentLanguage === 'id' ? "Daftar Detail Semua Proyek:" : "All Projects Detailed List:", font: "Calibri", bold: true, size: 28, color: "333333" })
                 ],
                heading: HeadingLevel.HEADING_1,
                style: "SectionHeaderStyle",
                spacing: { after: 150, before: 300 }
            })
        );

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderTitle, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderStatus, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderLastActivityDate, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderContributors, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: currentLanguage === 'id' ? 'Progres (%)' : 'Progress (%)', style: "TableHeaderStyle", alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: currentLanguage === 'id' ? 'Dibuat Oleh' : 'Created By', style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
                new TableCell({ children: [new Paragraph({ text: currentLanguage === 'id' ? 'Dibuat Pada' : 'Created At', style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: "4F81BD"} }),
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
                    new TableCell({ children: [new Paragraph({ text: project.title, style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: translatedDisplayStatus, style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: getLastActivityDate(project, currentLanguage), style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: getContributors(project, reportDict, currentLanguage), style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: project.progress.toString(), alignment: AlignmentType.CENTER, style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: project.createdBy, style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: formatDateOnly(project.createdAt, currentLanguage), style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                ],
            });
        });

        const table = new Table({
            rows: [headerRow, ...dataRows],
            width: {
                size: 100, // Use 100% of page width
                type: WidthType.PERCENTAGE,
            },
            columnWidths: [2500, 1200, 1500, 1800, 800, 1000, 1200], // Adjust as needed
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

    // Add a footer with a link
    sections[0].children.push(
        new Paragraph({
            children: [
                new TextRun({ text: "\n\nReport generated by Msarch App. Visit us at: ", size: 18, font: "Calibri" }),
                new ExternalHyperlink({
                    children: [
                        new TextRun({
                            text: "www.msarch.com", // Replace with actual URL
                            style: "Hyperlink",
                            color: "0563C1",
                            underline: { type: UnderlineType.SINGLE, color: "0563C1" },
                            size: 18,
                            font: "Calibri"
                        }),
                    ],
                    link: "https://www.msarch.com", // Replace with actual URL
                }),
            ],
            alignment: AlignmentType.CENTER,
            style: "FooterStyle"
        })
    );


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
                    run: { size: 22, italics: true, color: "595959", font: "Calibri" },
                    paragraph: { spacing: { after: 200 }, alignment: AlignmentType.CENTER },
                },
                {
                    id: "TableHeaderStyle",
                    name: "Table Header Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { bold: true, size: 20, color: "FFFFFF", font: "Calibri" }, // White text for header
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } },
                },
                {
                    id: "TableCellStyle",
                    name: "Table Cell Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 18, color: "333333", font: "Calibri"},
                    paragraph: { spacing: { before: 80, after: 80 } },
                },
                {
                    id: "SummaryTextStyle",
                    name: "Summary Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 22, color: "404040", font: "Calibri"},
                    paragraph: { spacing: { before: 60, after: 60 }, indent: { left: 200 }},
                },
                 {
                    id: "SectionHeaderStyle",
                    name: "Section Header Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 26, bold: true, color: "2F5496", font: "Calibri Light" },
                    paragraph: { spacing: { after: 200, before: 300 }, border: { bottom: {color: "BFBFBF", style: BorderStyle.SINGLE, size: 6 }}},
                },
                {
                    id: "ErrorTextStyle",
                    name: "Error Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 20, color: "C00000", italics: true, font: "Calibri"},
                },
                {
                    id: "NormalTextStyle",
                    name: "Normal Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 22, color: "262626", font: "Calibri"},
                },
                {
                    id: "FooterStyle",
                    name: "Footer Style",
                    basedOn: "Normal",
                    run: { size: 18, color: "808080", font: "Calibri" },
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 400 } },
                },
            ],
            default: {
                document: {
                     run: { font: "Calibri", size: 22 },
                },
                heading1: {
                    run: { size: 28, bold: true, color: "2F5496", font: "Calibri Light" },
                    paragraph: { spacing: { after: 240, before: 400 } },
                },
                 title: {
                    run: { size: 44, bold: true, color: "2E74B5", font: "Calibri Light" },
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 400 } },
                },
            }
        },
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
}
