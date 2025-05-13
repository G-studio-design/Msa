// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale'; // Import locales
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType, ExternalHyperlink, UnderlineType, PageNumber, TextDirection, SectionType } from 'docx';
import type { Language } from '@/context/LanguageContext'; // Import Language type
import { getDictionary } from '@/lib/translations'; // Import dictionary

// --- Helper Functions (can be used by both Excel and Word generation) ---

function formatDateOnly(timestamp: string | undefined | null, lang: Language = 'en'): string {
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
    return formatDateOnly(lastEntry?.timestamp, lang);
}

function getContributors(project: Project, dict: ReturnType<typeof getDictionary>['monthlyReportPage'], currentLang: Language): string {
    if (!project.files || project.files.length === 0) {
        return dict?.none || (currentLang === 'id' ? "Tidak Ada" : "None");
    }
    const contributors = [...new Set(project.files.map(f => f.uploadedBy || 'Unknown'))];
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
        
        const dateAStr = getLastActivityDate(a, currentLanguage);
        const dateBStr = getLastActivityDate(b, currentLanguage);
        
        const dateAIsValid = dateAStr !== "Invalid Date" && dateAStr !== "N/A";
        const dateBIsValid = dateBStr !== "Invalid Date" && dateBStr !== "N/A";

        if (!dateAIsValid && !dateBIsValid) return 0;
        if (!dateAIsValid) return 1; 
        if (!dateBIsValid) return -1;

        try {
            // Assuming date strings are in a parsable format like 'YYYY-MM-DD' or ISO
            const dateA = parseISO(a.createdAt).getTime(); // Use createdAt for primary sort within status
            const dateB = parseISO(b.createdAt).getTime();
             return dateB - dateA; // Sort by creation date, newest first
        } catch (e) {
            console.warn("[ReportGenerator/ExcelSort] Error parsing date for sorting, falling back to title sort:", e);
            return a.title.localeCompare(b.title);
        }
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
        
        try {
            // Sort by creation date if status is the same, newest first
            return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
        } catch (e) {
            console.warn("[ReportGenerator/WordSort] Error parsing date for sorting, falling back to title sort:", e);
            return a.title.localeCompare(b.title);
        }
    });
    
    const primaryColor = "1A237E"; // Dark Blue
    const accentColorLight = "E8EAF6"; // Light Indigo for row shading
    const textColor = "333333"; // Dark Gray for text
    const headerTextColor = "FFFFFF"; // White for table header text

    const sections = [
        {
            properties: {
                type: SectionType.NEXT_PAGE, 
                page: {
                    pageNumbers: {
                        start: 1,
                        formatType: PageNumber.DECIMAL,
                    },
                     margin: {
                        top: 720, // 0.5 inch
                        right: 720,
                        bottom: 720,
                        left: 720,
                    },
                },
            },
            headers: {
                default: new Paragraph({ 
                    children: [new TextRun({ text: "Msarch App", font: "Calibri", size: 18, color: "A9A9A9" })], // Smaller, grayed out
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
                            text: `${reportDict?.title || "Monthly Project Report"} - ${monthName || "N/A"} ${year || "N/A"}`,
                            font: "Calibri Light",
                            size: 48, // Large title
                            bold: true,
                            color: primaryColor,
                        }),
                    ],
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 1200, after: 300 }, // More space before, less after
                }),
                new Paragraph({
                    text: `${currentLanguage === 'id' ? 'Dibuat pada' : 'Generated on'}: ${format(new Date(), 'PPPPpppp', { locale })}`, 
                    style: "SubheaderStyle", // Custom style
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 600 },
                }),
                new Paragraph({
                    children: [
                         new TextRun({ text: `${currentLanguage === 'id' ? 'Ringkasan Proyek' : 'Project Summary'}:`, font: "Calibri", bold: true, size: 32, color: primaryColor })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    style: "SectionHeaderStyle", // Custom style
                    spacing: { after: 200, before: 400 }
                }),
                new Paragraph({ text: `  • ${reportDict?.totalProjects || "Total Projects Reviewed"}: ${(completed?.length || 0) + (canceled?.length || 0) + (inProgress?.length || 0)}`, style: "SummaryTextStyle" }),
                new Paragraph({ text: `    - ${reportDict?.inProgressProjectsShort || "In Progress"}: ${inProgress?.length || 0}`, style: "SummaryTextStyle", indent: {left: 400} }),
                new Paragraph({ text: `    - ${reportDict?.completedProjectsShort || "Completed"}: ${completed?.length || 0}`, style: "SummaryTextStyle", indent: {left: 400} }),
                new Paragraph({ text: `    - ${reportDict?.canceledProjectsShort || "Canceled"}: ${canceled?.length || 0}`, style: "SummaryTextStyle", indent: {left: 400} }),
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
                                width: 550, // Adjusted width
                                height: 275, // Adjusted height for 2:1 aspect ratio
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
                new TableCell({ children: [new Paragraph({ text: reportDict?.tableHeaderTitle || "Project Title", style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: reportDict?.tableHeaderStatus || "Status", style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: reportDict?.tableHeaderLastActivityDate || "Last Activity / End Date", style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: reportDict?.tableHeaderContributors || "Contributors", style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
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
            const statusKey = displayStatus?.toLowerCase().replace(/ /g, '') as keyof typeof dashboardStatusDict;
            const translatedDisplayStatus = dashboardStatusDict[statusKey] || displayStatus;
           
            const cellShading = index % 2 === 0 ? undefined : { type: ShadingType.SOLID, fill: accentColorLight }; 

            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: project.title || "", style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: translatedDisplayStatus || "", style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: getLastActivityDate(project, currentLanguage) || "", style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: getContributors(project, reportDict, currentLanguage) || "", style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: (project.progress || 0).toString(), alignment: AlignmentType.CENTER, style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: project.createdBy || "", style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: formatDateOnly(project.createdAt, currentLanguage) || "", style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                ],
            });
        });

        const table = new Table({
            rows: [headerRow, ...dataRows],
            width: {
                size: 9020, // 9020 DXA is roughly 6.26 inches, good for A4 portrait
                type: WidthType.DXA,
            },
            // Adjust column widths for better fit (total should be around 9020)
            columnWidths: [2500, 1200, 1500, 1800, 800, 1000, 1220], 
            borders: { // Lighter, more professional borders
                top: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" }, 
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" },
                left: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" },
                right: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" }, 
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" },
            },
        });
        sections[0].children.push(table);
        console.log("[ReportGenerator/Word] Project table added to document.");

    } else {
        sections[0].children.push(
            new Paragraph({ text: reportDict?.noDataForMonth || (currentLanguage === 'id' ? 'Tidak ada data proyek untuk bulan ini.' : 'No project data for this month.'), alignment: AlignmentType.CENTER, style: "NormalTextStyle" })
        );
    }

    sections[0].children.push(
        new Paragraph({ text: "", spacing: {after: 800} }) 
    );

    const doc = new Document({
        creator: "Msarch App",
        title: `${reportDict?.title || "Monthly Project Report"} - ${monthName || "N/A"} ${year || "N/A"}`,
        description: `Monthly project report for ${monthName || "N/A"} ${year || "N/A"}`,
        sections: sections,
        styles: {
            paragraphStyles: [
                {
                    id: "SubheaderStyle",
                    name: "Subheader Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 24, italics: true, color: "5A5A5A", font: "Calibri" }, // Font Calibri
                    paragraph: { spacing: { after: 200 }, alignment: AlignmentType.CENTER },
                },
                {
                    id: "TableHeaderStyle",
                    name: "Table Header Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { bold: true, size: 22, color: headerTextColor, font: "Calibri" }, // Font Calibri
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 } },
                },
                {
                    id: "TableCellStyle",
                    name: "Table Cell Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 20, color: textColor, font: "Calibri"}, // Font Calibri
                    paragraph: { spacing: { before: 100, after: 100 } },
                },
                {
                    id: "SummaryTextStyle",
                    name: "Summary Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 24, color: "4A4A4A", font: "Calibri"}, // Font Calibri
                    paragraph: { spacing: { before: 80, after: 80 }, indent: { left: 200 }},
                },
                 {
                    id: "SectionHeaderStyle",
                    name: "Section Header Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 28, bold: true, color: primaryColor, font: "Calibri Light" }, // Font Calibri Light
                    paragraph: { spacing: { after: 250, before: 350 }, border: { bottom: {color: primaryColor, style: BorderStyle.SINGLE, size: 8 }}},
                },
                {
                    id: "ErrorTextStyle",
                    name: "Error Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 22, color: "C00000", italics: true, font: "Calibri"}, // Font Calibri
                },
                {
                    id: "NormalTextStyle",
                    name: "Normal Text Style",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 24, color: "262626", font: "Calibri"}, // Font Calibri
                },
            ],
            default: {
                document: {
                     run: { font: "Calibri", size: 22 }, // Default font and size
                },
                heading1: { // Used by HEADING_1
                    run: { size: 32, bold: true, color: primaryColor, font: "Calibri Light" },
                    paragraph: { spacing: { after: 240, before: 400 } },
                },
                 title: { // Used by HeadingLevel.TITLE
                    run: { size: 48, bold: true, color: primaryColor, font: "Calibri Light" },
                    paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 600, before: 1200 } },
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
