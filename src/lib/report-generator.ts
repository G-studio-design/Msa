// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, VerticalAlign, AlignmentType, HeadingLevel } from 'docx';

// --- Helper Functions (can be used by both Excel and Word generation) ---

function formatDateOnly(timestamp: string): string {
    if (!timestamp) return "N/A";
    try {
        return format(parseISO(timestamp), 'PP', { }); // e.g., Sep 29, 2023
    } catch (e) {
        console.error("Error formatting date:", timestamp, e);
        return "Invalid Date";
    }
}

function getLastActivityDate(project: Project): string {
    if (!project.workflowHistory || project.workflowHistory.length === 0) {
        return formatDateOnly(project.createdAt);
    }
    const lastEntry = project.workflowHistory[project.workflowHistory.length - 1];
    return formatDateOnly(lastEntry.timestamp);
}

function getContributors(project: Project): string {
    if (!project.files || project.files.length === 0) {
        return "None";
    }
    const contributors = [...new Set(project.files.map(f => f.uploadedBy))];
    return contributors.join(', ');
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
    inProgress: Project[]
): Promise<string> {
    const allProjects = [...inProgress, ...completed, ...canceled ];
    allProjects.sort((a, b) => {
        const statusOrder = (status: string) => {
            if (inProgress.some(p => p.id === a.id && (status === 'Completed' || status === 'Canceled'))) return 0; // If it's in the 'inProgress' list but also marked completed/canceled, treat as inProgress for sorting
            if (status === 'In Progress') return 0;
            if (status === 'Completed') return 1;
            if (status === 'Canceled') return 2;
            return 3;
        };

        const orderA = statusOrder(a.status);
        const orderB = statusOrder(b.status);

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        const dateA = new Date(getLastActivityDate(a) === "Invalid Date" || getLastActivityDate(a) === "N/A" ? 0 : getLastActivityDate(a)).getTime();
        const dateB = new Date(getLastActivityDate(b) === "Invalid Date" || getLastActivityDate(b) === "N/A" ? 0 : getLastActivityDate(b)).getTime();
        return dateB - dateA;
    });

    const headers = [
        "Project Title",
        "Status",
        "Last Activity / End Date",
        "Contributors",
        "Progress (%)",
        "Created By",
        "Created At"
    ];
    const rows = [headers.map(escapeCsvValue).join(',')];

    allProjects.forEach(project => {
        let displayStatus = project.status;
        // If a project is in the inProgress list but its status is Completed/Canceled, show it as In Progress for this report's context
        if (inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
            displayStatus = 'In Progress';
        }

        const row = [
            escapeCsvValue(project.title),
            escapeCsvValue(displayStatus),
            escapeCsvValue(getLastActivityDate(project)),
            escapeCsvValue(getContributors(project)),
            escapeCsvValue(project.progress),
            escapeCsvValue(project.createdBy),
            escapeCsvValue(formatDateOnly(project.createdAt)),
        ];
        rows.push(row.join(','));
    });

    return rows.join('\n');
}

