// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import type { TDocumentDefinitions, Content, StyleDictionary } from 'pdfmake/interfaces';


// --- Helper Functions (can be used by both Excel and PDF generation) ---

function formatDateOnly(timestamp: string): string {
    if (!timestamp) return "N/A";
    try {
        // Use a specific locale for consistency or get from user's settings if available
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
    // Sort projects: In Progress, then Completed, then Canceled. Within each, sort by last activity descending.
    allProjects.sort((a, b) => {
        const statusOrder = (status: string) => {
            // Ensure "In Progress" covers projects that are technically completed/canceled but still part of current month's active scope
            if (inProgress.some(p => p.id === a.id && (status === 'Completed' || status === 'Canceled'))) return 0; // For projects that finished this month but were "in progress"
            if (status === 'In Progress') return 0;
            if (status === 'Completed') return 1;
            if (status === 'Canceled') return 2;
            return 3; // Other statuses if any
        };

        const orderA = statusOrder(a.status);
        const orderB = statusOrder(b.status);

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        // If statuses are the same, sort by last activity date (most recent first)
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
        // Correctly identify projects that were "in progress" during the month but might have finished
        if (inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
            displayStatus = 'In Progress'; // Show as 'In Progress' for the report's context if it was active
        }

        const row = [
            escapeCsvValue(project.title),
            escapeCsvValue(displayStatus), // Use the contextual display status
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

// Helper function to create the PDF document definition
// This can be called by the API route.
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
                { text: 'Progress (%)', style: 'tableHeader', alignment: 'right' as const },
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
                { text: project.progress.toString(), alignment: 'right' as const, style: 'tableCell' },
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
                currentStatus = 'In Progress'; // Treat as "In Progress" if it was active this month
            }
            if (currentStatus === 'In Progress') return 0;
            if (currentStatus === 'Completed') return 1;
            if (currentStatus === 'Canceled') return 2;
            return 3; // Should not happen with current statuses
        };
        const orderA = statusOrderValue(a, inProgress);
        const orderB = statusOrderValue(b, inProgress);

        if (orderA !== orderB) return orderA - orderB;

        // If statuses are the same, sort by last activity date (most recent first)
        const dateA = new Date(getLastActivityDate(a) === "Invalid Date" || getLastActivityDate(a) === "N/A" ? 0 : getLastActivityDate(a)).getTime();
        const dateB = new Date(getLastActivityDate(b) === "Invalid Date" || getLastActivityDate(b) === "N/A" ? 0 : getLastActivityDate(b)).getTime();
        return dateB - dateA;
    });


    const docDefinition: TDocumentDefinitions = {
        header: (currentPage, pageCount, pageSize) => {
            return {
                columns: [
                     { text: 'Msarch App', style: 'documentHeader', alignment: 'left', margin: [40, 25, 0, 0] },
                     { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', margin: [0, 25, 40, 0], style: 'pageNumber' }
                ],
            };
        },
        footer: (currentPage, pageCount) => {
            return {
                columns: [
                    { text: `Generated on: ${format(new Date(), 'PPpp')}`, alignment: 'left', style: 'pageFooter', margin: [40, 10, 0, 0] },
                    { text: `Monthly Report - ${monthName} ${year}`, alignment: 'right', style: 'pageFooter', margin: [0, 10, 40, 0] }
                ]
            };
        },
        content: [
            { text: `Monthly Project Report`, style: 'reportTitle' },
            { text: `${monthName} ${year}`, style: 'reportSubtitle' },
            {
                canvas: [ { type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: 'hsl(var(--border))' } ], // Use theme color
                margin: [0, 10, 0, 10]
            },
            {
                text: [
                    { text: 'Summary\n', style: 'sectionHeader'},
                    {text: `Total Projects Reviewed: `, bold: true}, `${completed.length + canceled.length + inProgress.length}\n`,
                    {text: `  • In Progress: `, bold: true}, `${inProgress.length}\n`,
                    {text: `  • Completed: `, bold: true}, `${completed.length}\n`,
                    {text: `  • Canceled: `, bold: true}, `${canceled.length}\n`,
                ],
                margin: [0, 0, 0, 20], style: 'summaryText'
            },
        ],
        styles: {
            reportTitle: {
                fontSize: 24,
                bold: true,
                alignment: 'center',
                margin: [0, 20, 0, 5],
                color: 'hsl(var(--primary))' // Theme primary color
            },
            reportSubtitle: {
                fontSize: 18,
                italics: true,
                alignment: 'center',
                margin: [0, 0, 0, 15],
                color: 'hsl(var(--muted-foreground))' // Theme muted foreground
            },
            sectionHeader: {
                fontSize: 16,
                bold: true,
                margin: [0, 15, 0, 10],
                color: 'hsl(var(--primary))'
            },
            summaryText: {
                fontSize: 11,
                lineHeight: 1.4,
                color: 'hsl(var(--foreground))' // Theme foreground
            },
            tableHeader: {
                bold: true,
                fontSize: 10,
                fillColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                alignment: 'left',
                margin: [0, 5, 0, 5] as [number, number, number, number],
            },
            tableCell: {
                fontSize: 9,
                margin: [0, 4, 0, 4] as [number, number, number, number],
                color: 'hsl(var(--foreground))'
            },
            tableExample: {
                 margin: [0, 5, 0, 15] as [number, number, number, number],
            },
            documentHeader: {
                fontSize: 12,
                bold: true,
                color: 'hsl(var(--primary))'
            },
            pageNumber: {
                fontSize: 9,
                color: 'hsl(var(--muted-foreground))'
            },
            pageFooter: {
                 fontSize: 9,
                 color: 'hsl(var(--muted-foreground))'
            }
        } as StyleDictionary,
        defaultStyle: {
            fontSize: 10,
            color: 'hsl(var(--foreground))', // Default text color from theme
            font: 'Roboto'
        },
        pageMargins: [40, 80, 40, 60]
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
            layout: { // More sophisticated layout
                fillColor: (rowIndex: number | undefined, node: any, columnIndex: number | undefined) => {
                    if (rowIndex === undefined) return null;
                    if (rowIndex === 0) return 'hsl(var(--primary))'; // Header row uses primary color
                    return (rowIndex % 2 === 0) ? 'hsl(var(--secondary))' : null; // Alternating rows use secondary color
                },
                hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
                vLineWidth: (i: number, node: any) => 0, // No vertical lines
                hLineColor: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 'hsl(var(--border))' : 'hsl(var(--border))',
                paddingTop: (i: number, node: any) => (i === 0) ? 8 : 6,
                paddingBottom: (i: number, node: any) => (i === 0) ? 8 : 6,
                paddingLeft: (i: number, node: any) => 8,
                paddingRight: (i: number, node: any) => 8,
            }
        });
    } else {
         docDefinition.content.push({ text: 'No project activity recorded for this month.', style: 'sectionHeader', alignment: 'center' as const, color: 'hsl(var(--muted-foreground))' });
    }
    return docDefinition;
}
