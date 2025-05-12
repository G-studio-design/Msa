// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';
import { format, parseISO } from 'date-fns';

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
