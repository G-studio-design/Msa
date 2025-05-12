// src/lib/report-generator.ts
'use server'; 

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import type { TDocumentDefinitions, Content, StyleDictionary } from 'pdfmake/interfaces';


// --- Helper Functions (can be used by both Excel and PDF generation) ---

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

// --- Excel Report Generation Function ---

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


export async function createPdfDocDefinition(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[],
    monthName: string,
    year: string
): Promise<TDocumentDefinitions> {
     const tableBody = (projects: Project[]) => {
        const body: Content[][] = [ // Type for table cells
            [ // Header row
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
                { text: project.title, style: 'tableCell' },
                { text: displayStatus, style: 'tableCell' },
                { text: getLastActivityDate(project), style: 'tableCell' },
                { text: getContributors(project), style: 'tableCell' },
                { text: project.progress.toString(), alignment: 'right', style: 'tableCell' },
                { text: project.createdBy, style: 'tableCell' },
                { text: formatDateOnly(project.createdAt), style: 'tableCell' },
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

    // Placeholder for logo - replace with actual base64 encoded image or URL
    // const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAEBSURBVHjaYvz//z8DJQAggJiQ2sDMPDwslC8H4gYgZgDiNgjZAZkDEEAgPgCqk2AxkOwApAZAHA9sBpLNAfkVAH+fzWL9X7M4IKH+KzQv0FYg3YGCQAGYPhJ6gBwLg3D6gA729//9R8GgDkQYwPjL7DAjVv7/L8h0A6iFIPmHAF8k7M7/D8Lp/zAUYTAwJADVqA/VQc0zQPyOa8wYwvzHzDAmA+g9GIAVgcgLMA8gxoAZB8gZkGsGkGkDAYAAYAA2D4xmgYwBc0BMB8hYAKQOAMkeIMsBikEkCYMAAggASacSBjYBqSIAAgwA6L0YSAk2kL8AAAAASUVORK5CYII=";

    const docDefinition: TDocumentDefinitions = {
        // header: (currentPage, pageCount, pageSize) => {
        //     return {
        //         columns: [
        //             { image: logoBase64, width: 50, alignment: 'left', margin: [40, 20, 0, 0] },
        //             { text: 'Msarch App - Monthly Report', style: 'documentHeader', alignment: 'center', margin: [0, 25, 0, 0] },
        //             { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', margin: [0, 20, 40, 0], style: 'pageNumber' }
        //         ]
        //     };
        // },
        footer: (currentPage, pageCount) => {
            return {
                columns: [
                    { text: `Generated on: ${format(new Date(), 'PPpp')}`, alignment: 'left', style: 'pageFooter', margin: [40, 10, 0, 0] },
                    { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', style: 'pageFooter', margin: [0, 10, 40, 0] }
                ]
            };
        },
        content: [
            { text: `Monthly Project Report`, style: 'reportTitle' },
            { text: `${monthName} ${year}`, style: 'reportSubtitle' },
            {
                text: [
                    { text: 'Summary:\n', style: 'sectionHeader'},
                    `Total Projects Reviewed: ${completed.length + canceled.length + inProgress.length}\n`,
                    `  - In Progress: ${inProgress.length}\n`,
                    `  - Completed: ${completed.length}\n`,
                    `  - Canceled: ${canceled.length}\n`,
                ],
                margin: [0, 0, 0, 20], style: 'summaryText'
            },
        ],
        styles: {
            reportTitle: {
                fontSize: 22,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 5], // Top margin adjusted due to header
                color: '#2C5282' // Dark Blue
            },
            reportSubtitle: {
                fontSize: 16,
                italics: true,
                alignment: 'center',
                margin: [0, 0, 0, 20],
                color: '#4A5568' // Medium Gray
            },
            sectionHeader: {
                fontSize: 14,
                bold: true,
                margin: [0, 15, 0, 8],
                color: '#2D3748' // Darker Gray
            },
            summaryText: {
                fontSize: 11,
                lineHeight: 1.4,
            },
            tableHeader: {
                bold: true,
                fontSize: 10,
                fillColor: '#EBF8FF', // Light Blue
                color: '#1A365D', // Darker Blue text for header
                alignment: 'left',
                margin: [0, 5, 0, 5] as [number, number, number, number], // Padding for header cells
            },
            tableCell: {
                fontSize: 9,
                margin: [0, 3, 0, 3] as [number, number, number, number], // Padding for body cells
            },
            tableExample: {
                 margin: [0, 5, 0, 15],
            },
            // documentHeader: {
            //     fontSize: 14,
            //     bold: true,
            //     color: '#2C5282'
            // },
            pageNumber: {
                fontSize: 9,
                color: '#718096' // Light Gray
            },
            pageFooter: {
                 fontSize: 9,
                 color: '#A0AEC0' // Lighter Gray
            }
        } as StyleDictionary, // Cast to StyleDictionary
        defaultStyle: {
            fontSize: 10,
            color: '#4A5568' // Default text color
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
                fillColor: (rowIndex: number | undefined, node: any, columnIndex: number | undefined) => {
                    if (rowIndex === undefined) return null; // Should not happen with headerRows: 1
                    return (rowIndex % 2 === 0) ? '#F7FAFC' : null; // Light Gray for even data rows
                },
                hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1.5 : 1,
                vLineWidth: (i: number, node: any) => (i === 0 || i === node.table.widths.length) ? 1.5 : 1,
                hLineColor: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? '#A0AEC0' : '#E2E8F0', // Gray borders
                vLineColor: (i: number, node: any) => (i === 0 || i === node.table.widths.length) ? '#A0AEC0' : '#E2E8F0',
                paddingTop: (i: number, node: any) => (i === 0) ? 8 : 6, // More padding for header
                paddingBottom: (i: number, node: any) => (i === 0) ? 8 : 6,
                paddingLeft: (i: number, node: any) => 5,
                paddingRight: (i: number, node: any) => 5,
            }
        });
    } else {
         docDefinition.content.push({ text: 'No project activity recorded for this month.', style: 'sectionHeader', alignment: 'center' as const });
    }
    return docDefinition;
}
