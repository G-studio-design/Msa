// src/lib/report-generator.ts
'use server';

import type { Project, WorkflowHistoryEntry, FileEntry } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType, PageNumber, SectionType, ExternalHyperlink, UnderlineType } from 'docx';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';

// Helper function to ensure text is not empty for docx, using a non-breaking space if it is.
// Using non-breaking space (\u00A0) can be more robust than a regular space for some docx scenarios.
const ensureNonEmpty = (text: string | null | undefined): string => {
    const trimmedText = text?.trim();
    return !trimmedText ? "\u00A0" : trimmedText; // Use non-breaking space for "empty"
};


const formatDateOnlyForDoc = (timestamp: string | undefined | null, lang: Language): string => {
    if (!timestamp) return ensureNonEmpty(null);
    try {
        const locale = lang === 'id' ? IndonesianLocale : EnglishLocale;
        return format(parseISO(timestamp), 'PP', { locale });
    } catch (e) {
        console.error("Error formatting date for doc:", timestamp, e);
        return ensureNonEmpty("Invalid Date");
    }
};

const getLastActivityDateForDoc = (project: Project, lang: Language): string => {
    if (!project.workflowHistory || project.workflowHistory.length === 0) {
        return formatDateOnlyForDoc(project.createdAt, lang);
    }
    const lastEntry = project.workflowHistory[project.workflowHistory.length - 1];
    return formatDateOnlyForDoc(lastEntry?.timestamp, lang);
};

const getContributorsForDoc = (project: Project, dict: ReturnType<typeof getDictionary>['monthlyReportPage']): string => {
    if (!project.files || project.files.length === 0) {
        return ensureNonEmpty(dict.none);
    }
    const contributors = [...new Set(project.files.map(f => f.uploadedBy || 'Unknown'))];
    return ensureNonEmpty(contributors.join(', '));
};


