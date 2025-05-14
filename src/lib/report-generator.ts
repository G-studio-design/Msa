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
  ImageRun,
  ShadingType,
  PageNumber,
  Header,
  Footer,
  SectionType,
  TabStopType,
  TabStopPosition,
  UnderlineType,
  ExternalHyperlink,
} from 'docx';
import type { Project } from '@/services/project-service';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';

// Style IDs
const DefaultParagraphStyle = "DefaultParagraph";
const TitleStyleId = "TitleStyle";
const SubtitleStyleId = "SubtitleStyle";
const SectionHeaderStyleId = "SectionHeaderStyle";
const BodyTextStyleId = "BodyTextStyle";
const FooterTextStyleName = "FooterTextStyle"; // Renamed for clarity
const WordTableHeaderParaStyleId = "WordTableHeaderParaStyle";
const WordTableCellParaStyleId = "WordTableCellParaStyle";

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

  const doc = new Document({
    creator: ensureNonEmpty("Msarch App"),
    title: ensureNonEmpty(`${translations.monthlyReportPage.reportFor} ${monthName} ${year}`),
    description: ensureNonEmpty(translations.monthlyReportPage.description),
    styles: {
      paragraphStyles: [
        { id: DefaultParagraphStyle, name: "Default Paragraph", run: { size: 22, font: "Calibri" }, paragraph: { spacing: { after: 100, line: 300 } } },
        { id: TitleStyleId, name: "Title Style", basedOn: DefaultParagraphStyle, run: { size: 44, bold: true, color: "2C3E50" }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 300, before: 200 } } },
        { id: SubtitleStyleId, name: "Subtitle Style", basedOn: DefaultParagraphStyle, run: { size: 24, color: "7F8C8D", italics: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } } },
        { id: SectionHeaderStyleId, name: "Section Header Style", basedOn: DefaultParagraphStyle, run: { size: 28, bold: true, color: "34495E" }, paragraph: { spacing: { before: 400, after: 150 }, border: { bottom: { color: "BDC3C7", style: BorderStyle.SINGLE, size: 6 } } } },
        { id: BodyTextStyleId, name: "Body Text Style", basedOn: DefaultParagraphStyle, run: { size: 22 }, paragraph: { spacing: { after: 100, line: 360 } } },
        // Simplified paragraph styles for table - only paragraph-level attributes
        { id: WordTableHeaderParaStyleId, name: "Table Header Paragraph Style", basedOn: DefaultParagraphStyle, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } } },
        { id: WordTableCellParaStyleId, name: "Table Cell Paragraph Style", basedOn: DefaultParagraphStyle, paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 60, after: 60 } } },
        { id: FooterTextStyleName, name: "Footer Text Style", basedOn: DefaultParagraphStyle, run: { size: 18, color: "888888" }, paragraph: { alignment: AlignmentType.CENTER } },
      ],
    },
    sections: [{
      properties: {
        page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        type: SectionType.NEXT_PAGE,
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              style: DefaultParagraphStyle, // Use a base style
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
              style: FooterTextStyleName, // Paragraph style for alignment
              children: [
                new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.page) + " ", size: 18, color: "888888" }),
                PageNumber.CURRENT,
                new TextRun({ text: " " + ensureNonEmpty(translations.monthlyReportPage.of) + " ", size: 18, color: "888888" }),
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
        new Paragraph({ style: BodyTextStyleId, bullet: { level: 0 }, children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.inProgressProjectsShort}: ${reportData.inProgress.length}`))] }),
        new Paragraph({ style: BodyTextStyleId, bullet: { level: 0 }, children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.completedProjectsShort}: ${reportData.completed.length}`))] }),
        new Paragraph({ style: BodyTextStyleId, bullet: { level: 0 }, children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.canceledProjectsShort}: ${reportData.canceled.length}`))] }),
        new Paragraph({ style: BodyTextStyleId, bullet: { level: 0 }, children: [new TextRun(ensureNonEmpty(`${translations.monthlyReportPage.totalProjects}: ${reportData.inProgress.length + reportData.completed.length + reportData.canceled.length}`))] }),
        new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(null, " ") })], spacing: { after: 200 } }),

        ...(chartImageDataUrl
          ? [
              new Paragraph({ style: SectionHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.chartTitleWord))] }),
              new Paragraph({
                children: [
                  new ImageRun({
                    data: Buffer.from(chartImageDataUrl.split(',')[1], 'base64'),
                    transformation: { width: 550, height: 330 }, // Adjust as needed
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
              }),
            ]
          : []),

        new Paragraph({ style: SectionHeaderStyleId, children: [new TextRun(ensureNonEmpty(translations.monthlyReportPage.tableCaptionWord))] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                // Table Headers with explicit TextRun styling
                new TableCell({ shading: { type: ShadingType.SOLID, color: "5DADE2", fill: "5DADE2" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableHeaderParaStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderTitle), color: "FFFFFF", bold: true, size: 20 })] })] }),
                new TableCell({ shading: { type: ShadingType.SOLID, color: "5DADE2", fill: "5DADE2" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableHeaderParaStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderStatus), color: "FFFFFF", bold: true, size: 20 })] })] }),
                new TableCell({ shading: { type: ShadingType.SOLID, color: "5DADE2", fill: "5DADE2" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableHeaderParaStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderLastActivityDate), color: "FFFFFF", bold: true, size: 20 })] })] }),
                new TableCell({ shading: { type: ShadingType.SOLID, color: "5DADE2", fill: "5DADE2" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableHeaderParaStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderContributors), color: "FFFFFF", bold: true, size: 20 })] })] }),
                new TableCell({ shading: { type: ShadingType.SOLID, color: "5DADE2", fill: "5DADE2" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableHeaderParaStyleId, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderProgress), color: "FFFFFF", bold: true, size: 20 })] })] }),
                new TableCell({ shading: { type: ShadingType.SOLID, color: "5DADE2", fill: "5DADE2" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableHeaderParaStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderCreatedBy), color: "FFFFFF", bold: true, size: 20 })] })] }),
                new TableCell({ shading: { type: ShadingType.SOLID, color: "5DADE2", fill: "5DADE2" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableHeaderParaStyleId, children: [new TextRun({ text: ensureNonEmpty(translations.monthlyReportPage.tableHeaderCreatedAt), color: "FFFFFF", bold: true, size: 20 })] })] }),
              ],
              tableHeader: true,
            }),
            ...[...reportData.inProgress, ...reportData.completed, ...reportData.canceled]
              .sort((a, b) => {
                  const statusOrderValue = (project: Project) => {
                      const statusKey = project.status.toLowerCase().replace(/ /g, '') as keyof typeof translations.dashboardPage.status;
                      const translatedStatus = translations.dashboardPage.status[statusKey] || project.status;
                      if (translatedStatus === translations.dashboardPage.status.inprogress) return 0;
                      if (translatedStatus === translations.dashboardPage.status.completed) return 1;
                      if (translatedStatus === translations.dashboardPage.status.canceled) return 2;
                      return 3;
                  };
                  const orderA = statusOrderValue(a);
                  const orderB = statusOrderValue(b);
                  if (orderA !== orderB) return orderA - orderB;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              })
              .map(
              (project, index) => {
                let statusTextRun: TextRun;
                const originalStatus = project.status.toLowerCase();
                const displayedStatus = ensureNonEmpty(translations.dashboardPage.status[originalStatus.replace(/ /g, '') as keyof typeof translations.dashboardPage.status] || project.status);
                let statusColor = "333333"; // Default dark gray

                if (originalStatus === 'completed') {
                  statusColor = "27AE60"; // Green
                } else if (originalStatus === 'inprogress' || originalStatus === 'sedang berjalan') {
                  statusColor = "2980B9"; // Blue
                } else if (originalStatus === 'canceled' || originalStatus === 'dibatalkan') {
                  statusColor = "C0392B"; // Red
                }
                statusTextRun = new TextRun({ text: displayedStatus, color: statusColor, size: 20 });

                return new TableRow({
                  children: [
                    // Data cells with explicit TextRun styling and conditional shading for zebra stripes
                    new TableCell({ shading: index % 2 !== 0 ? undefined : { type: ShadingType.SOLID, color: "EBF5FB", fill: "EBF5FB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableCellParaStyleId, children: [new TextRun({text: ensureNonEmpty(project.title), size: 20, color: "333333"})] })] }),
                    new TableCell({ shading: index % 2 !== 0 ? undefined : { type: ShadingType.SOLID, color: "EBF5FB", fill: "EBF5FB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableCellParaStyleId, children: [statusTextRun] })] }),
                    new TableCell({ shading: index % 2 !== 0 ? undefined : { type: ShadingType.SOLID, color: "EBF5FB", fill: "EBF5FB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableCellParaStyleId, children: [new TextRun({text: ensureNonEmpty(getLastActivityDateForWord(project, language)), size: 20, color: "333333"})] })] }),
                    new TableCell({ shading: index % 2 !== 0 ? undefined : { type: ShadingType.SOLID, color: "EBF5FB", fill: "EBF5FB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableCellParaStyleId, children: [new TextRun({text: ensureNonEmpty(getContributorsForWord(project, language)), size: 20, color: "333333"})] })] }),
                    new TableCell({ shading: index % 2 !== 0 ? undefined : { type: ShadingType.SOLID, color: "EBF5FB", fill: "EBF5FB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableCellParaStyleId, alignment: AlignmentType.RIGHT, children: [new TextRun({text: ensureNonEmpty(project.progress.toString() + "%"), size: 20, color: "333333"})] })] }),
                    new TableCell({ shading: index % 2 !== 0 ? undefined : { type: ShadingType.SOLID, color: "EBF5FB", fill: "EBF5FB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableCellParaStyleId, children: [new TextRun({text: ensureNonEmpty(project.createdBy), size: 20, color: "333333"})] })] }),
                    new TableCell({ shading: index % 2 !== 0 ? undefined : { type: ShadingType.SOLID, color: "EBF5FB", fill: "EBF5FB" }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ style: WordTableCellParaStyleId, children: [new TextRun({text: ensureNonEmpty(formatDateOnlyForWord(project.createdAt, language)), size: 20, color: "333333"})] })] }),
                  ],
                });
              }
            ),
          ],
          columnWidths: [3000, 1500, 1800, 2000, 1000, 1500, 1500],
          borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" },
              left: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" },
              right: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" },
          },
        }),
        new Paragraph({ children: [new TextRun({ text: ensureNonEmpty(null, " ") })], spacing: { before: 400 } }), // Spacing
      ],
    }],
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    console.log("[generateWordReport] Word document packed successfully.");
    return buffer;
  } catch (error: any) {
    console.error("[generateWordReport] Critical error during Word document generation:", error.message, error.stack);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate Word document: ${errorMessage}`);
  }
}
