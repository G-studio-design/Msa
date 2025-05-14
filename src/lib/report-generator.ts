// src/lib/report-generator.ts
'use server';

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  VerticalAlign,
  AlignmentType,
  HeadingLevel,
  ImageRun,
  ShadingType,
  PageNumber,
  SectionType,
  Header,
  Footer,
  TabStopType,
  TabStopPosition,
} from 'docx';
import type { Project, FileEntry, WorkflowHistoryEntry } from '@/services/project-service';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations'; // Untuk terjemahan
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';


// Helper function to ensure text is not empty for docx elements
// Returns a non-breaking space if text is null, undefined, or empty after trimming, otherwise returns original text.
const ensureNonEmpty = (text: string | null | undefined, defaultText = '\u00A0'): string => {
  if (text === null || text === undefined) {
    return defaultText;
  }
  const trimmedText = String(text).trim();
  return trimmedText === '' ? defaultText : String(text); // Return original text if not empty to preserve spaces
};

// Helper function to format dates, used in table
const formatDateOnlyForWord = (timestamp: string | undefined | null, lang: Language): string => {
    if (!timestamp) return ensureNonEmpty(null);
    try {
        const locale = lang === 'id' ? IndonesianLocale : EnglishLocale;
        return format(parseISO(timestamp), 'PP', { locale });
    } catch (e) {
        console.error("Error formatting date for Word:", timestamp, e);
        return ensureNonEmpty("Invalid Date");
    }
};

const getLastActivityDateForWord = (project: Project, lang: Language): string => {
    if (!project.workflowHistory || project.workflowHistory.length === 0) {
        return formatDateOnlyForWord(project.createdAt, lang);
    }
    // Find the latest timestamp in workflow history
    const lastEntry = project.workflowHistory.reduce((latest, entry) => {
        return new Date(entry.timestamp) > new Date(latest.timestamp) ? entry : latest;
    });
    return formatDateOnlyForWord(lastEntry.timestamp, lang);
};

