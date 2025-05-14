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

const getContributorsForDoc = (project: Project, translations: ReturnType<typeof getDictionary>['monthlyReportPage']): string => {
    if (!project.files || project.files.length === 0) {
        return ensureNonEmpty(translations.none);
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

    const primaryColor = "1F618D"; // Darker Blue
    const primaryForegroundColor = "FFFFFF"; // White
    const accentColor = "5DADE2"; // Lighter Blue
    const textColor = "2C3E50"; // Very Dark Blue/Gray
    const lightGrayColor = "ECF0F1"; // Very Light Gray for alternate rows or subtle borders
    const borderColor = "AAB7B8"; // Medium Gray for borders

    // Style IDs
    const DefaultParagraphStyleId = "DefaultParagraphStyle";
    const HeaderStyleId = "HeaderStyle";
    const SubheaderStyleId = "SubheaderStyle";
    const SectionTitleStyleId = "SectionTitleStyle";
    const SummaryTextStyleId = "SummaryTextStyle";
    const TableHeaderParagraphStyleId = "TableHeaderParagraphStyle";
    const TableCellParagraphStyleId = "TableCellParagraphStyle";
    const FooterParagraphStyleId = "FooterParagraphStyle";
    const ChartPlaceholderStyleId = "ChartPlaceholderStyle";


    const doc = new Document({
        creator: "Msarch App",
        title: ensureNonEmpty(`${translations.title} - ${monthName} ${year}`),
        description: ensureNonEmpty(translations.description),
        styles: {
            paragraphStyles: [
                { id: DefaultParagraphStyleId, name: "Default", run: { size: 22, font: "Calibri", color: textColor }, paragraph: { spacing: { after: 120 } } },
                { id: HeaderStyleId, name: "Header Style", basedOn: DefaultParagraphStyleId, run: { size: 36, bold: true, color: primaryColor }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 400, before: 200 } } },
                { id: SubheaderStyleId, name: "Subheader Style", basedOn: DefaultParagraphStyleId, run: { size: 20, italics: true, color: textColor }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 300 } } },
                { id: SectionTitleStyleId, name: "Section Title Style", basedOn: DefaultParagraphStyleId, run: { size: 28, bold: true, color: primaryColor }, paragraph: { spacing: { before: 400, after: 200 }, border: { bottom: { color: accentColor, space: 1, style: BorderStyle.SINGLE, size: 6 } } } },
                { id: SummaryTextStyleId, name: "Summary Text Style", basedOn: DefaultParagraphStyleId, run: { size: 22 }, paragraph: { spacing: { after: 100, line: 360 } } },
                { id: TableHeaderParagraphStyleId, name: "Table Header Paragraph Style", basedOn: DefaultParagraphStyleId, paragraph: { alignment: AlignmentType.CENTER, spacing: {before: 60, after: 60} } },
                { id: TableCellParagraphStyleId, name: "Table Cell Paragraph Style", basedOn: DefaultParagraphStyleId, run: { size: 20 }, paragraph: { spacing: {before: 60, after: 60} } },
                { id: FooterParagraphStyleId, name: "Footer Paragraph Style", basedOn: DefaultParagraphStyleId, run: { size: 18, color: "7F8C8D" }, paragraph: { alignment: AlignmentType.CENTER } },
                { id: ChartPlaceholderStyleId, name: "Chart Placeholder Style", basedOn: SummaryTextStyleId, run: { italics: true, color: "7F8C8D" } },
            ],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, right: 720, bottom: 720, left: 720 },
                },
                type: SectionType.NEXT_PAGE,
            },
            headers: {
                default: new Paragraph({
                    style: DefaultParagraphStyleId, // Use a base style for the paragraph itself
                    children: [
                        new TextRun({ text: ensureNonEmpty(dict.dashboardLayout.appTitle), size: 18, color: "7F8C8D", bold: true }),
                    ],
                    alignment: AlignmentType.RIGHT,
                }),
            },
            footers: {
                default: new Paragraph({
                    style: FooterParagraphStyleId, // This sets alignment and default run properties
                    children: [
                        new TextRun({ text: ensureNonEmpty(translations.page) + " " }),
                        PageNumber.CURRENT,
                        new TextRun({ text: " " + ensureNonEmpty(translations.of) + " " }),
                        PageNumber.TOTAL_PAGES,
                    ],
                }),
            },
            children: [
                new Paragraph({ style: HeaderStyleId, children: [new TextRun({ text: ensureNonEmpty(`${translations.title} - ${monthName} ${year}`) })] }),
                new Paragraph({ style: SubheaderStyleId, children: [new TextRun({ text: ensureNonEmpty(`${translations.generatedOn}: ${format(new Date(), 'PPpp', { locale: language === 'id' ? IndonesianLocale : EnglishLocale })}`) })] }),
                
                new Paragraph({ style: SectionTitleStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.summaryTitle) })] }),
                new Paragraph({
                    style: SummaryTextStyleId,
                    children: [
                        new TextRun({ text: `  • ${ensureNonEmpty(translations.totalProjectsDescWord?.replace('{total}', (reportData.completed.length + reportData.inProgress.length + reportData.canceled.length).toString()))}\n` }),
                        new TextRun({ text: `  • ${ensureNonEmpty(translations.status.inprogress)}: ${reportData.inProgress.length}\n` }),
                        new TextRun({ text: `  • ${ensureNonEmpty(translations.status.completed)}: ${reportData.completed.length}\n` }),
                        new TextRun({ text: `  • ${ensureNonEmpty(translations.status.canceled)}: ${reportData.canceled.length}` }),
                    ],
                }),
                 new Paragraph({style: DefaultParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty("\u00A0") })], spacing: {after: 300} }),

                ...(chartImageDataUrl ? [
                    new Paragraph({ style: SectionTitleStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.chartTitleWord) })] }),
                    new Paragraph({ // Center the image by putting it in a centered paragraph
                        children: [
                            new ImageRun({
                                data: Buffer.from(chartImageDataUrl.split(',')[1], 'base64'),
                                transformation: {
                                    width: 480, 
                                    height: 270, 
                                },
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ style: DefaultParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty("\u00A0") })], spacing: {after: 300} }),
                ] : [
                    new Paragraph({ style: ChartPlaceholderStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.chartNotAvailableWord) })] }),
                    new Paragraph({ style: DefaultParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty("\u00A0") })], spacing: {after: 300} }),
                ]),
                
                new Paragraph({ style: SectionTitleStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.tableCaptionWord) })] }),
                new Table({
                    columnWidths: [3000, 1200, 1500, 1500, 800, 1000, 1000], 
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ style: TableHeaderParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderTitle), bold: true, color: primaryForegroundColor, size: 20 })]})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ style: TableHeaderParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderStatus), bold: true, color: primaryForegroundColor, size: 20 })]})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ style: TableHeaderParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderLastActivityDate), bold: true, color: primaryForegroundColor, size: 20 })]})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ style: TableHeaderParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderContributors), bold: true, color: primaryForegroundColor, size: 20 })]})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ style: TableHeaderParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderProgress), bold: true, color: primaryForegroundColor, size: 20 })]})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ style: TableHeaderParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderCreatedBy), bold: true, color: primaryForegroundColor, size: 20 })]})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                                new TableCell({ children: [new Paragraph({ style: TableHeaderParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderCreatedAt), bold: true, color: primaryForegroundColor, size: 20 })]})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor }, verticalAlign: VerticalAlign.CENTER }),
                            ],
                            tableHeader: true,
                        }),
                        ...[...reportData.inProgress, ...reportData.completed, ...reportData.canceled].map((project, index) => {
                            let displayStatus = project.status;
                            if (reportData.inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                                displayStatus = dashboardTranslations.inprogress;
                            } else {
                                const statusKey = project.status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardTranslations;
                                displayStatus = dashboardTranslations[statusKey] || project.status;
                            }
                            
                            const cellShading = index % 2 === 1 ? { type: ShadingType.SOLID, color: lightGrayColor, fill: lightGrayColor } : undefined;

                            return new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ style: TableCellParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(project.title)})]})], verticalAlign: VerticalAlign.CENTER, shading: cellShading }),
                                    new TableCell({ children: [new Paragraph({ style: TableCellParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(displayStatus)})]})], verticalAlign: VerticalAlign.CENTER, shading: cellShading }),
                                    new TableCell({ children: [new Paragraph({ style: TableCellParagraphStyleId, children: [new TextRun({ text: getLastActivityDateForDoc(project, language)})]})], verticalAlign: VerticalAlign.CENTER, shading: cellShading }),
                                    new TableCell({ children: [new Paragraph({ style: TableCellParagraphStyleId, children: [new TextRun({ text: getContributorsForDoc(project, translations)})]})], verticalAlign: VerticalAlign.CENTER, shading: cellShading }),
                                    new TableCell({ children: [new Paragraph({ style: TableCellParagraphStyleId, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${project.progress}%`})]})], verticalAlign: VerticalAlign.CENTER, shading: cellShading }),
                                    new TableCell({ children: [new Paragraph({ style: TableCellParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty(project.createdBy)})]})], verticalAlign: VerticalAlign.CENTER, shading: cellShading }),
                                    new TableCell({ children: [new Paragraph({ style: TableCellParagraphStyleId, children: [new TextRun({ text: formatDateOnlyForDoc(project.createdAt, language)})]})], verticalAlign: VerticalAlign.CENTER, shading: cellShading }),
                                ],
                            });
                        }),
                         ...(reportData.completed.length === 0 && reportData.inProgress.length === 0 && reportData.canceled.length === 0 ? [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ style: TableCellParagraphStyleId, alignment: AlignmentType.CENTER, children: [new TextRun({ text: ensureNonEmpty(translations.noDataForMonth) })]})],
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
                 new Paragraph({ style: DefaultParagraphStyleId, children: [new TextRun({ text: ensureNonEmpty("\u00A0") })] , spacing: {after: 400}}), 
                 new Paragraph({
                    style: FooterParagraphStyleId, // Use paragraph style for alignment and default run properties
                    children: [
                        new TextRun({ text: ensureNonEmpty(dict.dashboardLayout.appTitle) }) // TextRun inherits from FooterParagraphStyleId.run
                    ],
                 })
            ],
        }],
    });

    try {
        const buffer = await Packer.toBuffer(doc);
        return buffer;
    } catch (error) {
        console.error("Error packing document with docx:", error);
        throw new Error(`Failed to pack Word document: ${error instanceof Error ? error.message : String(error)}`);
    }
}

