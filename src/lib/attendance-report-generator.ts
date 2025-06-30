// src/lib/attendance-report-generator.ts
'use server';

import {
  Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow,
  WidthType, BorderStyle, VerticalAlign, AlignmentType, ShadingType, Header, Footer, PageNumber, SectionType
} from 'docx';
import type { AttendanceRecord } from '@/services/attendance-service';
import type { User } from '@/services/user-service';
import type { Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';

interface ReportData {
  records: AttendanceRecord[];
  users: Omit<User, 'password'>[];
  monthName: string;
  year: string;
  language: Language;
}

const ensureNonEmpty = (text: string | null | undefined, defaultText = '\u00A0'): string => {
  if (text === null || text === undefined) return defaultText;
  const trimmed = String(text).trim();
  return trimmed === '' ? defaultText : String(text);
};

const formatTimeOnly = (isoString?: string): string => {
  if (!isoString) return '--:--';
  try {
    return format(parseISO(isoString), 'HH:mm:ss');
  } catch (e) {
    return 'Invalid';
  }
};

export async function generateAttendanceWordReport(data: ReportData): Promise<Buffer> {
  const { records, users, monthName, year, language } = data;
  const dict = getDictionary(language).attendanceReportPage;
  const currentLocale = language === 'id' ? IndonesianLocale : EnglishLocale;

  const userStats: { [userId: string]: { present: number; late: number; absent: number } } = {};
  users.forEach(u => {
    userStats[u.id] = { present: 0, late: 0, absent: 0 };
  });

  records.forEach(r => {
    if (userStats[r.userId]) {
      if (r.status === 'Present') userStats[r.userId].present++;
      if (r.status === 'Late') userStats[r.userId].late++;
    }
  });

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: ensureNonEmpty(dict.reportTitle), size: 44, bold: true, color: "1A237E" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: ensureNonEmpty(`${dict.reportFor} ${monthName} ${year}`), size: 32, color: "2c3e50" })],
  }));

  // Summary Table
  const summaryRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ shading: { type: ShadingType.SOLID, color: "4A90E2", fill: "4A90E2" }, children: [new Paragraph({ children: [new TextRun({ text: dict.tableHeaderEmployee, bold: true, color: "FFFFFF", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading: { type: ShadingType.SOLID, color: "4A90E2", fill: "4A90E2" }, children: [new Paragraph({ children: [new TextRun({ text: dict.tableHeaderPresent, bold: true, color: "FFFFFF", size: 24 })] })], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading: { type: ShadingType.SOLID, color: "4A90E2", fill: "4A90E2" }, children: [new Paragraph({ children: [new TextRun({ text: dict.tableHeaderLate, bold: true, color: "FFFFFF", size: 24 })] })], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
      ]
    })
  ];

  users.forEach((user, index) => {
    const stats = userStats[user.id];
    const shading = index % 2 === 0 ? { type: ShadingType.SOLID, color: "F4F8FB", fill: "F4F8FB" } : undefined;
    summaryRows.push(new TableRow({
      children: [
        new TableCell({ shading, children: [new Paragraph(ensureNonEmpty(user.displayName || user.username))], verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading, children: [new Paragraph(ensureNonEmpty(stats.present.toString()))], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading, children: [new Paragraph(ensureNonEmpty(stats.late.toString()))], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
      ]
    }));
  });

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: summaryRows,
    columnWidths: [60, 20, 20]
  }));

  // Detailed Log
  children.push(new Paragraph({
    spacing: { before: 800, after: 200 },
    children: [new TextRun({ text: ensureNonEmpty(dict.detailedLogTitle), size: 36, bold: true, color: "1A237E" })],
  }));

  const detailRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ shading: { type: ShadingType.SOLID, color: "4A90E2", fill: "4A90E2" }, children: [new Paragraph({ children: [new TextRun({ text: dict.detailHeaderDate, bold: true, color: "FFFFFF", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading: { type: ShadingType.SOLID, color: "4A90E2", fill: "4A90E2" }, children: [new Paragraph({ children: [new TextRun({ text: dict.detailHeaderEmployee, bold: true, color: "FFFFFF", size: 24 })] })], verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading: { type: ShadingType.SOLID, color: "4A90E2", fill: "4A90E2" }, children: [new Paragraph({ children: [new TextRun({ text: dict.detailHeaderCheckIn, bold: true, color: "FFFFFF", size: 24 })] })], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading: { type: ShadingType.SOLID, color: "4A90E2", fill: "4A90E2" }, children: [new Paragraph({ children: [new TextRun({ text: dict.detailHeaderCheckOut, bold: true, color: "FFFFFF", size: 24 })] })], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading: { type: ShadingType.SOLID, color: "4A90E2", fill: "4A90E2" }, children: [new Paragraph({ children: [new TextRun({ text: dict.detailHeaderStatus, bold: true, color: "FFFFFF", size: 24 })] })], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
      ]
    })
  ];
  
  const sortedRecords = [...records].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.displayName.localeCompare(b.displayName));

  sortedRecords.forEach((rec, index) => {
    const shading = index % 2 === 0 ? { type: ShadingType.SOLID, color: "F4F8FB", fill: "F4F8FB" } : undefined;
    const formattedDate = format(parseISO(rec.date), 'eeee, dd MMMM yyyy', { locale: currentLocale });
    detailRows.push(new TableRow({
      children: [
        new TableCell({ shading, children: [new Paragraph(formattedDate)], verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading, children: [new Paragraph(ensureNonEmpty(rec.displayName))], verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading, children: [new Paragraph(formatTimeOnly(rec.checkInTime))], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading, children: [new Paragraph(formatTimeOnly(rec.checkOutTime))], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
        new TableCell({ shading, children: [new Paragraph(ensureNonEmpty(rec.status))], alignment: AlignmentType.CENTER, verticalAlign: VerticalAlign.CENTER }),
      ]
    }));
  });
  
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: detailRows,
    columnWidths: [30, 30, 10, 10, 20]
  }));

  const doc = new Document({
    creator: "Msarch App",
    title: `${dict.reportTitle} - ${monthName} ${year}`,
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Msarch App - Laporan Absensi Bulanan", italics: true, color: "7F8C8D" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Halaman "), PageNumber.CURRENT, new TextRun(" dari "), PageNumber.TOTAL_PAGES] })] }) },
      children: children,
    }]
  });

  return Packer.toBuffer(doc);
}
