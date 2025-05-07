// src/lib/report-generator.ts
import type { Project, WorkflowHistoryEntry, FileEntry } from '@/services/project-service';
import { format, parseISO } from 'date-fns';

// --- Helper Functions ---

/**
 * Formats an ISO timestamp string into a more readable date format (e.g., "Jan 1, 2024").
 * @param timestamp ISO timestamp string.
 * @returns Formatted date string or "Invalid Date".
 */
function formatDateOnly(timestamp: string): string {
    if (!timestamp) return "N/A";
    try {
        return format(parseISO(timestamp), 'PP'); // e.g., Sep 29, 2023
    } catch (e) {
        console.error("Error formatting date:", timestamp, e);
        return "Invalid Date";
    }
}

/**
 * Extracts the last relevant timestamp from a project's history (completion/cancellation/last update).
 * @param project The project object.
 * @returns Formatted date string or "N/A".
 */
function getLastActivityDate(project: Project): string {
    if (!project.workflowHistory || project.workflowHistory.length === 0) {
        return formatDateOnly(project.createdAt); // Fallback to creation date
    }
    const lastEntry = project.workflowHistory[project.workflowHistory.length - 1];
    return formatDateOnly(lastEntry.timestamp);
}

/**
 * Gets a list of unique contributors (usernames) from project files.
 * @param project The project object.
 * @returns Comma-separated string of usernames or "None".
 */
function getContributors(project: Project): string {
    if (!project.files || project.files.length === 0) {
        return "None";
    }
    const contributors = [...new Set(project.files.map(f => f.uploadedBy))];
    return contributors.join(', ');
}

/**
 * Escapes a string for CSV format (handles commas, quotes, newlines).
 * @param value The string value to escape.
 * @returns The escaped string.
 */
function escapeCsvValue(value: string | number | undefined | null): string {
    if (value === undefined || value === null) {
        return '';
    }
    const strValue = String(value);
    // If the value contains a comma, double quote, or newline, enclose it in double quotes
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        // Escape existing double quotes by doubling them
        const escapedValue = strValue.replace(/"/g, '""');
        return `"${escapedValue}"`;
    }
    return strValue;
}


// --- Report Generation Functions ---

/**
 * Generates a CSV string representing the monthly project report.
 * @param completed Projects completed in the month.
 * @param canceled Projects canceled in the month.
 * @param inProgress Projects in progress during the month.
 * @returns A string in CSV format.
 */
export async function generateExcelReport(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[]
): Promise<string> {
    const allProjects = [...completed, ...canceled, ...inProgress];
    allProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort by creation date desc

    const headers = [
        "Project Title",
        "Status",
        "Last Activity / End Date",
        "Contributors",
        "Progress (%)",
        "Created By",
        "Created At"
    ];
    const rows = [headers.map(escapeCsvValue).join(',')]; // Header row

    allProjects.forEach(project => {
        const status = project.status;
        // Adjust status for report clarity if needed (e.g., show 'In Progress' if active during month but completed later)
        let displayStatus = status;
        if (inProgress.some(p => p.id === project.id) && (status === 'Completed' || status === 'Canceled')) {
            displayStatus = 'In Progress'; // Show as 'In Progress' for the report month
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

/**
 * Generates a simple text-based representation of the monthly report, suitable for a basic PDF.
 * Actual PDF generation requires more complex libraries.
 * @param completed Projects completed in the month.
 * @param canceled Projects canceled in the month.
 * @param inProgress Projects in progress during the month.
 * @param monthName The name of the month (e.g., "August").
 * @param year The year (e.g., "2024").
 * @returns A string representing the report content.
 */
export async function generatePdfReport(
    completed: Project[],
    canceled: Project[],
    inProgress: Project[],
    monthName: string,
    year: string
): Promise<string> {
    let reportContent = `Monthly Project Report - ${monthName} ${year}\n`;
    reportContent += "===========================================\n\n";

    const total = completed.length + canceled.length + inProgress.length;
    reportContent += `Summary:\n`;
    reportContent += `- Total Projects Reviewed: ${total}\n`;
    reportContent += `- Completed: ${completed.length}\n`;
    reportContent += `- Canceled: ${canceled.length}\n`;
    reportContent += `- In Progress: ${inProgress.length}\n\n`;

    const printProjectSection = (title: string, projects: Project[]) => {
        if (projects.length === 0) return;
        reportContent += `${title}:\n`;
        reportContent += "-------------------------------------------\n";
        projects.forEach((project, index) => {
            const status = project.status;
             // Adjust status for report clarity if needed
            let displayStatus = status;
            if (inProgress.some(p => p.id === project.id) && (status === 'Completed' || status === 'Canceled')) {
                 displayStatus = 'In Progress';
            }

            reportContent += ` ${index + 1}. Title: ${project.title}\n`;
            reportContent += `    Status: ${displayStatus}\n`;
            reportContent += `    Last Activity/End Date: ${getLastActivityDate(project)}\n`;
            reportContent += `    Progress: ${project.progress}%\n`;
            reportContent += `    Contributors: ${getContributors(project)}\n`;
            reportContent += `    Created: ${formatDateOnly(project.createdAt)} by ${project.createdBy}\n\n`;
        });
    };

    printProjectSection("In Progress Projects", inProgress);
    printProjectSection("Completed Projects", completed);
    printProjectSection("Canceled Projects", canceled);

    if (total === 0) {
        reportContent += "No project activity recorded for this month.\n";
    }

    return reportContent;
}