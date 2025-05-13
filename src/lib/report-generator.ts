// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale'; // Import locales
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType, ExternalHyperlink, UnderlineType, PageNumber, TextDirection, SectionType } from 'docx';
import type { Language } from '@/context/LanguageContext'; // Import Language type
import { getDictionary } from '@/lib/translations'; // Import dictionary

// --- Helper Functions (can be used by both Excel and Word generation) ---

function formatDateOnly(timestamp: string, lang: Language = 'en'): string {
    if (!timestamp) return "N/A";
    try {
        const locale = lang === 'id' ? IndonesianLocale : EnglishLocale;
        return format(parseISO(timestamp), 'PP', { locale }); // e.g., Sep 29, 2023 or 29 Sep 2023
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
    // Escape double quotes by doubling them, and wrap field in double quotes if it contains comma, double quote, or newline
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
        
        const dateAStr = getLastActivityDate(a, currentLanguage);
        const dateBStr = getLastActivityDate(b, currentLanguage);
        
        // Handle cases where dates might be invalid
        const dateAIsValid = dateAStr !== "Invalid Date" && dateAStr !== "N/A";
        const dateBIsValid = dateBStr !== "Invalid Date" && dateBStr !== "N/A";

        if (!dateAIsValid && !dateBIsValid) return 0;
        if (!dateAIsValid) return 1; // Sort invalid dates to the end
        if (!dateBIsValid) return -1;

        const dateA = new Date(dateAStr).getTime();
        const dateB = new Date(dateBStr).getTime();

        return dateB - dateA;
    });

    const headers = [
        reportDict.tableHeaderTitle,
        reportDict.tableHeaderStatus,
        reportDict.tableHeaderLastActivityDate,
        reportDict.tableHeaderContributors,
        currentLanguage === 'id' ? "Progres (%)" : "Progress (%)",
        currentLanguage === 'id' ? 'Dibuat Oleh' : "Created By",
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
    console.log("[ReportGenerator/Excel] Excel report data generated.");
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
    console.log("[ReportGenerator/Word] Starting Word report generation...");
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
    
    const primaryColor = "2C5E93"; 
    const accentColorLight = "DDEBF7"; 
    const textColor = "333333"; 
    const headerTextColor = "FFFFFF"; 

    const sections = [
        {
            properties: {
                type: SectionType.NEXT_PAGE, 
                page: {
                    pageNumbers: {
                        start: 1,
                        formatType: PageNumber.DECIMAL,
                    },
                },
            },
            headers: {
                default: new Paragraph({ 
                    children: [new TextRun({ text: "Msarch App", font: "Calibri", size: 18, color: "A9A9A9" })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 100 }
                }),
            },
            footers: {
                default: new Paragraph({ 
                    children: [
                        new TextRun({ text: "Page ", font: "Calibri", size: 18, color: "A9A9A9" }),
                        new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: "A9A9A9"  }),
                        new TextRun({ text: " of ", font: "Calibri", size: 18, color: "A9A9A9" }),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 18, color: "A9A9A9"  }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),
            },
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${reportDict.title} - ${monthName} ${year}`,
                            font: "Calibri Light",
                            size: 48, 
                            bold: true,
                            color: primaryColor,
                        }),
                    ],
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 2000, after: 600 }, 
                }),
                new Paragraph({
                    text: `${currentLanguage === 'id' ? 'Dibuat pada' : 'Generated on'}: ${format(new Date(), 'PPPPpppp', { locale })}`, 
                    style: "SubheaderStyle",
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 800 },
                }),
                new Paragraph({
                    children: [
                         new TextRun({ text: `${currentLanguage === 'id' ? 'Ringkasan Proyek' : 'Project Summary'}:`, font: "Calibri", bold: true, size: 32, color: primaryColor })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    style: "SectionHeaderStyle", 
                    spacing: { after: 200, before: 400 }
                }),
                new Paragraph({ text: `  • ${reportDict.totalProjects} ${completed.length + canceled.length + inProgress.length}`, style: "SummaryTextStyle" }),
                new Paragraph({ text: `    - ${reportDict.inProgressProjectsShort}: ${inProgress.length}`, style: "SummaryTextStyle", indent: {left: 400} }),
                new Paragraph({ text: `    - ${reportDict.completedProjectsShort}: ${completed.length}`, style: "SummaryTextStyle", indent: {left: 400} }),
                new Paragraph({ text: `    - ${reportDict.canceledProjectsShort}: ${canceled.length}`, style: "SummaryTextStyle", indent: {left: 400} }),
                new Paragraph({ text: "", spacing: {after: 400} }), 
            ],
        },
    ];

    if (chartImageDataUrl) {
        try {
            console.log("[ReportGenerator/Word] Processing chart image for Word report...");
            const imageBuffer = Buffer.from(chartImageDataUrl.split(',')[1], 'base64');
            sections[0].children.push(
                new Paragraph({
                    children: [
                         new TextRun({ text: currentLanguage === 'id' ? "Tinjauan Status Proyek:" : "Project Status Overview:", font: "Calibri", bold: true, size: 32, color: primaryColor })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    style: "SectionHeaderStyle",
                     spacing: { after: 200, before: 400 }
                }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: 600, 
                                height: 300,
                            },
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                })
            );
            console.log("[ReportGenerator/Word] Chart image added to document.");
        } catch (error) {
            console.error("[ReportGenerator/Word] Error processing chart image for Word report:", error);
            sections[0].children.push(new Paragraph({ text: currentLanguage === 'id' ? "Kesalahan: Gambar grafik tidak dapat dimuat." : "Error: Chart image could not be loaded.", style: "ErrorTextStyle"}));
        }
    }


    if (allProjectsForWord.length > 0) {
        sections[0].children.push(
            new Paragraph({
                 children: [
                     new TextRun({ text: currentLanguage === 'id' ? "Daftar Detail Semua Proyek:" : "All Projects Detailed List:", font: "Calibri", bold: true, size: 32, color: primaryColor })
                 ],
                heading: HeadingLevel.HEADING_1,
                style: "SectionHeaderStyle",
                spacing: { after: 200, before: 400 }
            })
        );

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderTitle, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderStatus, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderLastActivityDate, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: reportDict.tableHeaderContributors, style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: currentLanguage === 'id' ? 'Progres (%)' : 'Progress (%)', style: "TableHeaderStyle", alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: currentLanguage === 'id' ? 'Dibuat Oleh' : 'Created By', style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: currentLanguage === 'id' ? 'Dibuat Pada' : 'Created At', style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
            ],
            tableHeader: true,
        });

        const dataRows = allProjectsForWord.map((project, index) => {
            let displayStatus = project.status;
            if (inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                displayStatus = 'In Progress';
            }
            const translatedDisplayStatus = (dashboardStatusDict as any)[displayStatus.toLowerCase().replace(/ /g, '')] || displayStatus;
           
            const cellShading = index % 2 === 0 ? undefined : { type: ShadingType.SOLID, fill: accentColorLight }; 

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
                size: 9020, 
                type: WidthType.DXA,
            },
            columnWidths: [2500, 1200, 1500, 1800, 800, 1000, 1200], 
            borders: {
                top: { style: BorderStyle.SINGLE, size: 8, color: "C0C0C0" }, 
                bottom: { style: BorderStyle.SINGLE, size: 8, color: "C0C0C0" },
                left: { style: BorderStyle.SINGLE, size: 8, color: "C0C0C0" },
                right: { style: BorderStyle.SINGLE, size: 8, color: "C0C0C0" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E0E0E0" }, 
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E0E0E0" },
            },
        });
        sections[0].children.push(table);
        console.log("[ReportGenerator/Word] Project table added to document.");

    } else {
        sections[0].children.push(
            new Paragraph({ text: reportDict.noDataForMonth, alignment: AlignmentType.CENTER, style: "NormalTextStyle" })
        );
    }

    sections[0].children.push(
        new Paragraph({ text: "", spacing: {after: 800} }) 
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
                    run: { size: 24, italics: true, color: "5A5A5A", font: "Calibri" },
                    paragraph: { spacing: { after: 200 }, alignment: AlignmentType.CENTER },
                },
                {
                    id: "TableHeaderStyle",
                    name: "Table Header Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { bold: true, size: 22, color: headerTextColor, font: "Calibri" }, 
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 } },
                },
                {
                    id: "TableCellStyle",
                    name: "Table Cell Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 20, color: textColor, font: "Calibri"},
                    paragraph: { spacing: { before: 100, after: 100 } },
                },
                {
                    id: "SummaryTextStyle",
                    name: "Summary Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 24, color: "4A4A4A", font: "Calibri"},
                    paragraph: { spacing: { before: 80, after: 80 }, indent: { left: 200 }},
                },
                 {
                    id: "SectionHeaderStyle",
                    name: "Section Header Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 28, bold: true, color: primaryColor, font: "Calibri Light" }, 
                    paragraph: { spacing: { after: 250, before: 350 }, border: { bottom: {color: primaryColor, style: BorderStyle.SINGLE, size: 8 }}},
                },
                {
                    id: "ErrorTextStyle",
                    name: "Error Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 22, color: "C00000", italics: true, font: "Calibri"},
                },
                {
                    id: "NormalTextStyle",
                    name: "Normal Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 24, color: "262626", font: "Calibri"},
                },
            ],
            default: {
                document: {
                     run: { font: "Calibri", size: 24 },
                },
                heading1: { 
                    run: { size: 32, bold: true, color: primaryColor, font: "Calibri Light" },
                    paragraph: { spacing: { after: 240, before: 400 } },
                },
                 title: { 
                    run: { size: 48, bold: true, color: primaryColor, font: "Calibri Light" },
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 600 } },
                },
            }
        },
    });

    try {
        console.log("[ReportGenerator/Word] Attempting to pack Word document...");
        const buffer = await Packer.toBuffer(doc);
        console.log("[ReportGenerator/Word] Word document packed successfully.");
        return buffer;
    } catch (packError: any) {
        console.error('[ReportGenerator/Word] Error during Packer.toBuffer:', packError);
        if (packError.stack) {
            console.error('[ReportGenerator/Word] Packer.toBuffer stack trace:', packError.stack);
        }
        // Re-throw a more informative error that can be caught by the API route
        throw new Error(`Failed to pack Word document: ${packError.message || String(packError)}`);
    }
}
