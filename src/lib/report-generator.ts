// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';
import type { TDocumentDefinitions, Content, StyleDictionary } from 'pdfmake/interfaces';

// --- Helper Functions (can be used by both Excel and PDF generation) ---

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

// --- PDF Document Definition Creation Function ---
export async function createPdfDocDefinition(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[],
    monthName: string,
    year: string
    // chartImageDataUrl?: string; // Temporarily removed for simplification
): Promise<TDocumentDefinitions> {
     const tableBody = (projects: Project[]) => {
        const body: Content[][] = [
            [
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
                project.title,
                displayStatus,
                getLastActivityDate(project),
                getContributors(project),
                { text: project.progress.toString(), alignment: 'right' as const },
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


    const docDefinitionContent: Content[] = [
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
            margin: [0, 0, 0, 20] as [number, number, number, number],
        },
    ];

    // Chart image inclusion logic is temporarily removed from here.
    // It can be added back once basic PDF generation is confirmed working.
    // if (chartImageDataUrl) {
    //     docDefinitionContent.push({ text: 'Project Completion Overview:', style: 'sectionHeader' });
    //     docDefinitionContent.push({
    //         image: chartImageDataUrl,
    //         width: 500,
    //         alignment: 'center' as const,
    //         margin: [0, 0, 0, 20] as [number, number, number, number],
    //     });
    // }


    if (allProjectsForPdf.length > 0) {
        docDefinitionContent.push({ text: 'All Projects Detailed List:', style: 'sectionHeader' });
        docDefinitionContent.push({
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
                hLineWidth: function (i: number, node: any) { 
                    return (i === 0 || i === node.table.body.length) ? 1 : 1;
                },
                vLineWidth: function (i: number, node: any) { 
                    return (i === 0 || i === node.table.widths.length) ? 1 : 1;
                },
                hLineColor: function (i: number, node: any) { 
                    return (i === 0 || i === node.table.body.length) ? '#cccccc' : '#dddddd';
                },
                vLineColor: function (i: number, node: any) { 
                     return (i === 0 || i === node.table.widths.length) ? '#cccccc' : '#dddddd';
                },
            }
        });
    } else {
         docDefinitionContent.push({ text: 'No project activity recorded for this month.', style: 'sectionHeader', alignment: 'center' as const });
    }

    const styles: StyleDictionary = {
        header: {
            fontSize: 18,
            bold: true,
            alignment: 'center' as const,
            margin: [0, 0, 0, 20] as [number, number, number, number],
            color: 'hsl(var(--primary))' // Using CSS variable for primary color
        },
        subheader: {
            fontSize: 10,
            italics: true,
            alignment: 'center' as const,
            margin: [0, 0, 0, 10] as [number, number, number, number],
            color: '#555555'
        },
        sectionHeader: {
            fontSize: 14,
            bold: true,
            margin: [0, 15, 0, 8] as [number, number, number, number], // Increased top margin
            color: 'hsl(var(--foreground))' // Using CSS variable
        },
        tableHeader: {
            bold: true,
            fontSize: 10,
            fillColor: 'hsl(187, 100%, 42%)', // Teal accent color directly
            color: '#FFFFFF', // White text
            alignment: 'left' as const,
            margin: [0, 4, 0, 4] as [number, number, number, number] 
        },
        tableExample: {
             margin: [0, 5, 0, 15] as [number, number, number, number],
             fontSize: 9,
             color: 'hsl(var(--card-foreground))' // Using CSS variable
        }
    };

    const docDefinition: TDocumentDefinitions = {
        content: docDefinitionContent,
        styles: styles,
        defaultStyle: {
            font: 'Roboto', // This will be defined in the API route with vfs_fonts
            fontSize: 10,
        },
        pageMargins: [40, 60, 40, 60], // [left, top, right, bottom]
        footer: function(currentPage, pageCount) {
            return {
                text: `Page ${currentPage.toString()} of ${pageCount}`,
                alignment: 'center' as const,
                fontSize: 8,
                margin: [0, 20, 0, 0] as [number, number, number, number],
                color: '#aaaaaa'
            };
        },
    };

    return docDefinition;
}