export async function generateWordReport({
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
    const dict = getDictionary(language);
    const translations = dict.monthlyReportPage;
    const dashboardTranslations = dict.dashboardPage.status;

    const primaryColor = "1A237E"; // Dark Blue from theme
    const lightGrayColor = "EEEEEE";
    const textColor = "000000"; // Black for text

    const styles = {
        default: "WordDefault",
        header: "WordHeader",
        subheader: "WordSubheader",
        sectionTitle: "WordSectionTitle",
        summaryText: "WordSummaryText",
        tableHeader: "WordTableHeader",
        tableCell: "WordTableCell",
        footer: "WordFooter",
    };

    const doc = new Document({
        styles: {
            paragraphStyles: [
                { id: styles.default, name: "Default", run: { size: 20, font: "Calibri", color: textColor }, paragraph: { spacing: { after: 120 } } }, // 10pt, 6pt after
                { id: styles.header, name: "Header Style", basedOn: styles.default, run: { size: 36, bold: true, color: primaryColor }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 400 } } }, // 18pt
                { id: styles.subheader, name: "Subheader Style", basedOn: styles.default, run: { size: 20, italics: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } } }, // 10pt
                { id: styles.sectionTitle, name: "Section Title Style", basedOn: styles.default, run: { size: 28, bold: true, color: primaryColor }, paragraph: { spacing: { before: 300, after: 150 } } }, // 14pt
                { id: styles.summaryText, name: "Summary Text Style", basedOn: styles.default, run: { size: 22 }, paragraph: { spacing: { after: 100 } } }, // 11pt
                { id: styles.tableHeader, name: "Table Header Style", basedOn: styles.default, run: { size: 20, bold: true, color: "FFFFFF" }, paragraph: { alignment: AlignmentType.CENTER } }, // 10pt, White text
                { id: styles.tableCell, name: "Table Cell Style", basedOn: styles.default, run: { size: 18 } }, // 9pt
                { id: styles.footer, name: "Footer Style", basedOn: styles.default, run: { size: 16 }, paragraph: { alignment: AlignmentType.CENTER } }, // 8pt
            ],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5 inch margins (1 inch = 1440)
                },
            },
            headers: {
                default: new Paragraph({
                    children: [
                        new TextRun({ text: dict.dashboardLayout.appTitle, size: 18, color: "888888" }),
                    ],
                    alignment: AlignmentType.RIGHT,
                    style: styles.default,
                }),
            },
            footers: {
                default: new Paragraph({
                    children: [
                        new TextRun({ text: `${translations.page || 'Page'} `, style: styles.footer }),
                        new TextRun({ children: [PageNumber.CURRENT], style: styles.footer }),
                        new TextRun({ text: ` ${translations.of || 'of'} `, style: styles.footer }),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES], style: styles.footer }),
                    ],
                    alignment: AlignmentType.CENTER,
                    style: styles.footer,
                }),
            },
            children: [
                new Paragraph({ text: `${translations.title} - ${monthName} ${year}`, style: styles.header }),
                new Paragraph({ text: `${translations.generatedOn || 'Generated on'}: ${format(new Date(), 'PPpp', { locale: language === 'id' ? IndonesianLocale : EnglishLocale })}`, style: styles.subheader }),
                
                new Paragraph({ text: translations.summaryTitle || 'Summary:', style: styles.sectionTitle }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `  • ${translations.totalProjectsDescWord?.replace('{total}', (reportData.completed.length + reportData.inProgress.length + reportData.canceled.length).toString()) || `Total Projects: ${(reportData.completed.length + reportData.inProgress.length + reportData.canceled.length)}`}\n`, style: styles.summaryText }),
                        new TextRun({ text: `  • ${translations.status.inprogress}: ${reportData.inProgress.length}\n`, style: styles.summaryText }),
                        new TextRun({ text: `  • ${translations.status.completed}: ${reportData.completed.length}\n`, style: styles.summaryText }),
                        new TextRun({ text: `  • ${translations.status.canceled}: ${reportData.canceled.length}`, style: styles.summaryText }),
                    ],
                }),
                new Paragraph({ text: "\u00A0", spacing: {after: 300} }), // Spacing paragraph

                ...(chartImageDataUrl ? [
                    new Paragraph({ text: translations.chartTitleWord || 'Project Status Overview', style: styles.sectionTitle }),
                    new ImageRun({
                        data: Buffer.from(chartImageDataUrl.split(',')[1], 'base64'),
                        transformation: {
                            width: 450, // Adjust as needed
                            height: 250, // Adjust as needed
                        },
                    }),
                    new Paragraph({ text: "\u00A0", spacing: {after: 300} }), // Spacing paragraph
                ] : [
                    new Paragraph({ text: translations.chartNotAvailableWord || '(Chart image is not available for this report)', style: styles.summaryText, italics: true }),
                    new Paragraph({ text: "\u00A0", spacing: {after: 300} }),
                ]),
                
                new Paragraph({ text: translations.tableCaptionWord || 'Detailed Project List', style: styles.sectionTitle }),
                new Table({
                    columnWidths: [3500, 1500, 1500, 2000, 1000, 1500, 1500], // Example widths, adjust as needed
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: translations.tableHeaderTitle, style: styles.tableHeader })], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ text: translations.tableHeaderStatus, style: styles.tableHeader })], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ text: translations.tableHeaderLastActivityDate, style: styles.tableHeader })], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ text: translations.tableHeaderContributors, style: styles.tableHeader })], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ text: translations.tableHeaderProgress, style: styles.tableHeader })], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ text: translations.tableHeaderCreatedBy, style: styles.tableHeader })], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ text: translations.tableHeaderCreatedAt, style: styles.tableHeader })], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                            ],
                            tableHeader: true,
                        }),
                        ...[...reportData.inProgress, ...reportData.completed, ...reportData.canceled].map((project, index) => {
                            let displayStatus = project.status;
                            if (reportData.inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                                displayStatus = 'In Progress'; // Override status for Word if it's "inProgress" based on broader filter
                            }
                            const statusKey = displayStatus.toLowerCase().replace(/ /g,'') as keyof typeof dashboardTranslations;
                            const translatedStatus = dashboardTranslations[statusKey] || displayStatus;

                            return new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ text: ensureNonEmpty(project.title), style: styles.tableCell, run: { bold: true } })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ text: ensureNonEmpty(translatedStatus), style: styles.tableCell })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ text: getLastActivityDateForDoc(project, language), style: styles.tableCell })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ text: getContributorsForDoc(project, translations), style: styles.tableCell })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ text: `${project.progress}%`, style: styles.tableCell, alignment: AlignmentType.RIGHT })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ text: ensureNonEmpty(project.createdBy), style: styles.tableCell })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ text: formatDateOnlyForDoc(project.createdAt, language), style: styles.tableCell })], verticalAlign: VerticalAlign.CENTER }),
                                ],
                            });
                        }),
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
                    }
                }),
                 new Paragraph({ text: "\u00A0", spacing: {after: 400} }), // Spacing
                 new Paragraph({
                    children: [
                        new TextRun({ text: "Generated by Msarch App", size: 16, italics: true, color: "888888" })
                    ],
                    alignment: AlignmentType.CENTER,
                    style: styles.default,
                 })
            ],
        }],
    });

    return Packer.toBuffer(doc);
}
