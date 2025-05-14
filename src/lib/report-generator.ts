// src/lib/report-generator.ts
'use server';

import type { Project, WorkflowHistoryEntry, FileEntry } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel, ImageRun, ShadingType, PageNumber, SectionType, ExternalHyperlink, UnderlineType } from 'docx';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';

// Helper function to ensure text is not empty for docx, using a non-breaking space if it is.
const ensureNonEmpty = (text: string | null | undefined): string => {
    const trimmedText = text?.trim();
    return !trimmedText ? "\u00A0" : trimmedText; 
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

    const primaryColor = "1A237E"; 
    const primaryForegroundColor = "FFFFFF";
    const textColor = "000000"; 
    const lightGrayColor = "EEEEEE"; // For table header background if primaryColor is too dark for text

    // Define style IDs
    const DefaultParagraphStyle = "DefaultParagraphStyle";
    const HeaderStyle = "HeaderStyle";
    const SubheaderStyle = "SubheaderStyle";
    const SectionTitleStyle = "SectionTitleStyle";
    const SummaryTextStyle = "SummaryTextStyle";
    const TableHeaderParagraphStyle = "TableHeaderParagraphStyle";
    const TableCellParagraphStyle = "TableCellParagraphStyle";
    const FooterTextStyleName = "FooterTextStyleName";


    const doc = new Document({
        styles: {
            paragraphStyles: [
                { id: DefaultParagraphStyle, name: "Default", run: { size: 20, font: "Calibri", color: textColor }, paragraph: { spacing: { after: 120 } } },
                { id: HeaderStyle, name: "Header Style", basedOn: DefaultParagraphStyle, run: { size: 36, bold: true, color: primaryColor }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 400 } } },
                { id: SubheaderStyle, name: "Subheader Style", basedOn: DefaultParagraphStyle, run: { size: 20, italics: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } } },
                { id: SectionTitleStyle, name: "Section Title Style", basedOn: DefaultParagraphStyle, run: { size: 28, bold: true, color: primaryColor }, paragraph: { spacing: { before: 300, after: 150 } } },
                { id: SummaryTextStyle, name: "Summary Text Style", basedOn: DefaultParagraphStyle, run: { size: 22 }, paragraph: { spacing: { after: 100 } } },
                { id: TableHeaderParagraphStyle, name: "Table Header Paragraph Style", basedOn: DefaultParagraphStyle, paragraph: { alignment: AlignmentType.CENTER } },
                { id: TableCellParagraphStyle, name: "Table Cell Paragraph Style", basedOn: DefaultParagraphStyle },
                { id: FooterTextStyleName, name: "Footer Text Style", basedOn: DefaultParagraphStyle, run: { size: 16, color: "888888" } , paragraph: { alignment: AlignmentType.CENTER } },
            ],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, right: 720, bottom: 720, left: 720 }, 
                },
            },
            headers: {
                default: new Paragraph({
                    children: [
                        new TextRun({ text: ensureNonEmpty(dict.dashboardLayout.appTitle), size: 18, color: "888888" }),
                    ],
                    alignment: AlignmentType.RIGHT,
                    style: DefaultParagraphStyle,
                }),
            },
            footers: {
                default: new Paragraph({
                    children: [
                        new TextRun({ text: ensureNonEmpty(translations.page) + " ", style: FooterTextStyleName }),
                        PageNumber.CURRENT,
                        new TextRun({ text: " " + ensureNonEmpty(translations.of) + " ", style: FooterTextStyleName }),
                        PageNumber.TOTAL_PAGES,
                    ],
                    alignment: AlignmentType.CENTER,
                    style: FooterTextStyleName, 
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
                new Paragraph({ children: [new TextRun({ text: "\u00A0" })], spacing: {after: 300}, style: DefaultParagraphStyle }),

                ...(chartImageDataUrl ? [
                    new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.chartTitleWord) })], style: SectionTitleStyle }),
                    new ImageRun({
                        data: Buffer.from(chartImageDataUrl.split(',')[1], 'base64'),
                        transformation: {
                            width: 450, 
                            height: 250, 
                        },
                    }),
                    new Paragraph({ children: [new TextRun({ text: "\u00A0" })], spacing: {after: 300}, style: DefaultParagraphStyle }),
                ] : [
                     new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.chartNotAvailableWord), italics: true })], style: SummaryTextStyle }),
                     new Paragraph({ children: [new TextRun({ text: "\u00A0" })], spacing: {after: 300}, style: DefaultParagraphStyle }),
                ]),
                
                new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableCaptionWord) })], style: SectionTitleStyle }),
                new Table({
                    columnWidths: [3000, 1200, 1500, 1500, 800, 1000, 1000], 
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderTitle), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderStatus), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderLastActivityDate), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderContributors), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderProgress), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderCreatedBy), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translations.tableHeaderCreatedAt), bold: true, color: primaryForegroundColor, size: 20 })], style: TableHeaderParagraphStyle})], shading: { type: ShadingType.SOLID, color: primaryColor, fill: primaryColor } }),
                            ],
                            tableHeader: true,
                        }),
                        ...[...reportData.inProgress, ...reportData.completed, ...reportData.canceled].map((project) => {
                            let displayStatus = project.status;
                            if (reportData.inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                                displayStatus = 'In Progress'; 
                            }
                            const statusKey = displayStatus.toLowerCase().replace(/ /g,'') as keyof typeof dashboardTranslations;
                            const translatedStatus = dashboardTranslations[statusKey] || displayStatus;

                            return new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(project.title), bold: true, size: 18 })], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(translatedStatus), size: 18 })], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getLastActivityDateForDoc(project, language), size: 18 })], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getContributorsForDoc(project, translations), size: 18 })], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${project.progress}%`, size: 18})], style: TableCellParagraphStyle, alignment: AlignmentType.RIGHT })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(project.createdBy), size: 18 })], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatDateOnlyForDoc(project.createdAt, language), size: 18 })], style: TableCellParagraphStyle })], verticalAlign: VerticalAlign.CENTER }),
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
                 new Paragraph({ children: [new TextRun({ text: "\u00A0" })], spacing: {after: 400}, style: DefaultParagraphStyle }), 
                 new Paragraph({
                    children: [
                        new TextRun({ text: ensureNonEmpty(dict.dashboardLayout.appTitle), size: 16, italics: true, color: "888888" })
                    ],
                    alignment: AlignmentType.CENTER,
                    style: DefaultParagraphStyle,
                 })
            ],
        }],
    });

    return Packer.toBuffer(doc);
}
