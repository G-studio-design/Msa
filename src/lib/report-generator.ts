// src/lib/report-generator.ts
'use server';

import type { Project, WorkflowHistoryEntry, FileEntry } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType, PageNumber, SectionType, ExternalHyperlink, UnderlineType } from 'docx';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';

// Helper function to ensure text is not empty, using a non-breaking space if it is.
const ensureNonEmpty = (text: string | null | undefined): string => {
    const trimmedText = text?.trim();
    return !trimmedText ? "\u00A0" : trimmedText; // Non-breaking space
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

    const primaryColor = "2C3E50"; // Dark Blue-Gray
    const primaryForegroundColor = "FFFFFF"; // White
    const accentColor = "3498DB"; // Bright Blue
    const textColor = "34495E"; // Dark Gray
    const lightGrayColor = "ECF0F1"; // Very Light Gray
    const borderColor = "BDC3C7"; // Light Silver

    // Define style IDs
    const DefaultParagraphStyle = "DefaultParagraphStyle";
    const HeaderStyle = "HeaderStyle";
    const SubheaderStyle = "SubheaderStyle";
    const SectionTitleStyle = "SectionTitleStyle";
    const SummaryTextStyle = "SummaryTextStyle";
    const TableHeaderParagraphStyle = "TableHeaderParagraphStyle";
    const TableCellParagraphStyle = "TableCellParagraphStyle";
    const FooterTextStyleName = "FooterTextStyleName"; // Paragraph style for footer
    // No specific run style needed for footer text if properties are set directly

    const doc = new Document({
        creator: "Msarch App",
        title: `${translations.title} - ${monthName} ${year}`,
        description: translations.description,
        styles: {
            paragraphStyles: [
                { id: DefaultParagraphStyle, name: "Default", run: { size: 22, font: "Calibri", color: textColor }, paragraph: { spacing: { after: 120 } } },
                { id: HeaderStyle, name: "Header Style", basedOn: DefaultParagraphStyle, run: { size: 36, bold: true, color: primaryColor }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 400, before: 200 } } },
                { id: SubheaderStyle, name: "Subheader Style", basedOn: DefaultParagraphStyle, run: { size: 20, italics: true, color: textColor }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 300 } } },
                { id: SectionTitleStyle, name: "Section Title Style", basedOn: DefaultParagraphStyle, run: { size: 28, bold: true, color: primaryColor }, paragraph: { spacing: { before: 400, after: 200 }, border: { bottom: { color: accentColor, space: 1, style: BorderStyle.SINGLE, size: 6 } } } },
                { id: SummaryTextStyle, name: "Summary Text Style", basedOn: DefaultParagraphStyle, run: { size: 22 }, paragraph: { spacing: { after: 100, line: 360 } } },
                { id: TableHeaderParagraphStyle, name: "Table Header Paragraph Style", basedOn: DefaultParagraphStyle, paragraph: { alignment: AlignmentType.CENTER } },
                { id: TableCellParagraphStyle, name: "Table Cell Paragraph Style", basedOn: DefaultParagraphStyle, run: { size: 20 } },
                { id: FooterTextStyleName, name: "Footer Text Style", basedOn: DefaultParagraphStyle, run: { size: 18, color: "7F8C8D" }, paragraph: { alignment: AlignmentType.CENTER } },
            ],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, right: 720, bottom: 720, left: 720 },
                },
                type: SectionType.NEXT_PAGE, // Ensures headers/footers apply correctly
            },
            headers: {
                default: new Paragraph({
                    children: [
                        new TextRun({ text: ensureNonEmpty(dict.dashboardLayout.appTitle), size: 18, color: "7F8C8D", bold: true }),
                    ],
                    alignment: AlignmentType.RIGHT,
                    style: DefaultParagraphStyle, // Use a base style or create a specific header paragraph style
                }),
            },
            footers: {
                default: new Paragraph({
                    children: [
                        new TextRun({ text: ensureNonEmpty(translations.page) + " ", size: 18, color: "7F8C8D" }),
                        PageNumber.CURRENT,
                        new TextRun({ text: " " + ensureNonEmpty(translations.of) + " ", size: 18, color: "7F8C8D" }),
                        PageNumber.TOTAL_PAGES,
                    ],
                    style: FooterTextStyleName, // Apply the paragraph style for alignment
                }),
            },
            children: [
                new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(`${translations.title} - ${monthName} ${year}`) })], style: HeaderStyle }),
                new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(`${translations.generatedOn}: ${format(new Date(), 'PPpp', { locale: language === 'id' ? IndonesianLocale : EnglishLocale })}`) })], style: SubheaderStyle }),
                
                new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.summaryTitle) })], style: SectionTitleStyle }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `  • ${ensureNonEmpty(translations.totalProjectsDescWord?.replace('{total}', (reportData.completed.length + reportData.inProgress.length + reportData.canceled.length).toString()))}\n` }),
                        new TextRun({ text: `  • ${ensureNonEmpty(translations.status.inprogress)}: ${reportData.inProgress.length}\n` }),
                        new TextRun({ text: `  • ${ensureNonEmpty(translations.status.completed)}: ${reportData.completed.length}\n` }),
                        new TextRun({ text: `  • ${ensureNonEmpty(translations.status.canceled)}: ${reportData.canceled.length}` }),
                    ],
                    style: SummaryTextStyle,
                }),
                 new Paragraph({ children: [new TextRun("\u00A0")] , spacing: {after: 300}, style: DefaultParagraphStyle}), // Spacing paragraph

                ...(chartImageDataUrl ? [
                    new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.chartTitleWord) })], style: SectionTitleStyle }),
                    new Paragraph({ // Center the image by putting it in a centered paragraph
                        children: [
                            new ImageRun({
                                data: Buffer.from(chartImageDataUrl.split(',')[1], 'base64'),
                                transformation: {
                                    width: 480, // Adjusted for common page widths
                                    height: 270, 
                                },
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ children: [new TextRun("\u00A0")] , spacing: {after: 300}, style: DefaultParagraphStyle}), // Spacing paragraph
                ] : [
                    new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.chartNotAvailableWord), italics: true })], style: SummaryTextStyle }),
                    new Paragraph({ children: [new TextRun("\u00A0")] , spacing: {after: 300}, style: DefaultParagraphStyle}), // Spacing paragraph
                ]),
                
                new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableCaptionWord) })], style: SectionTitleStyle }),
                new Table({
                    columnWidths: [3000, 1200, 1500, 1500, 800, 1000, 1000], 
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderTitle), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderStatus), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderLastActivityDate), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderContributors), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderProgress), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderCreatedBy), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderCreatedAt), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                            ],
                            tableHeader: true,
                        }),
                        ...[...reportData.inProgress, ...reportData.completed, ...reportData.canceled].map((project) => {
                            let displayStatus = project.status;
                            if (reportData.inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                                displayStatus = dashboardTranslations.inprogress; // Use translated "In Progress" for consistency
                            } else {
                                const statusKey = project.status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardTranslations;
                                displayStatus = dashboardTranslations[statusKey] || project.status;
                            }
                            

                            return new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(project.title)})], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(displayStatus)})], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getLastActivityDateForDoc(project, language)})], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getContributorsForDoc(project, translations)})], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${project.progress}%`})], style: TableCellParagraphStyle, alignment: AlignmentType.RIGHT })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(project.createdBy)})], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatDateOnlyForDoc(project.createdAt, language)})], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                ],
                            });
                        }),
                         ...(reportData.completed.length === 0 && reportData.inProgress.length === 0 && reportData.canceled.length === 0 ? [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: ensureNonEmpty(translations.noDataForMonth), alignment: AlignmentType.CENTER, style: TableCellParagraphStyle })],
                                        columnSpan: 7,
                                        verticalAlign: VerticalAlign.CENTER,
                                    }),
                                ],
                            })
                        ] : []),
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
                        bottom: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
                        left: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
                        right: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: lightGrayColor },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: lightGrayColor },
                    }
                }),
                 new Paragraph({ children: [new TextRun("\u00A0")] , spacing: {after: 400}, style: DefaultParagraphStyle}), // Spacing
                 new Paragraph({
                    children: [
                        new TextRun({ text: ensureNonEmpty(dict.dashboardLayout.appTitle), size: 18, italics: true, color: "7F8C8D" })
                    ],
                    alignment: AlignmentType.CENTER,
                    style: DefaultParagraphStyle,
                 })
            ],
        }],
    });

    try {
        const buffer = await Packer.toBuffer(doc);
        return buffer;
    } catch (error) {
        console.error("Error packing document with docx:", error);
        // Rethrow a more specific error or handle as needed
        throw new Error(`Failed to pack Word document: ${error instanceof Error ? error.message : String(error)}`);
    }
}