const getContributorsForWord = (project: Project, lang: Language): string => {
    if (!project.files || project.files.length === 0) {
        const translations = getDictionary(lang);
        return ensureNonEmpty(translations.projectsPage.none);
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
  
  const translations = getDictionary(language);
  const currentLocale = language === 'id' ? IndonesianLocale : EnglishLocale;

  const TitleStyleId = "TitleStyle";
  const SubtitleStyleId = "SubtitleStyle";
  const SectionHeaderStyleId = "SectionHeaderStyle";
  const BodyTextStyleId = "BodyTextStyle";
  const TableHeaderStyleId = "TableHeaderStyle";
  const TableCellStyleId = "TableCellStyle";
  const FooterTextStyleId = "FooterTextStyle";

  const doc = new Document({
    creator: "Msarch App",
    title: ensureNonEmpty(`${translations.monthlyReportPage.reportFor} ${monthName} ${year}`),
    description: ensureNonEmpty(translations.monthlyReportPage.description),
    styles: {
      paragraphStyles: [
        { id: TitleStyleId, name: "Title Style", basedOn: "Normal", next: "Normal", run: { size: 48, bold: true, color: "2E7D32" }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 300 } } },
        { id: SubtitleStyleId, name: "Subtitle Style", basedOn: "Normal", next: "Normal", run: { size: 28, color: "455A64" }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } } },
        { id: SectionHeaderStyleId, name: "Section Header Style", basedOn: "Normal", next: "Normal", run: { size: 28, bold: true, color: "004D40" }, paragraph: { spacing: { before: 300, after: 150 } } },
        { id: BodyTextStyleId, name: "Body Text Style", basedOn: "Normal", next: "Normal", run: { size: 22 }, paragraph: { spacing: { after: 100 } } },
        { id: TableHeaderStyleId, name: "Table Header Style", basedOn: "Normal", next: "Normal", run: { size: 20, bold: true, color: "FFFFFF" }, paragraph: { alignment: AlignmentType.CENTER, shading: { type: ShadingType.SOLID, color: "4CAF50", fill: "4CAF50" } } },
        { id: TableCellStyleId, name: "Table Cell Style", basedOn: "Normal", next: "Normal", run: { size: 20 }, paragraph: { alignment: AlignmentType.LEFT } },
        { id: FooterTextStyleId, name: "Footer Text Style", basedOn: "Normal", run: { size: 18, color: "757575" }, paragraph: { alignment: AlignmentType.CENTER } },
      ],
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                style: FooterTextStyleId, // Use a defined style or apply properties directly
                children: [
                  new TextRun({ text: ensureNonEmpty("Msarch App"), bold: true }),
                  new TextRun({ text: ensureNonEmpty(` - ${translations.monthlyReportPage.title}`), italics: true }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                style: FooterTextStyleId,
                children: [
                  new TextRun(ensureNonEmpty(translations.monthlyReportPage.page + " ")),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun(ensureNonEmpty(" " + translations.monthlyReportPage.of + " ")),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ style: TitleStyleId, children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.reportFor} ${monthName} ${year}`))] }),
          new Paragraph({ style: SubtitleStyleId, children: [new TextRun(ensureNonEmpty(format(new Date(), 'PPpp', { locale: currentLocale })))] }),
          
          // Summary Section
          new Paragraph({ style: SectionHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.summaryTitle))] }),
          new Paragraph({
            style: BodyTextStyleId,
            children: [
              new TextRun({ text: ensureNonEmpty(`  • ${translations.monthlyReportPage.inProgressProjectsShort}: ${reportData.inProgress.length}`), break: 1 }),
              new TextRun({ text: ensureNonEmpty(`  • ${translations.monthlyReportPage.completedProjectsShort}: ${reportData.completed.length}`), break: 1 }),
              new TextRun({ text: ensureNonEmpty(`  • ${translations.monthlyReportPage.canceledProjectsShort}: ${reportData.canceled.length}`), break: 1 }),
              new TextRun({ text: ensureNonEmpty(`  • ${translations.monthlyReportPage.totalProjects}: ${reportData.inProgress.length + reportData.completed.length + reportData.canceled.length}`), break: 1 }),
            ],
            bullet: { level: 0 }
          }),

          // Chart Image Section (if available)
          ...(chartImageDataUrl
            ? [
                new Paragraph({ style: SectionHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.chartTitleWord))] }),
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: Buffer.from(chartImageDataUrl.split(',')[1], 'base64'),
                      transformation: { width: 500, height: 300 }, // Adjust as needed
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 300 },
                }),
              ]
            : [
                new Paragraph({ style: SectionHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.chartTitleWord))] }),
                new Paragraph({ style: BodyTextStyleId, children: [new TextRun(ensureNonEmpty(`(${translations.monthlyReportPage.chartNotAvailableWord})`))], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
              ]),

          // Project Data Table
          new Paragraph({ style: SectionHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableCaptionWord))] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Table Header
              new TableRow({
                children: [
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableHeaderTitle))] })] }),
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableHeaderStatus))] })] }),
                  new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableHeaderLastActivityDate))] })] }),
                  new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableHeaderContributors))] })] }),
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableHeaderProgress))] })] }),
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableHeaderCreatedBy))] })] }),
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableHeaderCreatedAt))] })] }),
                ],
                tableHeader: true,
              }),
              // Table Data Rows
              ...[...reportData.inProgress, ...reportData.completed, ...reportData.canceled]
                .sort((a, b) => { // Sort by status then by creation date
                    const statusOrder = (status: string) => {
                        if (status === translations.dashboardPage.status.inprogress) return 1;
                        if (status === translations.dashboardPage.status.completed) return 2;
                        if (status === translations.dashboardPage.status.canceled) return 3;
                        return 4;
                    };
                    const orderA = statusOrder(a.status);
                    const orderB = statusOrder(b.status);
                    if (orderA !== orderB) return orderA - orderB;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map(
                (project) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun(ensureNonEmpty(project.title))] })] }),
                      new TableCell({ children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun(ensureNonEmpty(translations.dashboardPage.status[project.status.toLowerCase().replace(/ /g, '') as keyof typeof translations.dashboardPage.status] || project.status))] })] }),
                      new TableCell({ children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun(ensureNonEmpty(getLastActivityDateForWord(project, language)))] })] }),
                      new TableCell({ children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun(ensureNonEmpty(getContributorsForWord(project, language)))] })] }),
                      new TableCell({ children: [new Paragraph({ style: TableCellStyleId, alignment: AlignmentType.RIGHT, children: [new TextRun(ensureNonEmpty(project.progress.toString() + "%"))] })] }),
                      new TableCell({ children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun(ensureNonEmpty(project.createdBy))] })] }),
                      new TableCell({ children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun(ensureNonEmpty(formatDateOnlyForWord(project.createdAt, language)))] })] }),
                    ],
                  })
              ),
            ],
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
            },
          }),
        ],
      },
    ],
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    console.log("[generateWordReport] Word document packed successfully.");
    return buffer;
  } catch (error: any) {
    console.error("[generateWordReport] Critical error during Word document generation:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate Word document: ${errorMessage}`);
  }
}
