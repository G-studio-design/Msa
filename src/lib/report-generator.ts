// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';

// Helper to format date, assuming language context isn't easily available here
// For a real app, you might pass language or use a shared utility
const formatDateForReport = (timestamp: string): string => {
    try {
        return new Date(timestamp).toLocaleDateString('en-US', { // Default to en-US for server-side generation consistency
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch (e) {
        return "Invalid Date";
    }
};

// Helper to get unique contributors
const getContributorsString = (project: Project): string => {
    if (!project.files || project.files.length === 0) return "N/A";
    return [...new Set(project.files.map(f => f.uploadedBy))].join(', ');
};


/**
 * Generates an Excel report (CSV format) from the provided project data.
 *
 * @param completedProjects Array of completed projects.
 * @param canceledProjects Array of canceled projects.
 * @param inProgressProjects Array of in-progress projects.
 * @returns A promise that resolves to a string containing the CSV data.
 */
export async function generateExcelReport(
  completedProjects: Project[],
  canceledProjects: Project[],
  inProgressProjects: Project[]
): Promise<string> {
  console.log(`Generating CSV data for Excel report.`);
  let csvContent = "Project Title,Status,Last Activity / End Date,Contributors\n";

  const addProjectToCsv = (project: Project, statusOverride?: string) => {
    const title = `"${project.title.replace(/"/g, '""')}"`; // Escape double quotes
    const status = statusOverride || project.status;
    const lastActivityDate = formatDateForReport(project.workflowHistory[project.workflowHistory.length-1]?.timestamp || project.createdAt);
    const contributors = `"${getContributorsString(project).replace(/"/g, '""')}"`;
    csvContent += `${title},${status},${lastActivityDate},${contributors}\n`;
  };

  csvContent += "# Completed Projects\n";
  completedProjects.forEach(p => addProjectToCsv(p));

  csvContent += "\n# Canceled Projects\n";
  canceledProjects.forEach(p => addProjectToCsv(p));

  csvContent += "\n# In Progress Projects\n";
  // For "In Progress" projects in the report, their actual status might be "Completed" or "Canceled" (meaning they were completed/canceled *after* the reporting month).
  // We should reflect their status *at the end of the reporting month* as "In Progress".
  inProgressProjects.forEach(p => addProjectToCsv(p, "In Progress"));


  console.log(`CSV data generation complete.`);
  return csvContent;
}

/**
 * Generates a PDF report (plain text format) from the provided project data.
 *
 * @param completedProjects Array of completed projects.
 * @param canceledProjects Array of canceled projects.
 * @param inProgressProjects Array of in-progress projects.
 * @param monthName The name of the month for the report.
 * @param year The year of the report.
 * @returns A promise that resolves to a string containing the plain text report data.
 */
export async function generatePdfReport(
  completedProjects: Project[],
  canceledProjects: Project[],
  inProgressProjects: Project[],
  monthName: string,
  year: string
): Promise<string> {
  console.log(`Generating plain text data for PDF report.`);
  let textContent = `Monthly Project Report: ${monthName} ${year}\n`;
  textContent += "====================================================\n\n";

  textContent += `Total Projects Reviewed: ${completedProjects.length + canceledProjects.length + inProgressProjects.length}\n`;
  textContent += `  - Completed this month: ${completedProjects.length}\n`;
  textContent += `  - Canceled this month: ${canceledProjects.length}\n`;
  textContent += `  - In Progress during month: ${inProgressProjects.length}\n\n`;


  const addProjectToText = (project: Project, sectionTitle: string, statusOverride?: string) => {
    textContent += `  Project Title: ${project.title}\n`;
    textContent += `    Status: ${statusOverride || project.status}\n`;
    const lastActivityDate = formatDateForReport(project.workflowHistory[project.workflowHistory.length-1]?.timestamp || project.createdAt);
    textContent += `    Last Activity / End Date: ${lastActivityDate}\n`;
    textContent += `    Contributors: ${getContributorsString(project)}\n\n`;
  };

  textContent += "--- COMPLETED PROJECTS THIS MONTH ---\n";
  if (completedProjects.length > 0) {
    completedProjects.forEach(p => addProjectToText(p, "Completed"));
  } else {
    textContent += "(None)\n\n";
  }


  textContent += "--- CANCELED PROJECTS THIS MONTH ---\n";
  if (canceledProjects.length > 0) {
    canceledProjects.forEach(p => addProjectToText(p, "Canceled"));
  } else {
    textContent += "(None)\n\n";
  }

  textContent += "--- PROJECTS IN PROGRESS DURING THIS MONTH ---\n";
  if (inProgressProjects.length > 0) {
     // As in Excel, reflect their status at the end of the reporting month as "In Progress".
    inProgressProjects.forEach(p => addProjectToText(p, "In Progress", "In Progress"));
  } else {
    textContent += "(None)\n\n";
  }

  console.log(`Plain text data generation for PDF complete.`);
  return textContent;
}