// --- Word Document Generation Function ---
export async function generateWordReport(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[],
    monthName: string,
    year: string,
    chartImageDataUrl?: string
): Promise<Buffer> {
    const allProjectsForWord = [...inProgress, ...completed, ...canceled];
     allProjectsForWord.sort((a, b) => {
        const statusOrderValue = (project: Project, inProgressList: Project[]) => {
            let currentStatus = project.status;
             if (inProgressList.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled'))) {
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
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const sections = [
        {
            properties: {},
            children: [
                new Paragraph({
                    text: `Monthly Project Report - ${monthName} ${year}`,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: `Generated on: ${format(new Date(), 'PPpp')}`,
                    style: "Subheader",
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: "Summary:",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({ text: `Total Projects Reviewed: ${completed.length + canceled.length + inProgress.length}` }),
                new Paragraph({ text: `  - In Progress: ${inProgress.length}` }),
                new Paragraph({ text: `  - Completed: ${completed.length}` }),
                new Paragraph({ text: `  - Canceled: ${canceled.length}` }),
                new Paragraph({ text: "" }), // Spacer
            ],
        },
    ];

    if (chartImageDataUrl) {
        // Assuming chartImageDataUrl is a base64 encoded PNG
        const imageBuffer = Buffer.from(chartImageDataUrl.split(',')[1], 'base64');
        sections[0].children.push(
            new Paragraph({
                text: "Project Status Overview:",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        children: [imageBuffer],
                        type: "image",
                        options: {
                            data: imageBuffer,
                            transformation: {
                                width: 500, // Adjust as needed
                                height: 250, // Adjust as needed
                            },
                        },
                    }),
                ],
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }) // Spacer
        );
    }


    if (allProjectsForWord.length > 0) {
        sections[0].children.push(
            new Paragraph({
                text: "All Projects Detailed List:",
                heading: HeadingLevel.HEADING_1,
            })
        );

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "Project Title", style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: "Status", style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: "Last Activity / End Date", style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: "Contributors", style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: "Progress (%)", style: "TableHeader", alignment: AlignmentType.RIGHT })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: "Created By", style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: "Created At", style: "TableHeader" })], verticalAlign: VerticalAlign.CENTER }),
            ],
            tableHeader: true,
        });

        const dataRows = allProjectsForWord.map((project, index) => {
            let displayStatus = project.status;
            if (inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                displayStatus = 'In Progress';
            }
            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(project.title)] }),
                    new TableCell({ children: [new Paragraph(displayStatus)] }),
                    new TableCell({ children: [new Paragraph(getLastActivityDate(project))] }),
                    new TableCell({ children: [new Paragraph(getContributors(project))] }),
                    new TableCell({ children: [new Paragraph({ text: project.progress.toString(), alignment: AlignmentType.RIGHT })] }),
                    new TableCell({ children: [new Paragraph(project.createdBy)] }),
                    new TableCell({ children: [new Paragraph(formatDateOnly(project.createdAt))] }),
                ],
                // Simple alternating row color (optional, as Word handles this differently)
                // cantrips: {
                //     background: index % 2 === 0 ? "F9F9F9" : undefined,
                // },
            });
        });

        const table = new Table({
            rows: [headerRow, ...dataRows],
            width: {
                size: 100,
                type: WidthType.PERCENTAGE,
            },
            columnWidths: [3000, 1500, 1500, 1500, 1000, 1000, 1000], // Example widths, adjust as needed
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
            },
        });
        sections[0].children.push(table);

    } else {
        sections[0].children.push(
            new Paragraph({ text: "No project activity recorded for this month.", alignment: AlignmentType.CENTER })
        );
    }

    const doc = new Document({
        sections: sections,
        styles: {
            paragraphStyles: [
                {
                    id: "Subheader",
                    name: "Subheader",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        size: 20, // 10pt
                        italics: true,
                        color: "555555",
                    },
                    paragraph: {
                        spacing: { after: 200 }, // 10pt spacing after
                    },
                },
                {
                    id: "TableHeader",
                    name: "Table Header",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        bold: true,
                        size: 20, // 10pt
                        color: "FFFFFF",
                    },
                    paragraph: {
                        alignment: AlignmentType.LEFT,
                        spacing: { before: 80, after: 80 }, // 4pt spacing
                    },
                },
            ],
            default: {
                heading1: {
                    run: {
                        size: 28, // 14pt
                        bold: true,
                        color: "2E74B5", // Dark Blue
                    },
                    paragraph: {
                        spacing: { after: 240, before: 300 }, // 12pt after, 15pt before
                    },
                },
                 title: { // Corrected from headingTitle to title
                    run: {
                        size: 36, // 18pt
                        bold: true,
                        color: "1F4E79", // Darker Blue
                    },
                    paragraph: {
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }, // 20pt spacing after
                    },
                },
            }
        },
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
}
