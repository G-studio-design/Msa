// src/lib/report-generator.ts
'use server';

import type { Project, WorkflowHistoryEntry } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType, PageNumber, SectionType, ExternalHyperlink, UnderlineType } from 'docx';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';

// --- Helper Functions ---

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
    chartImageDataUrl?: string | null, 
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
            return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
        } catch (e) {
            console.warn("[ReportGenerator/WordSort] Error parsing date for sorting, falling back to title sort:", e);
            return a.title.localeCompare(b.title);
        }
    });
    
    const primaryColor = "1A237E"; 
    const accentColorLight = "EEEEEE"; 
    const textColor = "212121"; 
    const headerTextColor = "FFFFFF"; 

    const sections = [
        {
            properties: {
                type: SectionType.NEXT_PAGE, 
                page: {
                    pageNumbers: { start: 1, formatType: PageNumber.DECIMAL },
                     margin: { top: 720, right: 720, bottom: 720, left: 720 }, 
                },
            },
            headers: {
                default: new Paragraph({ 
                    children: [ 
                        new ExternalHyperlink({
                            children: [
                                new TextRun({
                                    text: "Msarch App",
                                    size: 18, 
                                    color: "A9A9A9", 
                                    font: "Calibri Light",
                                    underline: { type: UnderlineType.SINGLE, color: "A9A9A9" },
                                }),
                            ],
                            link: "https://msarch.com", 
                        })
                    ],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 100 }
                }),
            },
            footers: {
                default: new Paragraph({ 
                    children: [
                        new TextRun({ text: String(currentLanguage === 'id' ? 'Halaman' : 'Page') + " ", style: "FooterTextStyle" }),
                        new TextRun({ children: [PageNumber.CURRENT], style: "FooterTextStyle"  }),
                        new TextRun({ text: " " + String(currentLanguage === 'id' ? 'dari' : 'of') + " ", style: "FooterTextStyle" }),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES], style: "FooterTextStyle"  }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),
            },
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: String((reportDict?.title || "Monthly Project Report") + ` - ${monthName || "N/A"} ${year || "N/A"}`),
                            style: "TitleStyle",
                        }),
                    ],
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 600, after: 100 }, 
                }),
                new Paragraph({
                    text: String(`${currentLanguage === 'id' ? 'Dibuat pada' : 'Generated on'}: ${format(new Date(), 'PPPPpppp', { locale })}`), 
                    style: "SubheaderStyle",
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                }),
                new Paragraph({
                    children: [ new TextRun({ text: String(currentLanguage === 'id' ? 'Ringkasan Proyek' : 'Project Summary'), style: "SectionHeaderStyle" }) ],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 100, before: 200 }
                }),
                new Paragraph({ text: String(`• ${reportDict?.totalProjects || "Total Projects Reviewed"}: ${(completed?.length || 0) + (canceled?.length || 0) + (inProgress?.length || 0)}`), style: "SummaryTextStyle" }),
                new Paragraph({ text: String(`  - ${reportDict?.inProgressProjectsShort || "In Progress"}: ${inProgress?.length || 0}`), style: "SummaryTextStyle", indent: {left: 360} }),
                new Paragraph({ text: String(`  - ${reportDict?.completedProjectsShort || "Completed"}: ${completed?.length || 0}`), style: "SummaryTextStyle", indent: {left: 360} }),
                new Paragraph({ text: String(`  - ${reportDict?.canceledProjectsShort || "Canceled"}: ${canceled?.length || 0}`), style: "SummaryTextStyle", indent: {left: 360} }),
                new Paragraph({ children: [new TextRun(" ")], spacing: {after: 200} }), 
            ],
        },
    ];

    if (chartImageDataUrl) {
        try {
            console.log("[ReportGenerator/Word] Processing chart image for Word report...");
            const base64Data = chartImageDataUrl.split(',')[1];
            if (base64Data && base64Data.trim() !== '') {
                const imageBuffer = Buffer.from(base64Data, 'base64');
                 if (imageBuffer.length > 0) {
                    sections[0].children.push(
                        new Paragraph({
                            children: [ new TextRun({ text: String(currentLanguage === 'id' ? "Tinjauan Status Proyek" : "Project Status Overview"), style: "SectionHeaderStyle" }) ],
                            heading: HeadingLevel.HEADING_1,
                            spacing: { after: 100, before: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: { width: 500, height: 250 }, 
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 }
                        })
                    );
                    console.log("[ReportGenerator/Word] Chart image added to document.");
                 } else {
                    console.warn("[ReportGenerator/Word] Chart image data URL provided, but resulted in an empty buffer. Skipping image.");
                    sections[0].children.push(
                        new Paragraph({
                            children: [ new TextRun({ text: String(currentLanguage === 'id' ? "Tinjauan Status Proyek" : "Project Status Overview"), style: "SectionHeaderStyle" }) ],
                            heading: HeadingLevel.HEADING_1,
                            spacing: { after: 100, before: 200 }
                        }),
                        new Paragraph({
                            text: String(currentLanguage === 'id' ? "(Grafik tidak dapat dibuat - data gambar kosong)" : "(Chart could not be created - empty image data)"),
                            alignment: AlignmentType.CENTER,
                            style: "ErrorTextStyle",
                            spacing: { after: 200 }
                        })
                    );
                }
            } else {
                console.warn("[ReportGenerator/Word] Chart image data URL provided, but base64 data is empty. Skipping image.");
                sections[0].children.push(
                    new Paragraph({
                        children: [ new TextRun({ text: String(currentLanguage === 'id' ? "Tinjauan Status Proyek" : "Project Status Overview"), style: "SectionHeaderStyle" }) ],
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 100, before: 200 }
                    }),
                    new Paragraph({
                        text: String(currentLanguage === 'id' ? "(Grafik tidak tersedia - data kosong)" : "(Chart not available - empty data)"),
                        alignment: AlignmentType.CENTER,
                        style: "ErrorTextStyle",
                        spacing: { after: 200 }
                    })
                );
            }
        } catch (error) {
            console.error("[ReportGenerator/Word] Error processing chart image for Word report:", error);
            sections[0].children.push(new Paragraph({ text: String(currentLanguage === 'id' ? "Kesalahan: Gambar grafik tidak dapat dimuat." : "Error: Chart image could not be loaded."), style: "ErrorTextStyle"}));
        }
    } else {
         console.warn("[ReportGenerator/Word] No chart image data URL provided for Word report.");
         sections[0].children.push(
            new Paragraph({
                children: [ new TextRun({ text: String(currentLanguage === 'id' ? "Tinjauan Status Proyek" : "Project Status Overview"), style: "SectionHeaderStyle" }) ],
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 100, before: 200 }
            }),
            new Paragraph({
                text: String(currentLanguage === 'id' ? "(Grafik tidak tersedia)" : "(Chart not available)"),
                alignment: AlignmentType.CENTER,
                style: "ErrorTextStyle",
                spacing: { after: 200 }
            })
        );
    }


    if (allProjectsForWord.length > 0) {
        sections[0].children.push(
            new Paragraph({
                 children: [ new TextRun({ text: String(currentLanguage === 'id' ? "Daftar Detail Proyek" : "Detailed Project List"), style: "SectionHeaderStyle" }) ],
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 100, before: 200 }
            })
        );

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: String(reportDict?.tableHeaderTitle || "Project Title"), style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: String(reportDict?.tableHeaderStatus || "Status"), style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: String(reportDict?.tableHeaderLastActivityDate || "Last Activity"), style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: String(reportDict?.tableHeaderContributors || "Contributors"), style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: String(currentLanguage === 'id' ? 'Progres (%)' : 'Progress (%)'), style: "TableHeaderStyle", alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: String(currentLanguage === 'id' ? 'Dibuat Oleh' : 'Created By'), style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
                new TableCell({ children: [new Paragraph({ text: String(currentLanguage === 'id' ? 'Dibuat Pada' : 'Created At'), style: "TableHeaderStyle" })], verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.SOLID, fill: primaryColor } }),
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

            const projectTitleText = new TextRun(String(project.title || "-"));
            const translatedStatusText = new TextRun(String(translatedDisplayStatus || "-"));
            const lastActivityDateText = new TextRun(String(getLastActivityDate(project, currentLanguage) || "-"));
            const contributorsText = new TextRun(String(getContributors(project, reportDict, currentLanguage) || "-"));
            const progressText = new TextRun(String(project.progress || 0).toString());
            const createdByText = new TextRun(String(project.createdBy || "-"));
            const createdAtText = new TextRun(String(formatDateOnly(project.createdAt, currentLanguage) || "-"));


            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [projectTitleText], style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ children: [translatedStatusText], style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ children: [lastActivityDateText], style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ children: [contributorsText], style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ children: [progressText], alignment: AlignmentType.CENTER, style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ children: [createdByText], style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ children: [createdAtText], style: "TableCellStyle"})], shading: cellShading, verticalAlign: VerticalAlign.CENTER }),
                ],
            });
        });

        const table = new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 9020, type: WidthType.DXA }, 
            columnWidths: [2400, 1100, 1400, 1700, 700, 900, 820], 
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
        console.log("[ReportGenerator/Word] Project table added to document.");

    } else {
        sections[0].children.push(
            new Paragraph({ text: String(reportDict?.noDataForMonth || (currentLanguage === 'id' ? 'Tidak ada data proyek untuk bulan ini.' : 'No project data for this month.')), alignment: AlignmentType.CENTER, style: "NormalTextStyle" })
        );
    }

    sections[0].children.push(
        new Paragraph({ children: [new TextRun(" ")], spacing: {after: 400} }) 
    );
     sections[0].children.push(
        new Paragraph({
            children: [
                new TextRun({ text: String(currentLanguage === 'id' ? 'Dihasilkan oleh Msarch App' : 'Generated by Msarch App'), style: "SmallMutedTextStyle"}),
            ],
            alignment: AlignmentType.RIGHT,
        })
    );


    const doc = new Document({
        creator: "Msarch App",
        title: String((reportDict?.title || "Monthly Project Report") + ` - ${monthName || "N/A"} ${year || "N/A"}`),
        description: String(`Monthly project report for ${monthName || "N/A"} ${year || "N/A"} generated by Msarch App.`),
        sections: sections,
        styles: {
            paragraphStyles: [
                { id: "TitleStyle", name: "Title Style", basedOn: "Normal", run: { size: 44, bold: true, color: primaryColor, font: "Calibri Light" } },
                { id: "SubheaderStyle", name: "Subheader Style", basedOn: "Normal", run: { size: 22, italics: true, color: "5A5A5A", font: "Calibri" }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 150 }} },
                { id: "TableHeaderStyle", name: "Table Header Style", basedOn: "Normal", run: { bold: true, size: 20, color: headerTextColor, font: "Calibri" }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } } },
                { id: "TableCellStyle", name: "Table Cell Style", basedOn: "Normal", run: { size: 18, color: textColor, font: "Calibri"}, paragraph: { spacing: { before: 80, after: 80 } } },
                { id: "SummaryTextStyle", name: "Summary Text Style", basedOn: "Normal", run: { size: 22, color: textColor, font: "Calibri"}, paragraph: { spacing: { before: 60, after: 60 }, indent: { left: 180 }}},
                { id: "SectionHeaderStyle", name: "Section Header Style", basedOn: "Normal", run: { size: 28, bold: true, color: primaryColor, font: "Calibri Light" }, paragraph: { spacing: { after: 150, before: 250 }, border: { bottom: {color: primaryColor, style: BorderStyle.SINGLE, size: 6 }} } },
                { id: "ErrorTextStyle", name: "Error Text Style", basedOn: "Normal", run: { size: 20, color: "C0392B", italics: true, font: "Calibri"}}, 
                { id: "NormalTextStyle", name: "Normal Text Style", basedOn: "Normal", run: { size: 22, color: textColor, font: "Calibri"}},
                { id: "FooterTextStyle", name: "Footer Text Style", basedOn: "Normal", run: { size: 16, color: "A9A9A9", font: "Calibri" } },
                { id: "SmallMutedTextStyle", name: "Small Muted Text Style", basedOn: "Normal", run: { size: 16, color: "7F8C8D", font: "Calibri", italics: true } },
            ],
            default: {
                document: { run: { font: "Calibri", size: 22, color: textColor } },
                heading1: { run: { size: 28, bold: true, color: primaryColor, font: "Calibri Light" }, paragraph: { spacing: { after: 200, before: 300 } } },
                title: { run: { size: 44, bold: true, color: primaryColor, font: "Calibri Light" }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 100, before: 600 } } },
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
        if (packError.message && packError.message.includes("Cannot read properties of undefined (reading 'children')")) {
            console.error("[ReportGenerator/Word] Packer error likely due to empty text run or paragraph. Check data passed to document elements.");
        }
        if (packError.stack) {
            console.error('[ReportGenerator/Word] Packer.toBuffer stack trace:', packError.stack);
        }
        
        throw packError;
    }
}

