// src/lib/report-generator.ts
'use server'; // Mark as server-only if all its usages are server-side (like via API routes)

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
// Import pdfmake itself
import PdfPrinter from 'pdfmake';

// --- Helper Functions ---

function formatDateOnly(timestamp: string): string {
    if (!timestamp) return "N/A";
    try {
        return format(parseISO(timestamp), 'PP'); // e.g., Sep 29, 2023
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

// --- Report Generation Functions ---

export async function generateExcelReport(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[]
): Promise<string> {
    const allProjects = [...inProgress, ...completed, ...canceled ]; 
    allProjects.sort((a, b) => {
        const statusOrder = (status: string) => {
            if (inProgress.some(p => p.id === a.id && (status === 'Completed' || status === 'Canceled'))) return 0; 
            if (status === 'In Progress') return 0;
            if (status === 'Completed') return 1;
            if (status === 'Canceled') return 2;
            return 3; 
        };
        const orderA = statusOrder(a.status);
        const orderB = statusOrder(b.status);
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); 
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

// Define fonts for pdfmake
// Correctly load vfs_fonts.js for server-side usage.
const pdfMakeVfs = require('pdfmake/build/vfs_fonts.js').pdfMake.vfs;

const fonts: TFontDictionary = {
  Roboto: {
    normal: Buffer.from(pdfMakeVfs['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(pdfMakeVfs['Roboto-Medium.ttf'], 'base64'),
    italics: Buffer.from(pdfMakeVfs['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(pdfMakeVfs['Roboto-MediumItalic.ttf'], 'base64'),
  }
};


export async function generatePdfReport(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[],
    monthName: string,
    year: string
): Promise<Uint8Array> {
    const printer = new PdfPrinter(fonts);

    const tableBody = (projects: Project[]) => {
        const body = [
            [
                { text: 'Project Title', style: 'tableHeader' },
                { text: 'Status', style: 'tableHeader' },
                { text: 'Last Activity / End Date', style: 'tableHeader' },
                { text: 'Contributors', style: 'tableHeader' },
                { text: 'Progress (%)', style: 'tableHeader', alignment: 'right' },
                { text: 'Created By', style: 'tableHeader' },
                { text: 'Created At', style: 'tableHeader' },
            ]
        ];

        projects.forEach(project => {
            let displayStatus = project.status;
            if (inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                displayStatus = 'In Progress';
            }
            body.push([
                project.title,
                displayStatus,
                getLastActivityDate(project),
                getContributors(project),
                { text: project.progress.toString(), alignment: 'right' },
                project.createdBy,
                formatDateOnly(project.createdAt),
            ]);
        });
        return body;
    };
    
    const allProjectsForPdf = [...inProgress, ...completed, ...canceled];
     allProjectsForPdf.sort((a, b) => {
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
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });


    const docDefinition: TDocumentDefinitions = {
        content: [
            { text: `Monthly Project Report - ${monthName} ${year}`, style: 'header' },
            { text: `Generated on: ${format(new Date(), 'PPpp')}`, style: 'subheader' },
            {
                text: [
                    { text: 'Summary:\n', style: 'sectionHeader'},
                    `Total Projects Reviewed: ${completed.length + canceled.length + inProgress.length}\n`,
                    `  - In Progress: ${inProgress.length}\n`,
                    `  - Completed: ${completed.length}\n`,
                    `  - Canceled: ${canceled.length}\n`,
                ],
                margin: [0, 0, 0, 20] 
            },
        ],
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 20] as [number, number, number, number],
            },
            subheader: {
                fontSize: 10,
                italics: true,
                alignment: 'center',
                margin: [0, 0, 0, 10] as [number, number, number, number],
            },
            sectionHeader: {
                fontSize: 14,
                bold: true,
                margin: [0, 10, 0, 5] as [number, number, number, number], 
            },
            tableHeader: {
                bold: true,
                fontSize: 10,
                fillColor: '#eeeeee',
                alignment: 'left'
            },
            tableExample: {
                 margin: [0, 5, 0, 15] as [number, number, number, number], 
                 fontSize: 9
            }
        },
        defaultStyle: {
            font: 'Roboto', 
            fontSize: 10,
        }
    };

    if (allProjectsForPdf.length > 0) {
        docDefinition.content.push({ text: 'All Projects Overview:', style: 'sectionHeader' });
        docDefinition.content.push({
            style: 'tableExample',
            table: {
                headerRows: 1,
                 widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'], 
                body: tableBody(allProjectsForPdf),
            },
            layout: {
                fillColor: function (rowIndex: number) {
                    return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
                },
                hLineWidth: function (i: number, node: any) { // node type can be more specific if needed
                    return (i === 0 || i === node.table.body.length) ? 1 : 1;
                },
                vLineWidth: function (i: number, node: any) { // node type
                    return (i === 0 || i === node.table.widths.length) ? 1 : 1;
                },
                hLineColor: function (i: number, node: any) { // node type
                    return (i === 0 || i === node.table.body.length) ? '#cccccc' : '#dddddd';
                },
                vLineColor: function (i: number, node: any) { // node type
                     return (i === 0 || i === node.table.widths.length) ? '#cccccc' : '#dddddd';
                },
            }
        });
    } else {
         docDefinition.content.push({ text: 'No project activity recorded for this month.', style: 'sectionHeader', alignment: 'center' });
    }

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    const chunks: Buffer[] = [];
    return new Promise<Uint8Array>((resolve, reject) => {
        pdfDoc.on('data', chunk => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', err => reject(err));
        pdfDoc.end();
    });
}
