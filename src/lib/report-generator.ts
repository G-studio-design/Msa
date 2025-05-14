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
  AlignmentType,
  HeadingLevel,
  ImageRun,
  ShadingType,
  PageNumber,
  Header,
  Footer,
  TabStopType,
  TabStopPosition,
  VerticalAlign,
} from 'docx';
import type { Project } from '@/services/project-service';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';

// Helper function to ensure text is not empty and provides a non-breaking space if it is.
const ensureNonEmpty = (text: string | null | undefined, defaultText = '\u00A0'): string => {
  if (text === null || text === undefined) {
    return defaultText;
  }
  const trimmedText = String(text).trim();
  return trimmedText === '' ? defaultText : String(text);
};

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
  const lastEntry = project.workflowHistory.reduce((latest, entry) => {
    return new Date(entry.timestamp) > new Date(latest.timestamp) ? entry : latest;
  });
  return formatDateOnlyForWord(lastEntry.timestamp, lang);
};

const getContributorsForWord = (project: Project, lang: Language): string => {
  const translations = getDictionary(lang);
  if (!project.files || project.files.length === 0) {
    return ensureNonEmpty(translations.monthlyReportPage.none);
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
  const TableHeaderStyleId = "TableHeaderStyle"; // Style for the paragraph within the header cell
  const TableCellStyleId = "TableCellStyle";   // Style for the paragraph within the data cell
  const FooterTextStyleId = "FooterTextStyle";

  const doc = new Document({
    creator: "Msarch App",
    title: ensureNonEmpty(`${translations.monthlyReportPage.reportFor} ${monthName} ${year}`),
    description: ensureNonEmpty(translations.monthlyReportPage.description),
    styles: {
      paragraphStyles: [
        { id: TitleStyleId, name: "Title Style", basedOn: "Normal", next: "Normal", run: { size: 40, bold: true, color: "2C3E50" }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 300 } } },
        { id: SubtitleStyleId, name: "Subtitle Style", basedOn: "Normal", next: "Normal", run: { size: 24, color: "7F8C8D" }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200, before: 50 } } },
        { id: SectionHeaderStyleId, name: "Section Header Style", basedOn: "Normal", next: "Normal", run: { size: 28, bold: true, color: "34495E" }, paragraph: { spacing: { before: 400, after: 150 }, border: { bottom: { color: "BDC3C7", space: 1, style: BorderStyle.SINGLE, size: 6 } } } },
        { id: BodyTextStyleId, name: "Body Text Style", basedOn: "Normal", next: "Normal", run: { size: 22 }, paragraph: { spacing: { after: 100, line: 360 } } },
        { id: TableHeaderStyleId, name: "Table Header Paragraph Style", basedOn: "Normal", next: "Normal", paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 } } },
        { id: TableCellStyleId, name: "Table Cell Paragraph Style", basedOn: "Normal", next: "Normal", paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 80, after: 80 } } },
        { id: FooterTextStyleId, name: "Footer Text Style", basedOn: "Normal", run: { size: 18, color: "95A5A6" }, paragraph: { alignment: AlignmentType.CENTER } },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: ensureNonEmpty("Msarch App - " + translations.monthlyReportPage.title), size: 18, color: "7F8C8D", italics: true }),
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 200 },
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
                  PageNumber.CURRENT,
                  new TextRun(ensureNonEmpty(" " + translations.monthlyReportPage.of + " ")),
                  PageNumber.TOTAL_PAGES,
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ style: TitleStyleId, children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.reportFor} ${monthName} ${year}`))] }),
          new Paragraph({ style: SubtitleStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.generatedOn + ": " + format(new Date(), 'PPpp', { locale: currentLocale })))] }),
          
          new Paragraph({ style: SectionHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.summaryTitle))] }),
          new Paragraph({
            style: BodyTextStyleId,
            bullet: { level: 0 },
            children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.inProgressProjectsShort}: ${reportData.inProgress.length}`))]
          }),
          new Paragraph({
            style: BodyTextStyleId,
            bullet: { level: 0 },
            children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.completedProjectsShort}: ${reportData.completed.length}`))]
          }),
          new Paragraph({
            style: BodyTextStyleId,
            bullet: { level: 0 },
            children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.canceledProjectsShort}: ${reportData.canceled.length}`))]
          }),
          new Paragraph({
            style: BodyTextStyleId,
            bullet: { level: 0 },
            children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.totalProjects}: ${reportData.inProgress.length + reportData.completed.length + reportData.canceled.length}`))]
          }),

          ...(chartImageDataUrl
            ? [
                new Paragraph({ style: SectionHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.chartTitleWord))] }),
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: Buffer.from(chartImageDataUrl.split(',')[1], 'base64'),
                      transformation: { width: 550, height: 330 },
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

          new Paragraph({ style: SectionHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableCaptionWord))] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ shading: { type: ShadingType.SOLID, color: "E5E7EB", fill: "E5E7EB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderTitle), bold: true, color: "000000", size: 20 })] })] }),
                  new TableCell({ shading: { type: ShadingType.SOLID, color: "E5E7EB", fill: "E5E7EB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderStatus), bold: true, color: "000000", size: 20 })] })] }),
                  new TableCell({ shading: { type: ShadingType.SOLID, color: "E5E7EB", fill: "E5E7EB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderLastActivityDate), bold: true, color: "000000", size: 20 })] })] }),
                  new TableCell({ shading: { type: ShadingType.SOLID, color: "E5E7EB", fill: "E5E7EB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderContributors), bold: true, color: "000000", size: 20 })] })] }),
                  new TableCell({ shading: { type: ShadingType.SOLID, color: "E5E7EB", fill: "E5E7EB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableHeaderStyleId, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderProgress), bold: true, color: "000000", size: 20 })] })] }),
                  new TableCell({ shading: { type: ShadingType.SOLID, color: "E5E7EB", fill: "E5E7EB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderCreatedBy), bold: true, color: "000000", size: 20 })] })] }),
                  new TableCell({ shading: { type: ShadingType.SOLID, color: "E5E7EB", fill: "E5E7EB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableHeaderStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderCreatedAt), bold: true, color: "000000", size: 20 })] })] }),
                ],
                tableHeader: true,
              }),
              ...[...reportData.inProgress, ...reportData.completed, ...reportData.canceled]
                .sort((a, b) => {
                    const statusOrder = (project: Project) => {
                        const statusKey = project.status.toLowerCase().replace(/ /g, '') as keyof typeof translations.dashboardPage.status;
                        const translatedStatus = translations.dashboardPage.status[statusKey] || project.status;
                        if (translatedStatus === translations.dashboardPage.status.inprogress) return 1;
                        if (translatedStatus === translations.dashboardPage.status.completed) return 2;
                        if (translatedStatus === translations.dashboardPage.status.canceled) return 3;
                        return 4;
                    };
                    const orderA = statusOrder(a);
                    const orderB = statusOrder(b);
                    if (orderA !== orderB) return orderA - orderB;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map(
                (project) =>
                  new TableRow({
                    children: [
                      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun({text: ensureNonEmpty(project.title), size: 20})] })] }),
                      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun({text: ensureNonEmpty(translations.dashboardPage.status[project.status.toLowerCase().replace(/ /g, '') as keyof typeof translations.dashboardPage.status] || project.status), size: 20})] })] }),
                      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun({text: ensureNonEmpty(getLastActivityDateForWord(project, language)), size: 20})] })] }),
                      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun({text: ensureNonEmpty(getContributorsForWord(project, language)), size: 20})] })] }),
                      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableCellStyleId, alignment: AlignmentType.RIGHT, children: [new TextRun({text: ensureNonEmpty(project.progress.toString() + "%"), size: 20})] })] }),
                      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun({text: ensureNonEmpty(project.createdBy), size: 20})] })] }),
                      new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: TableCellStyleId, children: [new TextRun({text: ensureNonEmpty(formatDateOnlyForWord(project.createdAt, language)), size: 20})] })] }),
                    ],
                  })
              ),
            ],
            columnWidths: [3500, 1500, 1800, 2000, 1000, 1500, 1500], // Adjusted column widths
            borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
                left: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
                right: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
            },
          }),
          new Paragraph({ style: BodyTextStyleId, spacing: {before: 400}, children: [new TextRun({text:ensureNonEmpty(""), break:1})] }), // Add some space at the end
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
